import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// GET /api/sections — todas las secciones con su estado actual
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sections')
      .select(`
        id, slug, name, description, icon, sort_order, lat, lng,
        section_status_cache(current_status, active_reports, confidence, last_report_at)
      `)
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error

    const sections = data.map(s => ({
      ...s,
      status: s.section_status_cache?.current_status || 'free',
      active_reports: s.section_status_cache?.active_reports || 0,
      confidence: s.section_status_cache?.confidence || 0,
      last_report_at: s.section_status_cache?.last_report_at || null,
    }))

    res.json(sections)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/sections/:slug — una sección específica
router.get('/:slug', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sections')
      .select(`
        id, slug, name, description, icon, lat, lng,
        section_status_cache(current_status, active_reports, confidence, last_report_at, last_calculated)
      `)
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Sección no encontrada' })

    res.json({
      ...data,
      status: data.section_status_cache?.current_status || 'free',
      active_reports: data.section_status_cache?.active_reports || 0,
      confidence: data.section_status_cache?.confidence || 0,
      last_report_at: data.section_status_cache?.last_report_at || null,
      last_calculated: data.section_status_cache?.last_calculated || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/sections/:slug/history — historial de estado de zona
router.get('/:slug/history', async (req, res) => {
  try {
    const { data: section } = await supabaseAdmin
      .from('sections').select('id').eq('slug', req.params.slug).single()
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' })

    const { data, error } = await supabaseAdmin
      .from('zone_status_history')
      .select('status, active_reports, confidence, recorded_at')
      .eq('section_id', section.id)
      .order('recorded_at', { ascending: false })
      .limit(48)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/sections/:slug/timeline — eventos de la zona
router.get('/:slug/timeline', async (req, res) => {
  try {
    const { data: section } = await supabaseAdmin
      .from('sections').select('id').eq('slug', req.params.slug).single()
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' })

    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .select('id, tipo, severidad, descripcion, fuente, created_at')
      .eq('section_id', section.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
