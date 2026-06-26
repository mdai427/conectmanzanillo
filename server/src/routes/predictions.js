import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { predQueue } from '../services/queue.js'
import { getPredCache, setPredCache, PRED_TTL } from '../services/workers.js'

const router = Router()

const predictLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes de predicción' },
})

// GET /api/predictions
// - Si el cache es fresco → responde inmediatamente
// - Si el cache expiró → responde con datos stale Y dispara refresh en background
// - Si no hay cache → encola refresh y responde con null (cliente usa patrón horario)
router.get('/', predictLimit, async (_req, res) => {
  const { predCache, predCacheAt } = getPredCache()
  const age = Date.now() - predCacheAt
  const fresh = predCache && age < PRED_TTL

  if (fresh) {
    return res.json({ ...predCache, cached: true })
  }

  // Cache expirado o vacío — disparar refresh en background sin bloquear
  const alreadyQueued = predQueue.stats().pending > 0 || predQueue.stats().running > 0
  if (!alreadyQueued) {
    predQueue.add('refresh_predictions', {}, { retries: 2 })
  }

  if (predCache) {
    // Devolver stale mientras se actualiza en background
    return res.json({ ...predCache, cached: true, stale: true })
  }

  // Primera vez — sin datos todavía
  res.json({ predicciones: [], resumen: null, cached: false })
})

// POST /api/predictions/invalidate (admin)
router.post('/invalidate', (_req, res) => {
  setPredCache(null)
  predQueue.add('refresh_predictions', {}, { retries: 1 })
  res.json({ ok: true, message: 'Cache invalidado, refresh encolado' })
})

// GET /api/predictions/status (debug)
router.get('/status', (_req, res) => {
  const { predCacheAt } = getPredCache()
  res.json({
    queue: predQueue.stats(),
    cache_age_seconds: predCacheAt ? Math.round((Date.now() - predCacheAt) / 1000) : null,
    cache_ttl_seconds: PRED_TTL / 1000,
  })
})

export default router
