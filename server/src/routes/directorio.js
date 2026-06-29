import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'


const router = express.Router()

// ── GET /api/directorio/categorias ───────────────────────────────
router.get('/categorias', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('directorio_categorias')
    .select('*')
    .order('orden')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── GET /api/directorio ──────────────────────────────────────────
// ?categoria=transportistas&q=nombre&page=1&limit=20&tier=premium
router.get('/', async (req, res) => {
  const { categoria, q, page = 1, limit = 24, tier } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = supabaseAdmin
    .from('empresa_perfiles')
    .select(`
      id, slug, nombre_comercial, descripcion, logo_url, portada_url,
      categoria_slug, categorias, especialidades, servicios,
      whatsapp, telefono, email, sitio_web, direccion,
      es_premium, es_destacado, es_verificado,
      visitas_total, clics_whatsapp,
      created_at
    `, { count: 'exact' })
    .eq('is_active', true)

  if (categoria && categoria !== 'todas') query = query.eq('categoria_slug', categoria)
  if (q) query = query.ilike('nombre_comercial', `%${q}%`)
  if (tier === 'premium')   query = query.eq('es_premium', true)
  if (tier === 'destacado') query = query.eq('es_destacado', true)
  if (tier === 'verificado') query = query.eq('es_verificado', true)

  // Ordenar: premium primero, luego destacados, luego el resto
  query = query
    .order('es_premium',   { ascending: false })
    .order('es_destacado', { ascending: false })
    .order('es_verificado',{ ascending: false })
    .order('created_at',   { ascending: false })
    .range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: count, page: parseInt(page), limit: parseInt(limit) })
})

// ── GET /api/directorio/:slug ────────────────────────────────────
router.get('/:slug', async (req, res) => {
  const { slug } = req.params

  const { data, error } = await supabaseAdmin
    .from('empresa_perfiles')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Empresa no encontrada' })

  // Registrar visita (async, sin esperar)
  supabaseAdmin.from('empresa_analytics')
    .insert({ empresa_id: data.id, evento: 'visita' })
    .then(() => {})

  // Incrementar counter
  supabaseAdmin.from('empresa_perfiles')
    .update({ visitas_total: (data.visitas_total || 0) + 1 })
    .eq('id', data.id)
    .then(() => {})

  // Vacantes activas de esta empresa
  const { data: vacantes } = await supabaseAdmin
    .from('vacantes')
    .select('id, titulo, tipo_contrato, salario_min, salario_max, created_at')
    .eq('empresa_perfil_id', data.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5)

  res.json({ ...data, vacantes: vacantes || [] })
})

// ── POST /api/directorio/:id/evento ─────────────────────────────
// Registrar clic a whatsapp o web
router.post('/:id/evento', async (req, res) => {
  const { id } = req.params
  const { tipo } = req.body // 'clic_whatsapp' | 'clic_web' | 'consulta'

  if (!['clic_whatsapp', 'clic_web', 'consulta'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido' })
  }

  await supabaseAdmin.from('empresa_analytics').insert({ empresa_id: id, evento: tipo })

  // Update counter
  const campo = tipo === 'clic_whatsapp' ? 'clics_whatsapp'
              : tipo === 'clic_web'      ? 'clics_web'
              : 'consultas_total'

  const { data: emp } = await supabaseAdmin
    .from('empresa_perfiles').select(campo).eq('id', id).single()
  if (emp) {
    await supabaseAdmin.from('empresa_perfiles')
      .update({ [campo]: (emp[campo] || 0) + 1 }).eq('id', id)
  }

  res.json({ ok: true })
})

// ── Admin: crear empresa ─────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const body = req.body

  // Auto-generar slug
  if (!body.slug && body.nombre_comercial) {
    body.slug = body.nombre_comercial
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const { data, error } = await supabaseAdmin
    .from('empresa_perfiles')
    .insert(body)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: actualizar empresa ────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabaseAdmin
    .from('empresa_perfiles')
    .update(req.body)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: eliminar (desactivar) empresa ─────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('empresa_perfiles')
    .update({ is_active: false })
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Admin: estadísticas de una empresa ──────────────────────────
router.get('/:id/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params

  const [perfilRes, analyticsRes, vacantesRes] = await Promise.all([
    supabaseAdmin.from('empresa_perfiles')
      .select('visitas_total, clics_whatsapp, clics_web, consultas_total')
      .eq('id', id).single(),
    supabaseAdmin.from('empresa_analytics')
      .select('evento, created_at')
      .eq('empresa_id', id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabaseAdmin.from('vacantes')
      .select('id', { count: 'exact' })
      .eq('empresa_perfil_id', id)
      .eq('is_active', true),
  ])

  res.json({
    totales: perfilRes.data || {},
    eventos_30d: analyticsRes.data || [],
    vacantes_activas: vacantesRes.count || 0,
  })
})

export default router
