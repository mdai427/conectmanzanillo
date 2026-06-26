/**
 * Workers — handlers registrados en cada queue.
 * Se inicializan una vez al arrancar el servidor.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../config/supabase.js'
import { reportQueue, predQueue, maintenanceQueue } from './queue.js'
import { invalidateRankingsCache } from '../routes/rankings.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── 1. Recalcular section_status_cache tras un reporte ──────────────────────
reportQueue.process('recalculate_status', async ({ section_id }) => {
  // Obtener todos los reportes activos y vigentes de la sección
  const { data: reports, error } = await supabaseAdmin
    .from('reports')
    .select('status, weight, created_at')
    .eq('section_id', section_id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  if (!reports || reports.length === 0) {
    // Sin reportes activos → libre
    await supabaseAdmin
      .from('section_status_cache')
      .upsert({ section_id, current_status: 'free', active_reports: 0, confidence: 0, last_calculated: new Date().toISOString() }, { onConflict: 'section_id' })
    return
  }

  // Calcular estado ponderado por peso y recencia
  const weights = { free: 0, moderate: 0, congested: 0, closed: 0 }
  const now = Date.now()

  for (const r of reports) {
    const ageMinutes = (now - new Date(r.created_at).getTime()) / 60000
    const recencyFactor = Math.max(0.2, 1 - ageMinutes / 180) // decae en 3h
    const w = (r.weight || 1) * recencyFactor
    if (weights[r.status] !== undefined) weights[r.status] += w
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const dominant = Object.entries(weights).sort(([, a], [, b]) => b - a)[0][0]
  const confidence = totalWeight > 0 ? Math.round((weights[dominant] / totalWeight) * 100) : 0

  await supabaseAdmin
    .from('section_status_cache')
    .upsert({
      section_id,
      current_status: dominant,
      active_reports: reports.length,
      confidence,
      last_report_at: reports[0].created_at,
      last_calculated: new Date().toISOString(),
    }, { onConflict: 'section_id' })
})

// ── 2. Actualizar puntos y reputación del usuario ───────────────────────────
reportQueue.process('update_user_points', async ({ user_id, status }) => {
  const puntos = status === 'congested' ? 10 : status === 'closed' ? 15 : 5

  // Intentar RPC primero, fallback a UPDATE directo
  const { error: rpcError } = await supabaseAdmin.rpc('increment_user_points', {
    p_user_id: user_id,
    p_puntos: puntos,
  })

  if (rpcError) {
    // Fallback: incremento directo
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('puntos, total_reportes').eq('id', user_id).single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({
          puntos: (profile.puntos || 0) + puntos,
          total_reportes: (profile.total_reportes || 0) + 1,
        })
        .eq('id', user_id)
        .throwOnError()
    }
  }

  invalidateRankingsCache()
})

// ── 3. Refrescar predicciones IA en background ──────────────────────────────
let predCache = null
let predCacheAt = 0
export const PRED_TTL = 15 * 60 * 1000

export function getPredCache() { return { predCache, predCacheAt } }
export function setPredCache(data) { predCache = data; predCacheAt = Date.now() }

predQueue.process('refresh_predictions', async () => {
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
    slug: s.slug, name: s.name,
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

Genera predicciones de congestión para las próximas horas.

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

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1400,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].text.trim()
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in AI response')

  setPredCache(JSON.parse(jsonMatch[0]))
  console.log('[workers] Predicciones actualizadas en background')
})

// ── 4. Limpieza de reportes expirados ───────────────────────────────────────
maintenanceQueue.process('expire_reports', async () => {
  const { error, count } = await supabaseAdmin
    .from('reports')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)
    .select('id', { count: 'exact', head: true })

  if (error) throw error
  if (count > 0) console.log(`[workers] ${count} reportes expirados`)
})

export function initWorkers() {
  console.log('[workers] Workers inicializados')
}
