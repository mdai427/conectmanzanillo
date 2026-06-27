import { supabaseAdmin } from '../config/supabase.js'

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token inválido' })

  req.user = user
  next()
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    const { supabaseAdmin } = await import('../config/supabase.js')
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single()

    if (!profile || !roles.includes(profile.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }
    req.profile = profile
    next()
  }
}
