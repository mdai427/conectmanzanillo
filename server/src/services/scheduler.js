import cron from 'node-cron'
import { supabaseAdmin } from '../config/supabase.js'

export function startScheduler() {
  // Cada 15 minutos: marcar reportes expirados como inactivos
  cron.schedule('*/15 * * * *', async () => {
    const { error } = await supabaseAdmin
      .from('reports')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)

    if (!error) console.log(`[scheduler] Reportes expirados limpiados: ${new Date().toISOString()}`)
  })

  console.log('[scheduler] Iniciado')
}
