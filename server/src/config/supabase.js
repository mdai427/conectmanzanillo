import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Inicialización lazy — el cliente se crea la primera vez que se usa,
// no al importar el módulo. Esto permite que el servidor arranque
// y muestre un error claro si faltan las variables de entorno.
let _client = null

export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    if (!_client) {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) {
        throw new Error(
          'Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas.'
        )
      }
      _client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: ws },
      })
    }
    const val = _client[prop]
    return typeof val === 'function' ? val.bind(_client) : val
  }
})
