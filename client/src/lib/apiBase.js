const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function resolveApiBase(configured = import.meta.env.VITE_API_URL, browserHost = globalThis.location?.hostname) {
  const value = String(configured || '').trim().replace(/\/$/, '')
  if (!value) return ''
  try {
    const target = new URL(value)
    if (LOCAL_HOSTS.has(target.hostname) && browserHost && !LOCAL_HOSTS.has(browserHost)) return ''
    return target.origin
  } catch {
    return ''
  }
}

export const API_BASE = resolveApiBase()

export async function fetchApi(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    return await fetch(`${API_BASE}${path}`, { ...options, signal: options.signal || controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('El servicio tardó demasiado en responder. Inténtalo nuevamente.')
    throw new Error('No pudimos conectar con Faro Portuario. Verifica tu conexión e inténtalo de nuevo.')
  } finally {
    clearTimeout(timeout)
  }
}
