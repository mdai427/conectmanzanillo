const BLOCKED_TEXT_PATTERNS = [
  { category: 'sexual', pattern: /\b(pornograf(?:ía|ia)|sexo explícito|desnudo(?:s|z)|contenido sexual)\b/i },
  { category: 'exploitation', pattern: /\b(explotación sexual|abuso infantil|menores desnudos)\b/i },
  { category: 'death_gore', pattern: /\b(cadáver(?:es)?|decapitad[oa]s?|desmembrad[oa]s?|gore)\b/i },
  { category: 'sensitive', pattern: /\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d|historial médico|expediente clínico)\b/i },
  { category: 'sensitive', pattern: /\b(?:\d[ -]*?){13,19}\b/ },
  { category: 'death_gore', pattern: /\b(violencia gráfica|heridas expuestas|persona fallecida)\b/i },
]

export const COMMUNITY_SAFETY_CATEGORIES = Object.freeze([
  'death_gore', 'sexual', 'exploitation', 'sensitive',
])

export function localSafetyScreen(text = '') {
  const match = BLOCKED_TEXT_PATTERNS.find(({ pattern }) => pattern.test(text))
  return match
    ? { blocked: true, categories: [match.category], reason: 'El texto contiene contenido no permitido.' }
    : { blocked: false, categories: [], reason: null }
}

function normalizeProviderResult(payload) {
  if (!payload || typeof payload !== 'object') return null
  const categories = COMMUNITY_SAFETY_CATEGORIES.filter((key) => payload.categories?.[key] === true)
  const unsafe = payload.safe === false || categories.length > 0
  if (unsafe) {
    return {
      status: 'rejected', providerStatus: 'completed', categories,
      reason: payload.reason || 'El proveedor detectó contenido sensible no permitido.',
      raw: payload,
    }
  }
  if (payload.safe === true) {
    return { status: 'approved', providerStatus: 'completed', categories: [], reason: null, raw: payload }
  }
  return null
}

/**
 * Modera texto e imágenes con un webhook configurable.
 * Sin proveedor, con timeout o con respuesta ambigua conserva el contenido pendiente.
 */
export async function moderateCommunityContent({ text = '', images = [] }, options = {}) {
  const env = options.env || process.env
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const local = localSafetyScreen(text)

  if (local.blocked) {
    return {
      status: 'rejected', provider: 'local-policy', providerStatus: 'completed',
      categories: local.categories, reason: local.reason, raw: null,
    }
  }

  const provider = String(env.COMMUNITY_MODERATION_PROVIDER || '').toLowerCase()
  const endpoint = env.COMMUNITY_MODERATION_URL
  if (provider !== 'webhook' || !endpoint) {
    return {
      status: 'pending_review', provider: provider || 'none', providerStatus: 'not_configured',
      categories: [], reason: 'Pendiente de revisión de seguridad.', raw: null,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.COMMUNITY_MODERATION_TOKEN ? { Authorization: `Bearer ${env.COMMUNITY_MODERATION_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        policy: 'faro-portuario-community-v1',
        categories: COMMUNITY_SAFETY_CATEGORIES,
        text,
        images,
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`moderation_http_${response.status}`)
    const normalized = normalizeProviderResult(await response.json())
    if (!normalized) throw new Error('moderation_invalid_response')
    return { ...normalized, provider: 'webhook' }
  } catch (error) {
    return {
      status: 'pending_review', provider: 'webhook', providerStatus: 'error', categories: [],
      reason: 'La revisión automática no terminó; requiere revisión manual.', raw: { error: error.message },
    }
  } finally {
    clearTimeout(timeout)
  }
}
