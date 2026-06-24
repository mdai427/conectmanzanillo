import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

// Todas las rutas de admin requieren auth + rol admin
router.use(requireAuth)
router.use(requireRole('admin'))

// GET /api/admin/stats — estadísticas generales
router.get('/stats', async (_req, res) => {
  try {
    const [{ count: users }, { count: reports }, { count: reactions }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vote_reactions').select('*', { count: 'exact', head: true }),
    ])

    const { data: activeReports } = await supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    res.json({ users, reports, reactions, active_reports: activeReports?.count || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/users — lista de usuarios
router.get('/users', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, role, reputation, reports_count, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/users/:id/role — cambiar rol
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body
  const VALID_ROLES = ['operator_free','operator_premium','company','admin']

  if (!role || !VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Rol inválido' })

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/reports/:id — eliminar reporte
router.delete('/reports/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('reports')
      .update({ is_active: false })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
