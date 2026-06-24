import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

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
  getSections:  ()           => request('/api/sections'),
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
