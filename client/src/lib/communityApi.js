import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${BASE}/api/community${path}`, {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'No fue posible completar la acción.')
    error.status = response.status
    throw error
  }
  return data
}
export const communityApi = {
  list: () => request(''),
  create: (body, imagePaths) => request('', { method: 'POST', body: JSON.stringify({ body, imagePaths }) }),
  update: (id, body, imagePaths) => request(`/${id}`, { method: 'PATCH', body: JSON.stringify({ body, imagePaths }) }),
  remove: (id) => request(`/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => request(`/${id}/like`, { method: 'POST' }),
  comments: (id) => request(`/${id}/comments`),
  comment: (id, body) => request(`/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  removeComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  report: (id, reason, details = '') => request(`/${id}/reports`, { method: 'POST', body: JSON.stringify({ reason, details }) }),
  async uploadImage(file) {
    const ticket = await request('/uploads/ticket', {
      method: 'POST', body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
    })
    const { error } = await supabase.storage.from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type })
    if (error) throw new Error('No fue posible subir una fotografía.')
    return ticket.path
  },
}
