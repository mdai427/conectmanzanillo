import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../config/supabase.js'
import rateLimit from 'express-rate-limit'

const router = Router()

const chatLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 minuto
  max: 10,               // máx 10 mensajes por minuto por IP
  message: { error: 'Demasiados mensajes. Espera un momento.' },
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Niveles de reputación para contexto de IA
const NIVELES = {
  nuevo: 'Nuevo', colaborador: 'Colaborador', experto: 'Experto',
  premium: 'Premium', embajador: 'Embajador', elite: 'Operador Elite',
}

// POST /api/chat
router.post('/', chatLimit, async (req, res) => {
  const { messages = [], userContext } = req.body

  if (!messages.length) return res.status(400).json({ error: 'Sin mensajes' })
  if (messages.length > 20) return res.status(400).json({ error: 'Conversación muy larga' })

  // Sanitizar mensajes del usuario
  const sanitized = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }))

  try {
    // Obtener estado actual del puerto desde Supabase
    const { data: sections } = await supabaseAdmin
      .from('sections')
      .select('name, slug, status, active_reports, description')
      .eq('is_active', true)
      .order('sort_order')

    const { data: alerts } = await supabaseAdmin
      .from('emergency_alerts')
      .select('message, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3)

    const { data: recentReports } = await supabaseAdmin
      .from('reports')
      .select(`
        status, comment, created_at,
        sections(name),
        profiles(username)
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Construir contexto del puerto
    const STATUS_ES = {
      free: '🟢 Libre / Fluido',
      moderate: '🟡 Moderado / Espera media',
      congested: '🔴 Saturado / Fila larga',
      closed: '⚫ Cerrado',
      unknown: '⚪ Sin reportes',
    }

    const portoStatus = (sections || []).map(s =>
      `• ${s.name}: ${STATUS_ES[s.status] || '⚪ Sin datos'} (${s.active_reports || 0} reportes activos)`
    ).join('\n')

    const alertasActivas = (alerts || []).length
      ? alerts.map(a => `⚠️ ${a.message}`).join('\n')
      : 'Sin alertas activas.'

    const reportesRecientes = (recentReports || []).map(r =>
      `• ${r.sections?.name || 'Zona'}: ${STATUS_ES[r.status] || r.status}${r.comment ? ` — "${r.comment}"` : ''} (${r.profiles?.username || 'Anónimo'})`
    ).join('\n')

    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mazatlan' })
    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mazatlan' })

    const systemPrompt = `Eres el Asistente de Inteligencia Portuaria de ConectManzanillo — la plataforma colaborativa del Puerto de Manzanillo, Colima, México.

Tu misión: dar información útil, clara y directa a operadores de camión, transportistas, empresas y agentes aduanales que trabajan en el puerto.

════════════════════════════════════════
ESTADO ACTUAL DEL PUERTO — ${hora} · ${fecha}
════════════════════════════════════════

ZONAS MONITOREADAS:
${portoStatus || 'Sin datos disponibles en este momento.'}

ALERTAS ACTIVAS:
${alertasActivas}

ÚLTIMOS REPORTES DE LA COMUNIDAD:
${reportesRecientes || 'Sin reportes recientes.'}

════════════════════════════════════════
INSTRUCCIONES DE COMPORTAMIENTO
════════════════════════════════════════

- Responde SIEMPRE en español, de forma concisa y directa.
- Usa los datos de arriba para responder preguntas sobre el estado del puerto.
- Si el usuario pregunta por una zona específica, dile su estado actual y cuántos reportes tiene.
- Puedes recomendar qué ruta o terminal tiene menos congestión.
- Si no hay datos de una zona, dilo claramente: "Sin reportes en este momento."
- Sé amigable pero eficiente — los operadores están en el camión y necesitan respuestas rápidas.
- Nunca inventes datos de tráfico. Solo usa lo que tienes arriba.
- Si preguntan por tiempos de espera exactos, sé honesto: "Según los reportes de la comunidad, está ${STATUS_ES.congested}." No inventes minutos si no tienes ese dato.
- Puedes responder preguntas sobre cómo usar la plataforma, qué módulos tiene, cómo reportar, etc.
- Al final de cada respuesta sobre el puerto, recuerda al usuario que puede reportar lo que ve para ayudar a la comunidad.

CONTEXTO DEL USUARIO: ${userContext ? `Nivel de reputación: ${NIVELES[userContext.nivel] || 'Nuevo'}, Reportes realizados: ${userContext.total_reportes || 0}` : 'Usuario no identificado / visitante.'}

Responde de forma natural, como un compañero experto del puerto, no como un robot.`

    // Llamar a Claude con streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: sanitized,
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (err) {
    console.error('Chat IA error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al conectar con la IA. Intenta de nuevo.' })
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Error interno' })}\n\n`)
      res.end()
    }
  }
})

export default router
