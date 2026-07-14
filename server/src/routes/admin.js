import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { PLATFORM_ROLES } from '../security/catalog.js'

const router = Router()

router.use(requireAuth)

// GET /api/admin/stats
router.get('/stats', requirePermission('admin.analytics'), async (_req, res) => {
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
router.get('/users', requirePermission('admin.users.manage'), async (req, res) => {
  try {
    const { search } = req.query
    let q = supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, role, reputation, puntos, total_reportes, is_banned, warning_count, tipo_usuario, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const safeSearch = String(search || '').replace(/[,().%]/g, '').trim().slice(0, 60)
    if (safeSearch) q = q.or(`username.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`)

    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requirePermission('admin.roles.manage'), async (req, res) => {
  const { role } = req.body
  const LEGACY_ROLES = ['operator_free', 'operator_premium', 'company', 'moderador', 'admin']

  if (!role || ![...LEGACY_ROLES, ...PLATFORM_ROLES].includes(role))
    return res.status(400).json({ error: 'Rol inválido' })

  try {
    if (PLATFORM_ROLES.includes(role)) {
      const { data: roleRecord, error: roleError } = await supabaseAdmin.from('roles').select('id, code, name').eq('code', role).single()
      if (roleError) throw roleError
      const { error } = await supabaseAdmin.from('user_roles').upsert({ user_id: req.params.id, role_id: roleRecord.id, assigned_by: req.user.id })
      if (error) throw error
      await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'role.assigned', entity_type: 'user', entity_id: req.params.id, new_state: { role } })
      return res.json(roleRecord)
    }
    const { data, error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', req.params.id).select().single()
    if (error) throw error
    await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'legacy_role.changed', entity_type: 'user', entity_id: req.params.id, new_state: { role } })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/warn — enviar warning
router.post('/users/:id/warn', requirePermission('moderation.manage'), async (req, res) => {
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

// POST /api/admin/users/:id/temp-ban — ban temporal por N días
router.post('/users/:id/temp-ban', requirePermission('moderation.manage'), async (req, res) => {
  const { dias, motivo } = req.body
  if (!dias || dias < 1) return res.status(400).json({ error: 'Días requeridos' })

  const until = new Date(Date.now() + dias * 86400_000).toISOString()
  try {
    await supabaseAdmin.from('profiles')
      .update({ is_banned: true, temp_ban_until: until })
      .eq('id', req.params.id)

    await supabaseAdmin.from('reports')
      .update({ is_active: false })
      .eq('user_id', req.params.id).eq('is_active', true)

    if (motivo) {
      await supabaseAdmin.from('user_warnings')
        .insert({ user_id: req.params.id, motivo: `Ban temporal ${dias}d: ${motivo}`, tipo: 'ban', admin_id: req.user.id })
    }
    res.json({ ok: true, temp_ban_until: until })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/annul-votes — anular todos los votos del usuario
router.post('/users/:id/annul-votes', requirePermission('moderation.manage'), async (req, res) => {
  const { motivo } = req.body
  try {
    const now = new Date().toISOString()
    const { data: reactions } = await supabaseAdmin
      .from('vote_reactions')
      .select('id')
      .eq('user_id', req.params.id)
      .eq('is_annulled', false)

    if (reactions?.length) {
      await supabaseAdmin.from('vote_reactions')
        .update({ is_annulled: true, annulled_by: req.user.id, annulled_at: now })
        .eq('user_id', req.params.id)
    }

    if (motivo) {
      await supabaseAdmin.from('user_warnings')
        .insert({ user_id: req.params.id, motivo: `Votos anulados: ${motivo}`, tipo: 'otro', admin_id: req.user.id })
    }

    res.json({ ok: true, annulled: reactions?.length || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/reports/:id/annul — anular el voto/reporte específico
router.post('/reports/:id/annul', requirePermission('moderation.manage'), async (req, res) => {
  const { motivo } = req.body
  try {
    // Marcar reporte como inactivo
    const { data: report } = await supabaseAdmin
      .from('reports').select('user_id').eq('id', req.params.id).single()

    await supabaseAdmin.from('reports')
      .update({ is_active: false }).eq('id', req.params.id)

    // Warning al usuario
    if (report?.user_id && motivo) {
      await supabaseAdmin.from('user_warnings')
        .insert({ user_id: report.user_id, motivo: `Reporte anulado por desinformación: ${motivo}`, tipo: 'publicacion_falsa', admin_id: req.user.id })

      // Incrementar warning_count
      const { data: p } = await supabaseAdmin.from('profiles').select('warning_count').eq('id', report.user_id).single()
      const newCount = (p?.warning_count || 0) + 1
      const updates = { warning_count: newCount }
      if (newCount >= 3) updates.is_banned = true
      await supabaseAdmin.from('profiles').update(updates).eq('id', report.user_id)
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/vote-history — historial de votos recientes
router.get('/vote-history', requirePermission('moderation.manage'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vote_reactions')
      .select(`
        id, reaction, created_at, is_annulled,
        profiles:user_id(id, username, full_name, warning_count, is_banned),
        reports:report_id(id, status, comment, section_id, sections:section_id(name))
      `)
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users/:id/ban — ban directo
router.post('/users/:id/ban', requirePermission('moderation.manage'), async (req, res) => {
  const { motivo } = req.body
  try {
    await supabaseAdmin.from('profiles')
      .update({ is_banned: true, temp_ban_until: null })
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
router.post('/users/:id/unban', requirePermission('moderation.manage'), async (req, res) => {
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
router.get('/reports', requirePermission('moderation.manage'), async (req, res) => {
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
router.delete('/reports/:id', requirePermission('moderation.manage'), async (req, res) => {
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
router.get('/warnings', requirePermission('moderation.manage'), async (_req, res) => {
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
