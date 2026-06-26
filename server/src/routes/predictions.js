import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../config/supabase.js'
import rateLimit from 'express-rate-limit'

const router = Router()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const predictLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes de predicción' },
})

// In-memory cache — TTL 15 min
let predCache = null
let predCacheAt = 0
const CACHE_TTL = 15 * 60 * 1000

// GET /api/predictions
router.get('/', predictLimit, async (_req, res) => {
  try {
    if (predCache && Date.now() - predCacheAt < CACHE_TTL) {
      return res.json({ ...predCache, cached: true })
    }

    const [{ data: sections }, { data: recentReports }] = await Promise.all([
      supabaseAdmin
        .from('sections')
        .select('slug, name, section_status_cache(current_status, active_reports)')
        .eq('is_active', true)
        .order('sort_order'),
      supabaseAdmin
        .from('reports')
        .select('section_id, status, created_at, sections(name, slug)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    const now = new Date()
    const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mazatlan' })
    const diaSemana = now.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Mazatlan' })
    const horaNum = parseInt(now.toLocaleString('es-MX', { hour: 'numeric', hour12: false, timeZone: 'America/Mazatlan' }))

    const sectionStatus = (sections || []).map(s => ({
      slug: s.slug,
      name: s.name,
      status: s.section_status_cache?.current_status || 'unknown',
      reports: s.section_status_cache?.active_reports || 0,
    }))

    const reportsByZone = {}
    for (const r of (recentReports || [])) {
      const slug = r.sections?.slug || 'unknown'
      const name = r.sections?.name || 'Desconocida'
      if (!reportsByZone[slug]) reportsByZone[slug] = { name, statuses: [] }
      reportsByZone[slug].statuses.push(r.status)
    }

    const historyLines = Object.values(reportsByZone).map(z => {
      const counts = z.statuses.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
      return `• ${z.name}: ${Object.entries(counts).map(([s, c]) => `${s}×${c}`).join(', ')}`
    }).join('\n') || 'Sin datos históricos de las últimas 24h'

    const prompt = `Eres el sistema de predicción inteligente del Puerto de Manzanillo, Colima, México.

HORA ACTUAL: ${hora} · ${diaSemana} · Hora del día: ${horaNum}h

ESTADO ACTUAL DE LAS ZONAS:
${sectionStatus.map(s => `• ${s.name} [${s.slug}]: ${s.status} (${s.reports} reportes activos)`).join('\n')}

HISTORIAL ÚLTIMAS 24H:
${historyLines}

CONTEXTO PORTUARIO:
- El puerto opera 24/7 pero con picos de actividad: 6-10h, 14-18h, y madrugadas ocasionales
- Lunes y viernes suelen tener más congestión
- La zona de acceso principal (puerta de entrada) es el cuello de botella más común

Genera predicciones de congestión para las próximas horas basándote en el estado actual, historial y patrones típicos portuarios.

Responde SOLO con JSON válido, sin texto adicional:
{
  "hora_prediccion": "${hora}",
  "dia": "${diaSemana}",
  "resumen": "frase corta del estado general del puerto en este momento",
  "predicciones": [
    {
      "slug": "slug-exacto-de-la-zona",
      "nombre": "Nombre de la zona",
      "estado_actual": "estado actual",
      "pred_30min": "free|moderate|congested|closed",
      "pred_1hr": "free|moderate|congested|closed",
      "pred_2hr": "free|moderate|congested|closed",
      "confianza": 75,
      "tip": "Consejo práctico de 1 línea para el operador"
    }
  ],
  "mejor_momento": "Frase sobre cuándo conviene más entrar al puerto hoy",
  "hora_pico": "Hora de mayor congestión esperada hoy"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].text.trim()
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')

    const result = JSON.parse(jsonMatch[0])
    predCache = result
    predCacheAt = Date.now()

    res.json({ ...result, cached: false, generado_at: new Date().toISOString() })
  } catch (err) {
    console.error('Predictions error:', err.message)
    if (predCache) return res.json({ ...predCache, cached: true, stale: true })
    res.status(500).json({ error: 'Error al generar predicciones' })
  }
})

// POST /api/predictions/invalidate (admin only — clear cache)
router.post('/invalidate', (_req, res) => {
  predCache = null
  predCacheAt = 0
  res.json({ ok: true })
})

export default router
