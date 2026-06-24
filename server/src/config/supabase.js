import { createClient } from '@supabase/supabase-js'

// Service role — solo en server, nunca exponer al cliente
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
