import { randomUUID } from 'crypto'
import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { normalizeBearerToken } from '../security/catalog.js'
import { moderateCommunityContent } from '../services/communityModeration.js'
import {
  COMMUNITY_MEDIA_BUCKET, extensionFor, ownsStoragePath,
  validateCommentInput, validatePostInput, validateUploadRequest,
} from '../services/communityPolicy.js'

const router = Router()

async function optionalUser(req) {
  const token = normalizeBearerToken(req.headers.authorization)
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

async function requireCommunityAccount(req, res, next) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles').select('id, full_name, username, account_kind, account_type, is_verified, is_banned')
    .eq('id', req.user.id).single()
  if (error || !profile) return res.status(403).json({ error: 'Completa tu registro para participar en la comunidad.' })
  if (profile.is_banned) return res.status(403).json({ error: 'Esta cuenta no puede publicar en la comunidad.' })
  req.communityProfile = profile
  next()
}

async function requireCommunityModerator(req, res, next) {
  const [{ data: allowed }, { data: profile }] = await Promise.all([
    supabaseAdmin.rpc('has_permission', { p_user_id: req.user.id, p_permission: 'moderation.manage' }),
    supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).maybeSingle(),
  ])
  if (!allowed && !['admin', 'moderador'].includes(profile?.role)) {
    return res.status(403).json({ error: 'Sin permisos de moderación.' })
  }
  next()
}

async function ensureApprovedPost(postId) {
  const { data } = await supabaseAdmin.from('community_posts').select('id')
    .eq('id', postId).eq('status', 'approved').is('deleted_at', null).maybeSingle()
  return Boolean(data)
}

async function signedMedia(media = [], expiresIn = 3600) {
  return Promise.all(media.map(async (item) => {
    const { data } = await supabaseAdmin.storage.from(COMMUNITY_MEDIA_BUCKET)
      .createSignedUrl(item.storage_path, expiresIn)
    return { id: item.id, url: data?.signedUrl || null, storagePath: item.storage_path, altText: item.alt_text, sortOrder: item.sort_order }
  }))
}

function shapePost(post, viewerId, media) {
  const reactions = post.reactions || []
  return {
    id: post.id, body: post.body, status: post.status,
    moderationReason: post.author_id === viewerId ? post.moderation_reason : null,
    createdAt: post.created_at, updatedAt: post.updated_at,
    isEdited: Boolean(post.edited_at), isMine: post.author_id === viewerId,
    author: {
      id: post.author?.id, name: post.author?.full_name || post.author?.username || 'Miembro de Faro',
      username: post.author?.username, accountKind: post.author?.account_kind,
      verified: Boolean(post.author?.is_verified),
    },
    media: media.filter((item) => item.url).map((item) => ({
      id: item.id, url: item.url, altText: item.altText, sortOrder: item.sortOrder,
      ...(post.author_id === viewerId ? { storagePath: item.storagePath } : {}),
    })).sort((a, b) => a.sortOrder - b.sortOrder),
    likes: reactions.length, likedByMe: reactions.some((item) => item.user_id === viewerId),
    comments: post.comments?.filter((item) => item.status === 'approved' && !item.deleted_at).length || 0,
  }
}

async function runPostModeration(postId, body, imagePaths, moderatorId = null) {
  const images = await Promise.all(imagePaths.map(async (storagePath) => {
    const { data } = await supabaseAdmin.storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUrl(storagePath, 300)
    return { url: data?.signedUrl }
  }))
  const result = await moderateCommunityContent({ text: body, images: images.filter((item) => item.url) })
  const reviewed = result.status !== 'pending_review'
  await supabaseAdmin.from('community_posts').update({
    status: result.status,
    moderation_reason: result.reason,
    moderation_provider: result.provider,
    moderated_at: reviewed ? new Date().toISOString() : null,
    moderated_by: moderatorId,
  }).eq('id', postId)
  await supabaseAdmin.from('community_moderation_events').insert({
    post_id: postId, reviewer_id: moderatorId, decision: result.status,
    provider: result.provider, categories: result.categories, reason: result.reason,
    provider_payload: { providerStatus: result.providerStatus },
  })
  return result
}

// Feed público. Una sesión activa también ve sus propias publicaciones pendientes.
router.get('/', async (req, res) => {
  try {
    const viewer = await optionalUser(req)
    let query = supabaseAdmin.from('community_posts').select(`
      id, author_id, body, status, moderation_reason, created_at, updated_at, edited_at,
      author:profiles!community_posts_author_id_fkey(id, full_name, username, account_kind, is_verified),
      media:community_media(id, storage_path, alt_text, sort_order),
      reactions:community_reactions(user_id), comments:community_comments(id, status, deleted_at)
    `).is('deleted_at', null).order('created_at', { ascending: false }).limit(40)
    query = viewer
      ? query.or(`status.eq.approved,and(author_id.eq.${viewer.id},status.in.(pending_review,rejected))`)
      : query.eq('status', 'approved')
    const { data, error } = await query
    if (error) throw error
    const items = await Promise.all((data || []).map(async (post) =>
      shapePost(post, viewer?.id, await signedMedia(post.media))))
    res.json({ items })
  } catch (error) {
    console.error('[community/feed]', error.message)
    res.status(500).json({ error: 'No fue posible cargar la comunidad.' })
  }
})

router.post('/uploads/ticket', requireAuth, requireCommunityAccount, async (req, res) => {
  const valid = validateUploadRequest(req.body)
  if (valid.error) return res.status(400).json({ error: valid.error })
  const path = `${req.user.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extensionFor(valid.contentType)}`
  const { data, error } = await supabaseAdmin.storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUploadUrl(path)
  if (error) return res.status(500).json({ error: 'No fue posible preparar la fotografía.' })
  res.status(201).json({ path, token: data.token, bucket: COMMUNITY_MEDIA_BUCKET })
})

router.post('/', requireAuth, requireCommunityAccount, async (req, res) => {
  const valid = validatePostInput(req.body)
  if (valid.error) return res.status(400).json({ error: valid.error })
  if (!valid.imagePaths.every((path) => ownsStoragePath(req.user.id, path))) {
    return res.status(400).json({ error: 'Una fotografía no pertenece a tu cuenta.' })
  }
  try {
    const { data: post, error } = await supabaseAdmin.from('community_posts')
      .insert({ author_id: req.user.id, body: valid.body, status: 'pending_review' }).select().single()
    if (error) throw error
    if (valid.imagePaths.length) {
      const { error: mediaError } = await supabaseAdmin.from('community_media').insert(
        valid.imagePaths.map((storagePath, index) => ({ post_id: post.id, storage_path: storagePath, sort_order: index })))
      if (mediaError) throw mediaError
    }
    const moderation = await runPostModeration(post.id, valid.body, valid.imagePaths)
    res.status(201).json({ id: post.id, status: moderation.status, message: moderation.status === 'approved' ? 'Publicación visible.' : moderation.status === 'rejected' ? 'La publicación fue bloqueada por seguridad.' : 'Publicación enviada a revisión.' })
  } catch (error) {
    console.error('[community/create]', error.message)
    res.status(500).json({ error: 'No fue posible guardar la publicación.' })
  }
})

router.get('/:id/comments', async (req, res) => {
  try {
    if (!await ensureApprovedPost(req.params.id)) return res.status(404).json({ error: 'Publicación no encontrada.' })
    const { data, error } = await supabaseAdmin.from('community_comments').select(`
      id, body, created_at, author_id,
      author:profiles!community_comments_author_id_fkey(id, full_name, username, is_verified)
    `).eq('post_id', req.params.id).eq('status', 'approved').is('deleted_at', null)
      .order('created_at', { ascending: true }).limit(100)
    if (error) throw error
    res.json({ items: (data || []).map((item) => ({
      id: item.id, body: item.body, createdAt: item.created_at, authorId: item.author_id,
      author: { name: item.author?.full_name || item.author?.username || 'Miembro de Faro', verified: Boolean(item.author?.is_verified) },
    })) })
  } catch {
    res.status(500).json({ error: 'No fue posible cargar los comentarios.' })
  }
})

router.post('/:id/comments', requireAuth, requireCommunityAccount, async (req, res) => {
  const valid = validateCommentInput(req.body)
  if (valid.error) return res.status(400).json({ error: valid.error })
  if (!await ensureApprovedPost(req.params.id)) return res.status(404).json({ error: 'Publicación no encontrada.' })
  const moderation = await moderateCommunityContent({ text: valid.body, images: [] })
  try {
    const { data, error } = await supabaseAdmin.from('community_comments').insert({
      post_id: req.params.id, author_id: req.user.id, body: valid.body,
      status: moderation.status, moderation_reason: moderation.reason,
    }).select('id, status').single()
    if (error) throw error
    res.status(201).json({ ...data, message: data.status === 'approved' ? 'Comentario publicado.' : 'Comentario enviado a revisión.' })
  } catch {
    res.status(500).json({ error: 'No fue posible guardar el comentario.' })
  }
})

router.delete('/comments/:commentId', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('community_comments')
    .update({ deleted_at: new Date().toISOString() }).eq('id', req.params.commentId)
    .eq('author_id', req.user.id).is('deleted_at', null).select('id')
  if (error) return res.status(500).json({ error: 'No fue posible eliminar el comentario.' })
  if (!data?.length) return res.status(404).json({ error: 'Comentario no encontrado.' })
  res.status(204).end()
})

router.post('/:id/like', requireAuth, requireCommunityAccount, async (req, res) => {
  if (!await ensureApprovedPost(req.params.id)) return res.status(404).json({ error: 'Publicación no encontrada.' })
  const { data: existing } = await supabaseAdmin.from('community_reactions').select('id')
    .eq('post_id', req.params.id).eq('user_id', req.user.id).maybeSingle()
  if (existing) {
    await supabaseAdmin.from('community_reactions').delete().eq('id', existing.id)
    return res.json({ liked: false })
  }
  const { error } = await supabaseAdmin.from('community_reactions').insert({ post_id: req.params.id, user_id: req.user.id })
  if (error) return res.status(500).json({ error: 'No fue posible registrar la reacción.' })
  res.status(201).json({ liked: true })
})

router.post('/:id/reports', requireAuth, requireCommunityAccount, async (req, res) => {
  if (!await ensureApprovedPost(req.params.id)) return res.status(404).json({ error: 'Publicación no encontrada.' })
  const reason = String(req.body.reason || '').trim()
  const allowed = ['sensitive', 'sexual', 'violence', 'exploitation', 'harassment', 'spam', 'misinformation', 'other']
  if (!allowed.includes(reason)) return res.status(400).json({ error: 'Selecciona un motivo válido.' })
  const { error } = await supabaseAdmin.from('community_reports').upsert({
    post_id: req.params.id, reporter_id: req.user.id, reason, details: String(req.body.details || '').trim().slice(0, 500),
  }, { onConflict: 'post_id,reporter_id' })
  if (error) return res.status(500).json({ error: 'No fue posible enviar el reporte.' })
  res.status(201).json({ message: 'Gracias. Revisaremos esta publicación.' })
})

router.patch('/:id', requireAuth, requireCommunityAccount, async (req, res) => {
  const valid = validatePostInput(req.body)
  if (valid.error) return res.status(400).json({ error: valid.error })
  if (!valid.imagePaths.every((path) => ownsStoragePath(req.user.id, path))) return res.status(400).json({ error: 'Fotografía inválida.' })
  const { data: post, error } = await supabaseAdmin.from('community_posts').update({
    body: valid.body, status: 'pending_review', moderation_reason: 'Contenido editado; requiere nueva revisión.',
    edited_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', req.params.id).eq('author_id', req.user.id).is('deleted_at', null).select('id').maybeSingle()
  if (error || !post) return res.status(404).json({ error: 'Publicación no encontrada.' })
  await supabaseAdmin.from('community_media').delete().eq('post_id', post.id)
  if (valid.imagePaths.length) await supabaseAdmin.from('community_media').insert(valid.imagePaths.map((storagePath, index) => ({ post_id: post.id, storage_path: storagePath, sort_order: index })))
  const moderation = await runPostModeration(post.id, valid.body, valid.imagePaths)
  res.json({ id: post.id, status: moderation.status, message: 'Cambios guardados y enviados a revisión.' })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('community_posts')
    .update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id)
    .eq('author_id', req.user.id).is('deleted_at', null).select('id')
  if (error) return res.status(500).json({ error: 'No fue posible eliminar la publicación.' })
  if (!data?.length) return res.status(404).json({ error: 'Publicación no encontrada.' })
  res.status(204).end()
})

router.get('/moderation/queue', requireAuth, requireCommunityModerator, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('community_posts').select('*, media:community_media(*)')
    .eq('status', 'pending_review').is('deleted_at', null).order('created_at').limit(100)
  if (error) return res.status(500).json({ error: 'No fue posible cargar la cola.' })
  const items = await Promise.all((data || []).map(async (post) => ({ ...post, media: await signedMedia(post.media, 900) })))
  res.json({ items })
})

router.patch('/moderation/:id', requireAuth, requireCommunityModerator, async (req, res) => {
  const status = req.body.status
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Decisión inválida.' })
  const reason = String(req.body.reason || '').trim()
  const { data, error } = await supabaseAdmin.from('community_posts').update({
    status, moderation_reason: reason || null, moderated_by: req.user.id, moderated_at: new Date().toISOString(),
  }).eq('id', req.params.id).eq('status', 'pending_review').select('id').maybeSingle()
  if (error || !data) return res.status(404).json({ error: 'Publicación pendiente no encontrada.' })
  await supabaseAdmin.from('community_moderation_events').insert({
    post_id: data.id, reviewer_id: req.user.id, decision: status, provider: 'manual', reason: reason || null,
  })
  res.json({ id: data.id, status })
})

router.get('/admin/moderation/comments', requireAuth, requireCommunityModerator, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('community_comments').select(`
    id, post_id, author_id, body, moderation_reason, created_at,
    author:profiles!community_comments_author_id_fkey(id, full_name, username)
  `).eq('status', 'pending_review').is('deleted_at', null).order('created_at').limit(100)
  if (error) return res.status(500).json({ error: 'No fue posible cargar los comentarios pendientes.' })
  res.json({ items: data || [] })
})

router.patch('/admin/moderation/comments/:id', requireAuth, requireCommunityModerator, async (req, res) => {
  const status = req.body.status
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Decisión inválida.' })
  const { data, error } = await supabaseAdmin.from('community_comments').update({
    status, moderation_reason: String(req.body.reason || '').trim() || null, updated_at: new Date().toISOString(),
  }).eq('id', req.params.id).eq('status', 'pending_review').select('id').maybeSingle()
  if (error || !data) return res.status(404).json({ error: 'Comentario pendiente no encontrado.' })
  res.json({ id: data.id, status })
})

export default router
