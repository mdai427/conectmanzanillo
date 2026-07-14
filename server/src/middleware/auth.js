import { supabaseAdmin } from '../config/supabase.js'
import { normalizeBearerToken, PERMISSIONS } from '../security/catalog.js'

export async function requireAuth(req, res, next) {
  const token = normalizeBearerToken(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token inválido' })

  req.user = user
  next()
}

export function requirePermission(permission) {
  if (!PERMISSIONS.includes(permission)) throw new Error(`Permiso desconocido: ${permission}`)

  return async (req, res, next) => {
    try {
      const { data, error } = await supabaseAdmin.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission: permission,
      })
      if (error) throw error
      if (!data) return res.status(403).json({ error: 'Permisos insuficientes', permission })
      next()
    } catch (error) {
      console.error('[auth/permission]', error.message)
      res.status(500).json({ error: 'No fue posible validar los permisos' })
    }
  }
}

export function requireCompanyAccess(permission = 'company.manage_profile') {
  if (!PERMISSIONS.includes(permission)) throw new Error(`Permiso desconocido: ${permission}`)

  return async (req, res, next) => {
    try {
      const companyId = req.params.companyId || req.params.id
      const { data, error } = await supabaseAdmin.rpc('company_member_has_permission', {
        p_user_id: req.user.id,
        p_company_id: companyId,
        p_permission: permission,
      })
      if (error) throw error
      if (!data) return res.status(403).json({ error: 'No tienes acceso a esta empresa', permission })
      req.companyId = companyId
      next()
    } catch (error) {
      console.error('[auth/company-permission]', error.message)
      res.status(500).json({ error: 'No fue posible validar el acceso a la empresa' })
    }
  }
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
