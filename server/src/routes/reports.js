import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const COOLDOWN_MINUTES = parseInt(process.env.VITE_REPORT_COOLDOWN_MINUTES || '30')
const EXPIRY_HOURS     = parseInt(process.env.VITE_REPORT_EXPIRY_HOURS || '3')

// GET /api/reports/:sectionSlug — últimos reportes de una sección
router.get('/:sectionSlug', async (req, res) => {
  try {
    const { data: section } = await supabaseAdmin
      .from('sections').select('id').eq('slug', req.params.sectionSlug).single()
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' })

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`
        id, status, comment, weight, confirmations, contradictions, created_at, expires_at,
        profiles(username)
      `)
      .eq('section_id', section.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/reports — nuevo reporte
router.post('/', requireAuth, async (req, res) => {
  const { section_id, status, comment } = req.body
  const VALID_STATUS = ['free','moderate','congested','closed']

  if (!section_id || !status || !VALID_STATUS.includes(status))
    return res.status(400).json({ error: 'Datos inválidos' })

  try {
    // Verificar cooldown
    const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('reports')
      .select('id, created_at')
      .eq('user_id', req.user.id)
      .eq('section_id', section_id)
      .gt('created_at', cooldownTime)
      .maybeSingle()

    if (recent) {
      const minutesAgo = Math.floor((Date.now() - new Date(recent.created_at)) / 60000)
      return res.status(429).json({
        error: `Ya reportaste esta zona hace ${minutesAgo} minutos. Espera ${COOLDOWN_MINUTES - minutesAgo} minutos más.`
      })
    }

    // Obtener reputación del usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('reputation').eq('id', req.user.id).single()

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000).toISOString()

    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .insert({
        section_id,
        user_id: req.user.id,
        status,
        comment: comment?.trim().slice(0, 140) || null,
        weight: profile?.reputation || 1.0,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error

    // Broadcast Socket.io a todos los clientes
    req.app.get('io').to(`section:${section_id}`).emit('new_report', report)
    req.app.get('io').emit('activity', report)

    res.status(201).json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
