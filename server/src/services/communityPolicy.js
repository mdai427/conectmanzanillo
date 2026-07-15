const ALLOWED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_POST_IMAGES = 4
const MAX_POST_LENGTH = 2_000
const MAX_COMMENT_LENGTH = 500

export const COMMUNITY_MEDIA_BUCKET = 'community-media'

export function validateUploadRequest(input = {}) {
  const contentType = String(input.contentType || '').toLowerCase()
  const sizeBytes = Number(input.sizeBytes)
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) return { error: 'Usa una imagen JPG, PNG o WebP.' }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_BYTES) {
    return { error: 'Cada imagen debe pesar máximo 5 MB.' }
  }
  return { contentType, sizeBytes }
}
export function validatePostInput(input = {}) {
  const body = String(input.body || '').trim()
  const imagePaths = Array.isArray(input.imagePaths) ? [...new Set(input.imagePaths)] : []
  if (!body && imagePaths.length === 0) return { error: 'Escribe algo o agrega una fotografía.' }
  if (body.length > MAX_POST_LENGTH) return { error: 'La publicación admite máximo 2,000 caracteres.' }
  if (imagePaths.length > MAX_POST_IMAGES) return { error: 'Puedes agregar hasta 4 fotografías.' }
  return { body, imagePaths }
}

export function validateCommentInput(input = {}) {
  const body = String(input.body || '').trim()
  if (!body) return { error: 'Escribe un comentario.' }
  if (body.length > MAX_COMMENT_LENGTH) return { error: 'El comentario admite máximo 500 caracteres.' }
  return { body }
}

export function ownsStoragePath(userId, storagePath) {
  return typeof storagePath === 'string'
    && storagePath.startsWith(`${userId}/`)
    && !storagePath.includes('..')
    && /^[a-zA-Z0-9/_\-.]+$/.test(storagePath)
}

export function extensionFor(contentType) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[contentType]
}
