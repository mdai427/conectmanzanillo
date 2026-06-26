import cron from 'node-cron'
import { maintenanceQueue, predQueue } from './queue.js'

export function startScheduler() {
  // Cada 15 min — expirar reportes viejos (via queue con retry)
  cron.schedule('*/15 * * * *', () => {
    maintenanceQueue.add('expire_reports', {}, { retries: 3 })
  })

  // Cada 15 min — pre-calentar cache de predicciones (off-peak)
  cron.schedule('*/15 * * * *', () => {
    predQueue.add('refresh_predictions', {}, { retries: 2 })
  })

  // Disparar predicciones al arrancar (para que el primer usuario no espere)
  predQueue.add('refresh_predictions', {}, { retries: 2, delay: 3000 })

  console.log('[scheduler] Iniciado — expiración cada 15min, predicciones pre-calentadas')
}
