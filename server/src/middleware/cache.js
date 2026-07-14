/**
 * Middleware de Cache-Control para rutas Express.
 * Usa stale-while-revalidate para que el cliente sirva cache
 * mientras refresca en background.
 *
 * @param {number} seconds  Tiempo de vida del cache en segundos
 */
export function cacheFor(seconds) {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.set('Cache-Control', 'no-store')
      return next()
    }
    res.set(
      'Cache-Control',
      `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`
    )
    next()
  }
}

/** Sin cache — para endpoints que cambian en tiempo real */
export function noCache(_req, res, next) {
  res.set('Cache-Control', 'no-store')
  next()
}
