import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req, res) => {
  const { username, full_name, phone } = req.body
  const updates = {}

  if (username !== undefined) updates.username = username?.trim().slice(0, 30) || null
  if (full_name !== undefined) updates.full_name = full_name?.trim().slice(0, 60) || null
  if (phone !== undefined)    updates.phone = phone?.trim().slice(0, 20) || null
  updates.updated_at = new Date().toISOString()

  try {
    // Verificar username único
    if (updates.username) {
      const { data: taken } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', updates.username)
        .neq('id', req.user.id)
        .maybeSingle()

      if (taken) return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/me/reports — historial del usuario
router.get('/me/reports', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('id, status, comment, created_at, expires_at, is_active, confirmations, contradictions, sections(name, slug)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
