import { fetchApi } from './apiBase.js'
import { supabase } from './supabase.js'

async function request(path, options = {}, authenticated = false) {
  const headers = { Accept:'application/json', 'Content-Type':'application/json', ...(options.headers || {}) }
  if (authenticated) {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Inicia sesión para continuar')
    headers.Authorization = `Bearer ${session.access_token}`
  }
  const response = await fetchApi(path, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'No fue posible completar la solicitud')
  return payload
}

export const marketplaceApi = {
  list: () => request('/api/marketplace'),
  context: () => request('/api/marketplace/context', {}, true),
  publish: (companyId, product) => request(`/api/marketplace/companies/${companyId}`, { method:'POST', body:JSON.stringify(product) }, true),
  checkout: (planCode, companyId) => request('/api/pagos/commerce-membership/checkout', { method:'POST', body:JSON.stringify({ plan_code:planCode, company_id:companyId }) }, true),
}
