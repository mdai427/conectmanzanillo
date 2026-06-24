import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/reactions — confirmar o contradecir un reporte
router.post('/', requireAuth, async (req, res) => {
  const { report_id, reaction } = req.body

  if (!report_id || !['confirm','contradict'].includes(reaction))
    return res.status(400).json({ error: 'Datos inválidos' })

  try {
    // Verificar que el reporte existe y no es del mismo usuario
    const { data: report } = await supabaseAdmin
      .from('reports')
      .select('id, user_id, section_id, confirmations, contradictions')
      .eq('id', report_id)
      .eq('is_active', true)
      .single()

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })
    if (report.user_id === req.user.id)
      return res.status(400).json({ error: 'No puedes reaccionar a tu propio reporte' })

    // Upsert reacción (una por usuario por reporte)
    const { data: existing } = await supabaseAdmin
      .from('vote_reactions')
      .select('id, reaction')
      .eq('report_id', report_id)
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (existing) {
      if (existing.reaction === reaction)
        return res.status(400).json({ error: 'Ya reaccionaste con esta opción' })

      await supabaseAdmin
        .from('vote_reactions')
        .update({ reaction })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('vote_reactions')
        .insert({ report_id, user_id: req.user.id, reaction })
    }

    // Recalcular contadores del reporte
    const { data: counts } = await supabaseAdmin
      .from('vote_reactions')
      .select('reaction')
      .eq('report_id', report_id)

    const confirmations  = counts?.filter(r => r.reaction === 'confirm').length || 0
    const contradictions = counts?.filter(r => r.reaction === 'contradict').length || 0

    await supabaseAdmin
      .from('reports')
      .update({ confirmations, contradictions })
      .eq('id', report_id)

    // Recalcular estado de la sección
    await supabaseAdmin.rpc('calculate_section_status', { p_section_id: report.section_id })

    // Broadcast
    req.app.get('io').to(`section:${report.section_id}`).emit('reaction_update', {
      report_id, confirmations, contradictions
    })

    res.json({ confirmations, contradictions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
