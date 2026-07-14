import { supabase, isDemoMode } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

const DEMO_SECTIONS = [
  { id: 'demo-1', slug: 'acceso-principal', name: 'Acceso Principal', description: 'Ingreso y salida de carga', status: 'moderate', active_reports: 4, confidence: 0.78, last_report_at: new Date(Date.now() - 8 * 60_000).toISOString() },
  { id: 'demo-2', slug: 'patio-tep', name: 'Patio TEP', description: 'Patio regulador', status: 'free', active_reports: 3, confidence: 0.86, last_report_at: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: 'demo-3', slug: 'patios-llenos-ssa', name: 'Patios SSA', description: 'Zona de contenedores', status: 'congested', active_reports: 6, confidence: 0.91, last_report_at: new Date(Date.now() - 3 * 60_000).toISOString() },
  { id: 'demo-4', slug: 'aduana', name: 'Aduana Manzanillo', description: 'Revisión y despacho', status: 'moderate', active_reports: 2, confidence: 0.64, last_report_at: new Date(Date.now() - 14 * 60_000).toISOString() },
  { id: 'demo-5', slug: 'libramiento', name: 'Libramiento', description: 'Conexión carretera', status: 'free', active_reports: 2, confidence: 0.72, last_report_at: new Date(Date.now() - 11 * 60_000).toISOString() },
  { id: 'demo-6', slug: 'terminal-ictsi', name: 'Terminal ICTSI', description: 'Operación de terminal', status: 'free', active_reports: 1, confidence: 0.58, last_report_at: new Date(Date.now() - 18 * 60_000).toISOString() },
]

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Error de servidor')
  }
  return res.json()
}

export const api = {
  getSections:  ()           => isDemoMode ? Promise.resolve(DEMO_SECTIONS) : request('/api/sections'),
  getSection:   (slug)       => request(`/api/sections/${slug}`),
  getReports:   (slug)       => request(`/api/reports/${slug}`),
  postReport:   (body)       => request('/api/reports',   { method: 'POST', body: JSON.stringify(body) }),
  postReaction: (body)       => request('/api/reactions', { method: 'POST', body: JSON.stringify(body) }),
  getMe:        ()           => request('/api/users/me'),
  updateMe:     (body)       => request('/api/users/me',  { method: 'PATCH', body: JSON.stringify(body) }),
  getMyReports: ()           => request('/api/users/me/reports'),
  getAdminStats:()           => request('/api/admin/stats'),
  getAdminUsers:()           => request('/api/admin/users'),
  setUserRole:  (id, role)   => request(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteReport: (id)         => request(`/api/admin/reports/${id}`, { method: 'DELETE' }),
}
