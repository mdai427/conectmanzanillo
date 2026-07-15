import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function readError(response) {
  const body = await response.json().catch(() => ({}))
  const error = new Error(body.error || 'No fue posible completar la solicitud')
  error.status = response.status
  return error
}

function filenameFromHeader(value, fallback) {
  if (!value) return fallback
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = value.match(/filename="?([^";]+)"?/i)
  return plain?.[1] || fallback
}

export const resourcesApi = {
  async list(library) {
    const query = library ? `?library=${encodeURIComponent(library)}` : ''
    const response = await fetch(`${BASE}/api/resources${query}`)
    if (!response.ok) throw await readError(response)
    return response.json()
  },

  async download(resource) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      const error = new Error('Inicia sesión para descargar gratis')
      error.status = 401
      throw error
    }

    const response = await fetch(`${BASE}/api/resources/${encodeURIComponent(resource.id)}/download`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) throw await readError(response)

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filenameFromHeader(response.headers.get('Content-Disposition'), resource.downloadName)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
}
