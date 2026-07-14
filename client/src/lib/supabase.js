import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemoMode = !configuredUrl || !configuredKey

// Supabase exige valores no vacíos al importar el módulo. Estos valores locales
// permiten que la interfaz arranque en modo demostración sin credenciales.
export const supabase = createClient(
  configuredUrl || 'http://127.0.0.1:54321',
  configuredKey || 'faro-portuario-demo-key',
  isDemoMode ? { auth: { persistSession: false, autoRefreshToken: false } } : undefined
)
