import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'

const router = Router()

const chatLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 minuto
  max: 10,               // máx 10 mensajes por minuto por IP
  message: { error: 'Demasiados mensajes. Espera un momento.' },
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/chat
router.post('/', chatLimit, async (req, res) => {
  const { messages = [] } = req.body

  if (!messages.length) return res.status(400).json({ error: 'Sin mensajes' })
  if (messages.length > 20) return res.status(400).json({ error: 'Conversación muy larga' })

  // Sanitizar mensajes del usuario
  const sanitized = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }))

  try {
    const systemPrompt = `Eres Asistente Faro, guía de navegación del ecosistema digital Faro Portuario en Manzanillo, Colima, México.

Tu misión es orientar al usuario para encontrar empresas, servicios, fletes, vacantes, capacitación, documentos y contenido disponible dentro de la plataforma.

════════════════════════════════════════
INSTRUCCIONES DE COMPORTAMIENTO
════════════════════════════════════════

- Responde SIEMPRE en español, de forma concisa y directa.
- Prioriza enlaces y recursos internos de Faro Portuario.
- Considera perfiles diversos: operadores, ejecutivos de tráfico, documentadores, agentes aduanales, almacén, administración y supervisión.
- Nunca inventes empresas, fletes, vacantes, salarios, noticias, requisitos legales ni condiciones operativas.
- No proporciones estatus del puerto si no se incluyó una fuente verificada en el contexto.
- No te presentes como autoridad ni sustituyas asesoría legal, fiscal, aduanal o técnica.
- Cuando corresponda, recuerda que la información es orientativa y deben consultarse fuentes oficiales.
- Explica cómo publicar un perfil, una vacante o un anuncio cuando sea relevante.
- Sé amigable, inclusivo y eficiente.

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
