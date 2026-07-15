import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import {
  EDITORIAL_STATUSES,
  editorialDecisionPatch,
  ingestNews,
  validateEditorialDecision,
} from '../services/newsEditorial.js'

const router = Router()
const CATEGORIES = new Set(['accesos', 'puerto', 'aduana', 'transporte', 'comercio_exterior', 'clima', 'normatividad', 'empleo', 'sector'])

router.get('/', async (req, res) => {
  try {
    const category = CATEGORIES.has(req.query.category) ? req.query.category : null
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60)
    let query = supabaseAdmin.from('port_news')
      .select('id,title,editorial_summary,category,relevance_score,canonical_url,source_name,source_url,image_url,published_at_source,published_at_portal')
      .eq('status', 'published')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('published_at_portal', { ascending: false })
      .order('relevance_score', { ascending: false })
      .limit(limit)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    res.json({
      items: data || [],
      editorialPolicy: 'Faro Portuario publica metadatos, un resumen propio y el enlace a la fuente original.',
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[news/public]', error.message)
    res.status(503).json({ error: 'Las noticias no están disponibles temporalmente.' })
  }
})

router.use('/admin', requireAuth, requirePermission('content.manage'))

router.get('/admin/items', async (req, res) => {
  try {
    const status = EDITORIAL_STATUSES.includes(req.query.status) ? req.query.status : 'draft'
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const { data, error } = await supabaseAdmin.from('port_news')
      .select('id,title,editorial_summary,category,relevance_score,relevance_reasons,status,canonical_url,source_name,source_url,published_at_source,published_at_portal,ingested_at,expires_at,rejection_reason')
      .eq('status', status)
      .order('ingested_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    res.set('Cache-Control', 'private, no-store')
    res.json({ items: data || [], status })
  } catch (error) {
    console.error('[news/admin/list]', error.message)
    res.status(500).json({ error: 'No fue posible consultar la bandeja editorial.' })
  }
})

router.post('/admin/ingest', async (_req, res) => {
  try {
    const result = await ingestNews()
    res.status(202).json({ message: 'Búsqueda editorial finalizada.', ...result })
  } catch (error) {
    console.error('[news/admin/ingest]', error.message)
    res.status(503).json({ error: 'No fue posible ejecutar la búsqueda editorial.' })
  }
})

router.patch('/admin/items/:id/status', async (req, res) => {
  const { status, note = '' } = req.body || {}
  const validation = validateEditorialDecision(status, note)
  if (!validation.valid) return res.status(400).json({ error: validation.error, code: validation.code })

  try {
    const { data: current, error: readError } = await supabaseAdmin.from('port_news')
      .select('id,status,expires_at').eq('id', req.params.id).maybeSingle()
    if (readError) throw readError
    if (!current) return res.status(404).json({ error: 'Noticia no encontrada.' })
    if (status === 'published' && current.expires_at && Date.parse(current.expires_at) <= Date.now()) {
      return res.status(409).json({ error: 'La noticia perdió vigencia; vuelve a validar la fuente antes de publicarla.', code: 'NEWS_EXPIRED' })
    }

    const patch = editorialDecisionPatch(status, note, req.user.id)
    const { data, error } = await supabaseAdmin.from('port_news')
      .update(patch).eq('id', req.params.id)
      .select('id,title,status,reviewed_at,rejection_reason,published_at_portal').single()
    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('[news/admin/decision]', error.message)
    res.status(500).json({ error: 'No fue posible guardar la decisión editorial.' })
  }
})

export default router
