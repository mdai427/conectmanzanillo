import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'


const router = express.Router()
const FALLBACK_PLANS = [
  { code:'basic_presence', name:'Impulso Faro', description:'Presencia constante para empresas que quieren generar reconocimiento y contactos.', monthly_price:799, currency:'MXN', requires_quote:false, sort_order:10, features:['Perfil destacado en el directorio','Banner en una sección','Enlace a sitio web o WhatsApp','1 publicación patrocinada al mes','Reporte de impresiones y clics'] },
  { code:'featured_company', name:'Líder Portuario', description:'Cobertura preferente para posicionar la marca y captar oportunidades comerciales.', monthly_price:1999, currency:'MXN', requires_quote:false, sort_order:20, features:['Todo lo incluido en Impulso Faro','Banner en portada y hasta 3 secciones','Prioridad en el directorio','4 publicaciones patrocinadas al mes','Reporte de impresiones, clics y contactos'] },
]

router.get('/planes', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('advertising_plans').select('id, code, name, description, features, monthly_price, currency, requires_quote, sort_order').eq('is_active', true).order('sort_order')
  if (error && /advertising_plans|schema cache|PGRST205/i.test(error.message)) return res.json(FALLBACK_PLANS)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/solicitudes', requireAuth, async (req, res) => {
  const { data: membership } = await supabaseAdmin.from('company_members').select('company_id').eq('user_id', req.user.id).eq('status', 'active').limit(1).maybeSingle()
  if (!membership) return res.status(422).json({ error: 'Completa primero el registro de tu empresa' })
  const { plan_code: planCode, contact_name: contactName, email, phone, message } = req.body
  const { data: plan } = await supabaseAdmin.from('advertising_plans').select('id').eq('code', String(planCode || '')).eq('is_active', true).maybeSingle()
  if (!plan) return res.status(400).json({ error: 'Plan publicitario inválido' })
  const safeEmail = String(email || '').trim().toLowerCase().slice(0, 180)
  const safeContactName = String(contactName || '').trim().slice(0, 120)
  if (safeContactName.length < 2) return res.status(400).json({ error: 'Nombre del responsable requerido' })
  if (!safeEmail.includes('@')) return res.status(400).json({ error: 'Correo inválido' })
  const { data, error } = await supabaseAdmin.from('advertising_leads').insert({ company_id: membership.company_id, plan_id: plan.id, requested_by: req.user.id, contact_name: safeContactName, email: safeEmail, phone: String(phone || '').trim().slice(0, 30) || null, message: String(message || '').trim().slice(0, 1500) || null }).select('id, status, created_at').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// ── GET /api/publicidad?zona=principal ──────────────────────────
// Banners activos y vigentes para una zona (uso público)
const AD_ZONES = new Set(['global', 'principal', 'directorio', 'noticias', 'vacantes', 'empresa'])

router.get('/', async (req, res) => {
  const zona = AD_ZONES.has(req.query.zona) ? req.query.zona : 'global'
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .select(`
      id, titulo, imagen_url, link_url, whatsapp, zona, prioridad,
      empresa_id, impresiones, clics,
      empresa_perfiles(nombre_comercial, slug, logo_url, descripcion, categoria_slug, direccion, es_verificado)
    `)
    .eq('is_active', true)
    .eq('review_status', 'approved')
    .eq('is_demo', false)
    .in('zona', [zona, 'global'])
    .or(`fecha_inicio.is.null,fecha_inicio.lte.${today}`)
    .or(`fecha_fin.is.null,fecha_fin.gte.${today}`)
    .order('prioridad', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[publicidad/public]', error.message)
    return res.status(500).json({ error: 'No fue posible cargar la publicidad.' })
  }

  res.json(data || [])
})

router.post('/:id/impresion', async (req, res) => {
  const { data: campaign } = await supabaseAdmin.from('publicidad_campanas').select('id').eq('id', req.params.id).eq('is_active', true).maybeSingle()
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  await Promise.all([
    supabaseAdmin.from('publicidad_eventos').insert({ campana_id: campaign.id, tipo: 'impresion' }),
    supabaseAdmin.rpc('increment_ad_metric', { p_campaign_id: campaign.id, p_metric: 'impression' }),
  ])
  res.status(202).json({ ok: true })
})

// ── POST /api/publicidad/:id/clic ────────────────────────────────
router.post('/:id/clic', async (req, res) => {
  const { id } = req.params
  const { data: banner } = await supabaseAdmin
    .from('publicidad_campanas').select('clics').eq('id', id).single()

  if (banner) {
    await Promise.all([
      supabaseAdmin.from('publicidad_eventos').insert({ campana_id: id, tipo: 'clic' }),
      supabaseAdmin.rpc('increment_ad_metric', { p_campaign_id: id, p_metric: 'click' }),
    ])
  }
  res.json({ ok: true })
})

// ── Admin: GET todas las campañas ────────────────────────────────
router.get('/admin/all', requireAuth, requirePermission('ad.approve'), async (req, res) => {
  const { zona, activas } = req.query

  let query = supabaseAdmin
    .from('publicidad_campanas')
    .select(`
      *, empresa_perfiles(nombre_comercial, logo_url)
    `)
    .order('created_at', { ascending: false })

  if (zona) query = query.eq('zona', zona)
  if (activas === 'true') query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Campos permitidos para crear/editar campañas (evita mass assignment)
const AD_CAMPAIGN_FIELDS = [
  'titulo', 'imagen_url', 'link_url', 'whatsapp', 'zona', 'prioridad',
  'empresa_id', 'fecha_inicio', 'fecha_fin', 'is_active', 'review_status', 'is_demo',
]

function pickAdFields(body) {
  const payload = {}
  for (const key of AD_CAMPAIGN_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key]
  }
  return payload
}

// ── Admin: crear campaña ─────────────────────────────────────────
router.post('/admin', requireAuth, requirePermission('ad.approve'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .insert(pickAdFields(req.body))
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: editar campaña ────────────────────────────────────────
router.patch('/admin/:id', requireAuth, requirePermission('ad.approve'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .update(pickAdFields(req.body))
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: eliminar campaña ──────────────────────────────────────
router.delete('/admin/:id', requireAuth, requirePermission('ad.approve'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('publicidad_campanas')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Admin: estadísticas generales de publicidad ──────────────────
router.get('/admin/stats', requireAuth, requirePermission('ad.approve'), async (req, res) => {
  const [activasRes, topRes, allRes] = await Promise.all([
    supabaseAdmin.from('publicidad_campanas')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabaseAdmin.from('publicidad_campanas')
      .select('id, titulo, impresiones, clics, zona')
      .order('impresiones', { ascending: false })
      .limit(5),
    supabaseAdmin.from('publicidad_campanas')
      .select('impresiones, clics'),
  ])

  const totales = (allRes.data || []).reduce((acc, c) => ({
    impresiones: acc.impresiones + (c.impresiones || 0),
    clics: acc.clics + (c.clics || 0),
  }), { impresiones: 0, clics: 0 })

  res.json({
    campanas_activas: activasRes.count || 0,
    top_campanas: topRes.data || [],
    totales,
  })
})

export default router
