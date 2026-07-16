import { createHash } from 'crypto'
import { supabaseAdmin } from '../config/supabase.js'

const MAX_ITEMS_PER_SOURCE = 30
const FETCH_TIMEOUT_MS = 12_000
const DISCOVERY_CACHE_MS = 10 * 60_000
let discoveryCache = { expiresAt: 0, items: [] }

const CATEGORY_TERMS = {
  accesos: ['acceso', 'ingreso', 'libramiento', 'carretera', 'tráfico', 'congestión', 'bloqueo', 'fila', 'patio regulador'],
  puerto: ['puerto', 'portuario', 'terminal', 'contenedor', 'buque', 'manzanillo'],
  aduana: ['aduana', 'aduanal', 'despacho', 'pedimento', 'anam'],
  transporte: ['autotransporte', 'transportista', 'camión', 'tractocamión', 'operador', 'carga'],
  comercio_exterior: ['comercio exterior', 'importación', 'exportación', 'logística', 'supply chain'],
  clima: ['huracán', 'tormenta', 'lluvia', 'oleaje', 'ciclón', 'clima'],
  normatividad: ['nom-', 'regla', 'decreto', 'dof', 'sat', 'carta porte', 'normatividad'],
  empleo: ['vacante', 'empleo', 'contratación', 'bolsa de trabajo'],
}

const HIGH_VALUE_TERMS = new Map([
  ['manzanillo', 35], ['puerto de manzanillo', 40], ['aduana de manzanillo', 40],
  ['acceso al puerto', 30], ['libramiento', 18], ['patio regulador', 18],
  ['colima', 12], ['asipona manzanillo', 28], ['terminal portuaria', 12],
  ['carta porte', 12], ['autotransporte federal', 10], ['bloqueo', 12],
])

function envBool(value, fallback = false) {
  if (value == null) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Fuentes RSS/API expresamente configuradas. No se rastrean páginas HTML.
 * NEWS_RSS_SOURCES acepta un JSON: [{id,name,homepageUrl,feedUrl,trusted,...}]
 */
export function configuredNewsSources() {
  const sources = []
  if (envBool(process.env.NEWS_ENABLE_GOOGLE_DISCOVERY, false)) {
    const query = encodeURIComponent('("Puerto de Manzanillo" OR "acceso puerto Manzanillo" OR "aduana Manzanillo")')
    sources.push({
      id: 'google-news-discovery-manzanillo',
      name: 'Google News · descubrimiento',
      homepageUrl: 'https://news.google.com/',
      feedUrl: `https://news.google.com/rss/search?q=${query}&hl=es-419&gl=MX&ceid=MX:es-419`,
      type: 'rss',
      trusted: false,
      autoPublish: false,
      allowsImage: false,
    })
  }
  if (process.env.NEWS_RSS_SOURCES) {
    try {
      const parsed = JSON.parse(process.env.NEWS_RSS_SOURCES)
      if (Array.isArray(parsed)) sources.push(...parsed.map(source => ({ ...source, type: 'rss' })))
    } catch (error) {
      console.warn('[news] NEWS_RSS_SOURCES no contiene JSON válido:', error.message)
    }
  }

  if (process.env.NEWS_API_ENDPOINT) {
    sources.push({
      id: process.env.NEWS_API_SOURCE_ID || 'licensed-news-api',
      name: process.env.NEWS_API_SOURCE_NAME || 'Proveedor de noticias',
      homepageUrl: process.env.NEWS_API_HOMEPAGE || process.env.NEWS_API_ENDPOINT,
      feedUrl: process.env.NEWS_API_ENDPOINT,
      type: 'api',
      trusted: envBool(process.env.NEWS_API_TRUSTED),
      autoPublish: envBool(process.env.NEWS_API_AUTO_PUBLISH),
      allowsImage: envBool(process.env.NEWS_API_ALLOWS_IMAGE),
      token: process.env.NEWS_API_TOKEN,
    })
  }

  return sources.filter(isAllowedSource)
}

export function manzanilloDiscoverySource() {
  const query = encodeURIComponent('("Puerto de Manzanillo" OR "acceso puerto Manzanillo" OR "aduana Manzanillo" OR "logística Manzanillo")')
  return {
    id: 'google-news-discovery-manzanillo',
    name: 'Google News · descubrimiento',
    homepageUrl: 'https://news.google.com/',
    feedUrl: `https://news.google.com/rss/search?q=${query}&hl=es-419&gl=MX&ceid=MX:es-419`,
    type: 'rss', trusted: false, autoPublish: false, allowsImage: false,
  }
}

export function isAllowedSource(source) {
  if (!source?.id || !source?.name || !source?.feedUrl || !source?.homepageUrl) return false
  try {
    const feed = new URL(source.feedUrl)
    const home = new URL(source.homepageUrl)
    const blockedHost = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/i
    return feed.protocol === 'https:' && home.protocol === 'https:'
      && !blockedHost.test(feed.hostname)
  } catch {
    return false
  }
}

export function isOfficialAutoPublishSource(source) {
  try {
    const homepage = new URL(source.homepageUrl)
    const host = homepage.hostname.toLowerCase()
    const officialHosts = ['puertomanzanillo.com.mx', 'anam.gob.mx', 'semar.gob.mx', 'col.gob.mx']
    if (officialHosts.some(domain => host === domain || host.endsWith(`.${domain}`))) return true
    return (host === 'gob.mx' || host.endsWith('.gob.mx'))
      && /^\/(se\/?mar|anam)(\/|$)/i.test(homepage.pathname)
  } catch {
    return false
  }
}

export function normalizeText(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim()
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key)
    }
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return normalizeText(match?.[1] || '')
}

function attributeValue(xml, tag, attribute) {
  const match = xml.match(new RegExp(`<${tag}\\s[^>]*${attribute}=["']([^"']+)["'][^>]*>`, 'i'))
  return normalizeText(match?.[1] || '')
}

export function parseRssFeed(xml, source) {
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>|<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || []
  return blocks.slice(0, MAX_ITEMS_PER_SOURCE).map(block => {
    const title = tagValue(block, 'title')
    const atomLink = attributeValue(block, 'link', 'href')
    const link = canonicalizeUrl(tagValue(block, 'link') || atomLink)
    const published = tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated')
    const publisherName = tagValue(block, 'source')
    const publisherUrl = attributeValue(block, 'source', 'url')
    return {
      title,
      url: link,
      externalId: tagValue(block, 'guid') || tagValue(block, 'id') || link,
      publishedAt: Number.isNaN(Date.parse(published)) ? null : new Date(published).toISOString(),
      publisherName: publisherName || null,
      publisherUrl: canonicalizeUrl(publisherUrl),
      source,
    }
  }).filter(item => item.title.length >= 8 && item.url)
}

export function publicDiscoveryRecord(item) {
  const record = prepareNewsRecord(item)
  return {
    id: record.fingerprint,
    title: record.title,
    editorial_summary: record.editorial_summary,
    category: record.category,
    relevance_score: record.relevance_score,
    canonical_url: record.canonical_url,
    source_name: item.publisherName || item.source.name,
    source_url: item.publisherUrl || item.source.homepageUrl,
    image_url: null,
    published_at_source: record.published_at_source,
    published_at_portal: null,
  }
}

export async function discoverPublicNews({ force = false } = {}) {
  if (!force && discoveryCache.expiresAt > Date.now()) return discoveryCache.items
  const source = manzanilloDiscoverySource()
  const discovered = await fetchSource(source)
  const items = discovered
    .filter(item => {
      const ageHours = item.publishedAt ? (Date.now() - Date.parse(item.publishedAt)) / 3_600_000 : 0
      return scoreNewsItem(item).score >= 35 && ageHours <= 24 * 14
    })
    .map(publicDiscoveryRecord)
    .sort((a, b) => Date.parse(b.published_at_source || 0) - Date.parse(a.published_at_source || 0))
    .slice(0, 30)
  discoveryCache = { expiresAt: Date.now() + DISCOVERY_CACHE_MS, items }
  return items
}

export function parseApiFeed(payload, source) {
  const entries = Array.isArray(payload) ? payload : payload.articles || payload.items || payload.results || []
  return entries.slice(0, MAX_ITEMS_PER_SOURCE).map(entry => ({
    title: normalizeText(entry.title || entry.headline),
    url: canonicalizeUrl(entry.url || entry.link),
    externalId: String(entry.id || entry.guid || entry.url || ''),
    publishedAt: Number.isNaN(Date.parse(entry.publishedAt || entry.published_at || entry.date))
      ? null : new Date(entry.publishedAt || entry.published_at || entry.date).toISOString(),
    imageUrl: source.allowsImage ? canonicalizeUrl(entry.imageUrl || entry.image_url || entry.image) : null,
    source,
  })).filter(item => item.title.length >= 8 && item.url)
}

export function scoreNewsItem(item) {
  const text = `${item.title} ${item.source?.name || ''}`.toLocaleLowerCase('es-MX')
  let score = 0
  const reasons = []

  for (const [term, points] of HIGH_VALUE_TERMS) {
    if (text.includes(term)) {
      score += points
      reasons.push(term)
    }
  }

  const categoryPriority = { accesos: 15, clima: 8, normatividad: 6, aduana: 4 }
  const categoryScores = Object.entries(CATEGORY_TERMS).map(([category, terms]) => ({
    category,
    hits: terms.filter(term => text.includes(term)),
    weighted: terms.filter(term => text.includes(term)).length * 10 + (categoryPriority[category] || 0),
  })).sort((a, b) => b.weighted - a.weighted)

  const categoryMatch = categoryScores[0]
  score += Math.min(categoryMatch.hits.length * 6, 18)
  reasons.push(...categoryMatch.hits)

  if (item.source?.trusted) {
    score += 8
    reasons.push('fuente configurada como confiable')
  }
  if (item.publishedAt) {
    const ageHours = (Date.now() - Date.parse(item.publishedAt)) / 3_600_000
    if (ageHours <= 24) score += 8
    else if (ageHours > 168) score -= 10
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    category: categoryMatch.hits.length ? categoryMatch.category : 'sector',
    reasons: [...new Set(reasons)].slice(0, 8),
  }
}

export function editorialSummary(item, category) {
  const labels = {
    accesos: 'la movilidad y los accesos al recinto portuario',
    puerto: 'la actividad del Puerto de Manzanillo',
    aduana: 'los procesos aduaneros y el despacho de mercancías',
    transporte: 'el autotransporte y la operación logística',
    comercio_exterior: 'el comercio exterior y la cadena logística',
    clima: 'las condiciones meteorológicas que pueden afectar la operación',
    normatividad: 'la regulación aplicable al sector',
    empleo: 'el empleo en la comunidad logística-portuaria',
    sector: 'el ecosistema logístico-portuario',
  }
  return `Actualización relacionada con ${labels[category] || labels.sector}. Faro Portuario comparte la referencia para consulta directa y recomienda confirmar los detalles en la fuente original.`
}

export const EDITORIAL_STATUSES = Object.freeze(['draft', 'published', 'rejected'])

export function validateEditorialDecision(status, note = '') {
  if (!['published', 'rejected'].includes(status)) {
    return { valid: false, code: 'INVALID_STATUS', error: 'La decisión debe ser published o rejected.' }
  }
  if (status === 'rejected' && normalizeText(note).length < 5) {
    return { valid: false, code: 'REJECTION_NOTE_REQUIRED', error: 'Indica el motivo del rechazo.' }
  }
  return { valid: true, code: 'VALID' }
}

export function editorialDecisionPatch(status, note, reviewerId, now = new Date()) {
  const validation = validateEditorialDecision(status, note)
  if (!validation.valid) throw new Error(validation.code)
  const timestamp = now.toISOString()
  return {
    status,
    is_active: status === 'published',
    reviewed_by: reviewerId,
    reviewed_at: timestamp,
    updated_at: timestamp,
    published_at_portal: status === 'published' ? timestamp : null,
    rejection_reason: status === 'rejected' ? normalizeText(note).slice(0, 500) : null,
  }
}

export function prepareNewsRecord(item) {
  const relevance = scoreNewsItem(item)
  const publishThreshold = Number(process.env.NEWS_AUTO_PUBLISH_SCORE || 70)
  const rejectThreshold = Number(process.env.NEWS_REJECT_SCORE || 18)
  const isOfficial = isOfficialAutoPublishSource(item.source)
  const canAutoPublish = isOfficial && item.source?.trusted && item.source?.autoPublish && relevance.score >= publishThreshold
  const ageHours = item.publishedAt ? (Date.now() - Date.parse(item.publishedAt)) / 3_600_000 : 0
  const maxAgeHours = ['accesos', 'clima'].includes(relevance.category) ? 48 : 24 * 14
  const isStale = ageHours > maxAgeHours
  const status = isStale || relevance.score < rejectThreshold ? 'rejected' : canAutoPublish ? 'published' : 'draft'
  const canonicalUrl = canonicalizeUrl(item.url)
  const fingerprint = createHash('sha256')
    .update(`${item.source.id}|${canonicalUrl}|${normalizeText(item.title).toLowerCase()}`)
    .digest('hex')

  return {
    source_id: item.source.id,
    source_name: item.source.name,
    source_url: item.source.homepageUrl,
    canonical_url: canonicalUrl,
    external_id: item.externalId || null,
    fingerprint,
    title: normalizeText(item.title).slice(0, 300),
    editorial_summary: editorialSummary(item, relevance.category),
    category: relevance.category,
    relevance_score: relevance.score,
    relevance_reasons: relevance.reasons,
    status,
    is_active: true,
    image_url: item.source.allowsImage ? item.imageUrl || null : null,
    image_rights_note: item.source.allowsImage && item.imageUrl ? 'Uso permitido por el proveedor configurado.' : null,
    published_at_source: item.publishedAt,
    published_at_portal: status === 'published' ? new Date().toISOString() : null,
    expires_at: ['accesos', 'clima'].includes(relevance.category)
      ? new Date(Date.now() + 24 * 3_600_000).toISOString()
      : new Date(Date.now() + 14 * 24 * 3_600_000).toISOString(),
    rejection_reason: status === 'rejected'
      ? isStale ? 'Información fuera de la ventana de vigencia editorial.' : 'Relevancia insuficiente para Faro Portuario.'
      : null,
  }
}

async function fetchSource(source) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(source.feedUrl, {
      headers: {
        Accept: source.type === 'api' ? 'application/json' : 'application/rss+xml, application/atom+xml, application/xml',
        'User-Agent': 'FaroPortuarioEditorial/1.0 (+https://faroportuario.com)',
        ...(source.token ? { Authorization: `Bearer ${source.token}` } : {}),
      },
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Fuente respondió HTTP ${response.status}`)
    return source.type === 'api'
      ? parseApiFeed(await response.json(), source)
      : parseRssFeed(await response.text(), source)
  } finally {
    clearTimeout(timeout)
  }
}

async function saveSource(source, patch = {}) {
  return supabaseAdmin.from('port_news_sources').upsert({
    id: source.id,
    name: source.name,
    homepage_url: source.homepageUrl,
    feed_url: source.feedUrl,
    provider_type: source.type,
    is_enabled: true,
    is_trusted: Boolean(source.trusted),
    allows_image: Boolean(source.allowsImage),
    auto_publish: Boolean(source.autoPublish),
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...patch,
  }, { onConflict: 'id' })
}

export async function ingestNews() {
  const sources = configuredNewsSources()
  const stats = { sources: sources.length, discovered: 0, inserted: 0, drafts: 0, published: 0, rejected: 0, errors: [] }

  for (const source of sources) {
    try {
      const items = await fetchSource(source)
      stats.discovered += items.length
      const records = items.map(prepareNewsRecord)
      if (records.length) {
        const { data, error } = await supabaseAdmin.from('port_news')
          .upsert(records, { onConflict: 'fingerprint', ignoreDuplicates: true }).select('status')
        if (error) throw error
        for (const row of data || []) stats[row.status]++
        stats.inserted += data?.length || 0
      }
      await saveSource(source, { last_success_at: new Date().toISOString(), last_error: null })
    } catch (error) {
      stats.errors.push({ source: source.id, message: error.message })
      await saveSource(source, { last_error: error.message.slice(0, 500) }).catch(() => {})
    }
  }

  return stats
}
