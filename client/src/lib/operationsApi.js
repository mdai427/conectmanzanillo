import { supabase } from './supabase.js'

const API = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Inicia sesión para acceder al centro operativo')
  const response = await fetch(`${API}/api/operations${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'No fue posible completar la operación')
  return payload
}

export const operationsApi = {
  context: () => request('/context'),
  routes: (companyId) => request(`/companies/${companyId}/routes`),
  routeCatalogs: (companyId) => request(`/companies/${companyId}/route-catalogs`),
  createLegalRule: (companyId, body) => request(`/companies/${companyId}/legal-rules`, { method: 'POST', body: JSON.stringify(body) }),
  createAuthorizedStop: (companyId, body) => request(`/companies/${companyId}/authorized-stops`, { method: 'POST', body: JSON.stringify(body) }),
  createRoute: (companyId, body) => request(`/companies/${companyId}/routes`, { method: 'POST', body: JSON.stringify(body) }),
  evaluateRoute: (companyId, routeId, body = {}) => request(`/companies/${companyId}/routes/${routeId}/evaluate`, { method: 'POST', body: JSON.stringify(body) }),
  customs: (companyId) => request(`/companies/${companyId}/customs`),
  createCustoms: (companyId, body) => request(`/companies/${companyId}/customs`, { method: 'POST', body: JSON.stringify(body) }),
  addCustomsEvent: (companyId, operationId, body) => request(`/companies/${companyId}/customs/${operationId}/events`, { method: 'POST', body: JSON.stringify(body) }),
  appointments: (companyId) => request(`/companies/${companyId}/appointments`),
  createAppointment: (companyId, body) => request(`/companies/${companyId}/appointments`, { method: 'POST', body: JSON.stringify(body) }),
  tower: (companyId) => request(`/companies/${companyId}/tower`),
}
