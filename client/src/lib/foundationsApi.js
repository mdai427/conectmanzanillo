import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${BASE}/api/foundations${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'No fue posible completar la operación')
    error.details = data
    throw error
  }
  return data
}

export const foundationsApi = {
  getPlans: (audience) => request(`/plans${audience ? `?audience=${audience}` : ''}`),
  getMyCompanies: () => request('/companies/me'),
  createCompany: (payload) => request('/companies', { method: 'POST', body: JSON.stringify(payload) }),
  updateCompany: (id, payload) => request(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  prepareDocument: (id, payload) => request(`/companies/${id}/documents/upload-url`, { method: 'POST', body: JSON.stringify(payload) }),
  selectPlan: (id, payload) => request(`/companies/${id}/select-plan`, { method: 'POST', body: JSON.stringify(payload) }),
  submitVerification: (id) => request(`/companies/${id}/submit-verification`, { method: 'POST' }),
}
