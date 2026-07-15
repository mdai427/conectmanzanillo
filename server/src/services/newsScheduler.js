import cron from 'node-cron'
import { ingestNews } from './newsEditorial.js'

let scheduledTask

/**
 * Job editorial independiente. Integrar una sola vez desde server/src/index.js.
 * Por defecto revisa las fuentes cada 30 minutos; NEWS_CRON permite modificarlo.
 */
export function startNewsScheduler() {
  if (scheduledTask) return scheduledTask
  const expression = process.env.NEWS_CRON || '*/30 * * * *'
  if (!cron.validate(expression)) throw new Error('NEWS_CRON no es una expresión válida')

  scheduledTask = cron.schedule(expression, async () => {
    try {
      const result = await ingestNews()
      console.log('[news/scheduler]', result)
    } catch (error) {
      console.error('[news/scheduler]', error.message)
    }
  })

  if (process.env.NEWS_RUN_ON_START === 'true') {
    setTimeout(() => ingestNews().catch(error => console.error('[news/startup]', error.message)), 5_000)
  }
  console.log(`[news/scheduler] Activo con frecuencia ${expression}`)
  return scheduledTask
}
