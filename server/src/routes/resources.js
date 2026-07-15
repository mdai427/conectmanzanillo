import { Router } from 'express'
import { access } from 'fs/promises'
import { constants } from 'fs'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'
import {
  RESOURCE_CATALOG,
  absoluteResourcePath,
  findResource,
  publicResource,
} from '../services/resourceCatalog.js'

const router = Router()

router.get('/', (req, res) => {
  const library = req.query.library
  const resources = library
    ? RESOURCE_CATALOG.filter((resource) => resource.library === library)
    : RESOURCE_CATALOG

  res.json({
    resources: resources.map(publicResource),
    access: {
      price: 0,
      requiresRegistration: true,
      message: 'Las descargas son gratuitas para usuarios registrados.',
    },
    reviewedAt: '2026-07-14',
  })
})

router.get('/:id/download', requireAuth, async (req, res) => {
  const resource = findResource(req.params.id)
  if (!resource) return res.status(404).json({ error: 'Recurso no encontrado' })

  try {
    const filePath = absoluteResourcePath(resource)
    await access(filePath, constants.R_OK)

    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': resource.mime,
      'X-Content-Type-Options': 'nosniff',
    })

    supabaseAdmin
      .from('resource_downloads')
      .insert({ user_id: req.user.id, resource_id: resource.id, file_format: resource.format })
      .then(({ error }) => {
        if (error) console.warn('[resources/download-log]', error.message)
      })
      .catch((error) => console.warn('[resources/download-log]', error.message))

    return res.download(filePath, resource.downloadName, (error) => {
      if (error && !res.headersSent) {
        console.error('[resources/download]', error.message)
        res.status(500).json({ error: 'No fue posible preparar la descarga' })
      }
    })
  } catch (error) {
    console.error('[resources/download]', error.message)
    return res.status(503).json({ error: 'El archivo no está disponible temporalmente' })
  }
})

export default router
