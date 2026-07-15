import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalizeUrl,
  editorialDecisionPatch,
  isAllowedSource,
  isOfficialAutoPublishSource,
  parseRssFeed,
  prepareNewsRecord,
  scoreNewsItem,
  validateEditorialDecision,
} from '../src/services/newsEditorial.js'

const source = {
  id: 'official-test', name: 'Fuente oficial', homepageUrl: 'https://example.gob.mx',
  feedUrl: 'https://example.gob.mx/rss.xml', type: 'rss', trusted: true,
  autoPublish: false, allowsImage: false,
}

test('rechaza fuentes no HTTPS y destinos locales', () => {
  assert.equal(isAllowedSource(source), true)
  assert.equal(isAllowedSource({ ...source, feedUrl: 'http://example.com/rss' }), false)
  assert.equal(isAllowedSource({ ...source, feedUrl: 'https://localhost/rss' }), false)
  assert.equal(isAllowedSource({ ...source, feedUrl: 'https://192.168.1.7/rss' }), false)
})

test('autopublicación solo reconoce dominios oficiales permitidos', () => {
  assert.equal(isOfficialAutoPublishSource({ homepageUrl: 'https://www.puertomanzanillo.com.mx' }), true)
  assert.equal(isOfficialAutoPublishSource({ homepageUrl: 'https://anam.gob.mx' }), true)
  assert.equal(isOfficialAutoPublishSource({ homepageUrl: 'https://periodico.mx' }), false)
})

test('normaliza parámetros de rastreo para deduplicación', () => {
  assert.equal(canonicalizeUrl('https://medio.mx/a?utm_source=x&id=2#top'), 'https://medio.mx/a?id=2')
})

test('lee RSS solo como metadatos', () => {
  const xml = `<rss><channel><item><title>Actualización en el Puerto de Manzanillo</title><link>https://medio.mx/nota</link><description>Texto completo que no debe copiarse</description><pubDate>Tue, 14 Jul 2026 12:00:00 GMT</pubDate></item></channel></rss>`
  const [item] = parseRssFeed(xml, source)
  assert.equal(item.title, 'Actualización en el Puerto de Manzanillo')
  assert.equal(item.url, 'https://medio.mx/nota')
  assert.equal('description' in item, false)
})

test('prioriza Manzanillo y conserva borrador sin autopublicación explícita', () => {
  const item = { title: 'Cierre temporal en acceso al Puerto de Manzanillo', url: 'https://medio.mx/cierre', publishedAt: new Date().toISOString(), source }
  const result = scoreNewsItem(item)
  assert.ok(result.score >= 70)
  assert.equal(result.category, 'accesos')
  const record = prepareNewsRecord(item)
  assert.equal(record.status, 'draft')
  assert.match(record.editorial_summary, /fuente original/i)
  assert.equal(record.image_url, null)
})

test('solo una fuente oficial habilitada puede publicar automáticamente', () => {
  const official = {
    ...source,
    homepageUrl: 'https://www.puertomanzanillo.com.mx',
    feedUrl: 'https://www.puertomanzanillo.com.mx/rss.xml',
    autoPublish: true,
  }
  const item = { title: 'Cierre temporal en acceso al Puerto de Manzanillo', url: 'https://www.puertomanzanillo.com.mx/aviso', publishedAt: new Date().toISOString(), source: official }
  assert.equal(prepareNewsRecord(item).status, 'published')
  const stale = { ...item, publishedAt: new Date(Date.now() - 72 * 3_600_000).toISOString() }
  assert.equal(prepareNewsRecord(stale).status, 'rejected')
})

test('valida las decisiones editoriales permitidas', () => {
  assert.equal(validateEditorialDecision('published').valid, true)
  assert.equal(validateEditorialDecision('draft').code, 'INVALID_STATUS')
  assert.equal(validateEditorialDecision('rejected', '').code, 'REJECTION_NOTE_REQUIRED')
  assert.equal(validateEditorialDecision('rejected', 'La fuente no confirma el cierre.').valid, true)
})

test('la decisión editorial deja trazabilidad y controla visibilidad', () => {
  const now = new Date('2026-07-14T20:00:00.000Z')
  const published = editorialDecisionPatch('published', '', 'reviewer-1', now)
  assert.equal(published.is_active, true)
  assert.equal(published.published_at_portal, now.toISOString())
  assert.equal(published.reviewed_by, 'reviewer-1')
  const rejected = editorialDecisionPatch('rejected', 'Contenido duplicado', 'reviewer-1', now)
  assert.equal(rejected.is_active, false)
  assert.equal(rejected.rejection_reason, 'Contenido duplicado')
})
