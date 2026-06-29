import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'


const router = express.Router()

// ── GET /api/publicidad?zona=principal ──────────────────────────
// Banners activos y vigentes para una zona (uso público)
router.get('/', async (req, res) => {
  const { zona = 'global' } = req.query

  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .select(`
      id, titulo, imagen_url, link_url, whatsapp, zona, prioridad,
      empresa_id, impresiones, clics
    `)
    .eq('is_active', true)
    .or(`zona.eq.${zona},zona.eq.global`)
    .or(`fecha_inicio.is.null,fecha_inicio.lte.${new Date().toISOString().slice(0,10)}`)
    .or(`fecha_fin.is.null,fecha_fin.gte.${new Date().toISOString().slice(0,10)}`)
    .order('prioridad', { ascending: false })
    .limit(10)

  if (error) return res.status(500).json({ error: error.message })

  // Registrar impresiones (async)
  if (data?.length) {
    const inserts = data.map(b => ({ campana_id: b.id, tipo: 'impresion' }))
    supabaseAdmin.from('publicidad_eventos').insert(inserts).then(() => {})
    // Increment counters
    for (const b of data) {
      supabaseAdmin.from('publicidad_campanas')
        .update({ impresiones: (b.impresiones || 0) + 1 })
        .eq('id', b.id).then(() => {})
    }
  }

  res.json(data || [])
})

// ── POST /api/publicidad/:id/clic ────────────────────────────────
router.post('/:id/clic', async (req, res) => {
  const { id } = req.params
  const { data: banner } = await supabaseAdmin
    .from('publicidad_campanas').select('clics').eq('id', id).single()

  if (banner) {
    await Promise.all([
      supabaseAdmin.from('publicidad_eventos').insert({ campana_id: id, tipo: 'clic' }),
      supabaseAdmin.from('publicidad_campanas')
        .update({ clics: (banner.clics || 0) + 1 }).eq('id', id),
    ])
  }
  res.json({ ok: true })
})

// ── Admin: GET todas las campañas ────────────────────────────────
router.get('/admin/all', requireAuth, requireRole('admin'), async (req, res) => {
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

// ── Admin: crear campaña ─────────────────────────────────────────
router.post('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .insert(req.body)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: editar campaña ────────────────────────────────────────
router.patch('/admin/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('publicidad_campanas')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// ── Admin: eliminar campaña ──────────────────────────────────────
router.delete('/admin/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('publicidad_campanas')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Admin: estadísticas generales de publicidad ──────────────────
router.get('/admin/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const [activasRes, totalRes, topRes] = await Promise.all([
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

  const totales = (topRes.data || []).reduce((acc, c) => ({
    impresiones: acc.impresiones + (c.impresiones || 0),
    clics: acc.clics + (c.clics || 0),
  }), { impresiones: 0, clics: 0 })

  res.json({
    campanas_activas: activasRes.count || 0,
    top_campanas: totalRes.data || [],
    totales,
  })
})

export default router
