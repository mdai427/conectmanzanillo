import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// Cache in-memory — 5 minutos
let _cache = null
let _cacheAt = 0
const TTL = 5 * 60 * 1000

// GET /api/rankings — top reporters leaderboard
router.get('/', async (_req, res) => {
  try {
    if (_cache && Date.now() - _cacheAt < TTL) {
      return res.json(_cache)
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, puntos, nivel, total_reportes, reportes_confirmados')
      .gt('total_reportes', 0)
      .order('puntos', { ascending: false })
      .limit(20)

    if (error) throw error

    _cache = data || []
    _cacheAt = Date.now()
    res.json(_cache)
  } catch (err) {
    // Devolver cache stale si hay error
    if (_cache) return res.json(_cache)
    res.status(500).json({ error: err.message })
  }
})

/** Invalida el cache (llamar desde mutations de puntos/reportes) */
export function invalidateRankingsCache() {
  _cache = null
  _cacheAt = 0
}

export default router
