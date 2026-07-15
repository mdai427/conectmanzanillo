import test from 'node:test'
import assert from 'node:assert/strict'
import { localSafetyScreen, moderateCommunityContent } from '../src/services/communityModeration.js'
import { ownsStoragePath, validatePostInput, validateUploadRequest } from '../src/services/communityPolicy.js'

test('sin proveedor una publicación nunca se aprueba automáticamente', async () => {
  const result = await moderateCommunityContent(
    { text: 'Busco recomendaciones para transporte de carga.', images: [{ url: 'signed-private-url' }] },
    { env: {}, fetchImpl: async () => { throw new Error('no debe llamarse') } },
  )
  assert.equal(result.status, 'pending_review')
  assert.equal(result.providerStatus, 'not_configured')
})
test('un fallo del proveedor conserva la publicación pendiente', async () => {
  const result = await moderateCommunityContent(
    { text: 'Contenido ordinario', images: [] },
    { env: { COMMUNITY_MODERATION_PROVIDER: 'webhook', COMMUNITY_MODERATION_URL: 'https://moderation.invalid' }, fetchImpl: async () => { throw new Error('timeout') } },
  )
  assert.equal(result.status, 'pending_review')
  assert.equal(result.providerStatus, 'error')
})

test('el proveedor puede aprobar solo mediante una respuesta segura explícita', async () => {
  const result = await moderateCommunityContent(
    { text: 'Contenido profesional', images: [] },
    {
      env: { COMMUNITY_MODERATION_PROVIDER: 'webhook', COMMUNITY_MODERATION_URL: 'https://moderation.example' },
      fetchImpl: async () => ({ ok: true, json: async () => ({ safe: true, categories: {} }) }),
    },
  )
  assert.equal(result.status, 'approved')
})

test('el proveedor bloquea gore y contenido sexual', async () => {
  const result = await moderateCommunityContent(
    { text: 'contenido', images: [] },
    {
      env: { COMMUNITY_MODERATION_PROVIDER: 'webhook', COMMUNITY_MODERATION_URL: 'https://moderation.example' },
      fetchImpl: async () => ({ ok: true, json: async () => ({ safe: false, categories: { death_gore: true, sexual: true } }) }),
    },
  )
  assert.equal(result.status, 'rejected')
  assert.deepEqual(result.categories, ['death_gore', 'sexual'])
})

test('la política local bloquea datos personales sensibles obvios', () => {
  assert.equal(localSafetyScreen('Comparto expediente clínico del operador').blocked, true)
  assert.equal(localSafetyScreen('Reporte normal de una ruta logística').blocked, false)
})

test('limita publicaciones a cuatro fotos y rutas propias', () => {
  assert.ok(validatePostInput({ body: '', imagePaths: ['1', '2', '3', '4', '5'] }).error)
  assert.equal(ownsStoragePath('user-1', 'user-1/2026-07-14/photo.jpg'), true)
  assert.equal(ownsStoragePath('user-1', 'user-2/photo.jpg'), false)
  assert.equal(ownsStoragePath('user-1', 'user-1/../secret.jpg'), false)
})

test('solo acepta imágenes seguras de hasta 5 MB', () => {
  assert.equal(validateUploadRequest({ contentType: 'image/jpeg', sizeBytes: 5000 }).error, undefined)
  assert.ok(validateUploadRequest({ contentType: 'image/svg+xml', sizeBytes: 5000 }).error)
  assert.ok(validateUploadRequest({ contentType: 'image/png', sizeBytes: 6 * 1024 * 1024 }).error)
})
