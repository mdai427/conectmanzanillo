import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// GET /api/rankings — top reporters leaderboard
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, puntos, nivel, total_reportes, reportes_confirmados')
      .gt('total_reportes', 0)
      .order('puntos', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
