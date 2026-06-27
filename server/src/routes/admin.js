import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.use(requireRole('admin'))

// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
  try {
    const [
      { count: users },
      { count: reports },
      { count: reactions },
      { count: warnings },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vote_reactions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_warnings').select('*', { count: 'exact', head: true }),
    ])

    const { count: active_reports } = await supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    res.json({ users, reports, reactions, active_reports, warnings })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query
    let q = supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, role, reputation, puntos, total_reportes, is_banned, warning_count, tipo_usuario, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (search) q = q.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)

    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body
  const VALID_ROLES = ['operator_free', 'operator_premium', 'company', 'moderador', 'admin']

  if (!role || !VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Rol inválido' })

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles').update({ role }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/warn — enviar warning
router.post('/users/:id/warn', async (req, res) => {
  const { motivo, tipo = 'publicacion_falsa' } = req.body
  if (!motivo) return res.status(400).json({ error: 'El motivo es requerido' })

  try {
    // Insertar warning
    const { error: wErr } = await supabaseAdmin
      .from('user_warnings')
      .insert({ user_id: req.params.id, motivo, tipo, admin_id: req.user.id })
    if (wErr) throw wErr

    // Incrementar contador de warnings en el perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('warning_count').eq('id', req.params.id).single()

    const newCount = (profile?.warning_count || 0) + 1
    const updates = { warning_count: newCount }

    // Auto-ban si supera 3 warnings
    if (newCount >= 3) updates.is_banned = true

    await supabaseAdmin.from('profiles').update(updates).eq('id', req.params.id)

    res.json({ ok: true, warning_count: newCount, auto_banned: newCount >= 3 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/ban — ban directo
router.post('/users/:id/ban', async (req, res) => {
  const { motivo } = req.body
  try {
    await supabaseAdmin.from('profiles')
      .update({ is_banned: true })
      .eq('id', req.params.id)

    // Desactivar todos sus reportes activos
    await supabaseAdmin.from('reports')
      .update({ is_active: false })
      .eq('user_id', req.params.id)
      .eq('is_active', true)

    if (motivo) {
      await supabaseAdmin.from('user_warnings')
        .insert({ user_id: req.params.id, motivo, tipo: 'ban', admin_id: req.user.id })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', async (req, res) => {
  try {
    await supabaseAdmin.from('profiles')
      .update({ is_banned: false })
      .eq('id', req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/reports — todos los reportes recientes con perfil
router.get('/reports', async (req, res) => {
  try {
    const { status, section } = req.query
    let q = supabaseAdmin
      .from('reports')
      .select(`
        id, status, comment, is_active, confirmations, contradictions, created_at, weight,
        sections(name, slug),
        profiles(id, username, full_name, warning_count, is_banned)
      `)
      .order('created_at', { ascending: false })
      .limit(60)

    if (status === 'active') q = q.eq('is_active', true)
    if (status === 'inactive') q = q.eq('is_active', false)
    if (section) q = q.eq('sections.slug', section)

    const { data, error } = await q
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/reports/:id — desactivar reporte
router.delete('/reports/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('reports').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/warnings — historial de warnings
router.get('/warnings', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_warnings')
      .select('*, profiles:user_id(username, full_name), admin:admin_id(username)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
