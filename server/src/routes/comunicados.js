import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/comunicados — públicos aprobados
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comunicados')
      .select('id, titulo, contenido, archivo_url, created_at, profiles:user_id(username, full_name)')
      .eq('status', 'aprobado')
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/comunicados — crear (requiere auth)
router.post('/', requireAuth, async (req, res) => {
  const { titulo, contenido, archivo_url } = req.body
  if (!titulo?.trim() || !contenido?.trim())
    return res.status(400).json({ error: 'Título y contenido requeridos' })

  try {
    const { data, error } = await supabaseAdmin
      .from('comunicados')
      .insert({ user_id: req.user.id, titulo: titulo.trim(), contenido: contenido.trim(), archivo_url: archivo_url || null })
      .select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Rutas de moderación (admin o moderador) ──────────────────────────────────
router.use(requireAuth)

async function requireMod(req, res, next) {
  const { data: p } = await supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).single()
  if (!p || !['admin', 'moderador'].includes(p.role))
    return res.status(403).json({ error: 'Sin permisos de moderación' })
  req.profile = p
  next()
}

// GET /api/comunicados/admin/pending
router.get('/admin/all', requireMod, async (req, res) => {
  const { status = 'pendiente' } = req.query
  try {
    const q = supabaseAdmin
      .from('comunicados')
      .select('*, profiles:user_id(id, username, full_name, warning_count, is_banned)')
      .order('created_at', { ascending: false })
      .limit(60)
    if (status !== 'todos') q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/comunicados/:id/review
router.patch('/:id/review', requireMod, async (req, res) => {
  const { status, review_note } = req.body
  if (!['aprobado', 'rechazado'].includes(status))
    return res.status(400).json({ error: 'Estado inválido' })

  try {
    const { data, error } = await supabaseAdmin
      .from('comunicados')
      .update({ status, review_note: review_note || null, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
