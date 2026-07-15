import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, ChevronDown, Sparkles, Zap } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

const SUGERENCIAS = [
  '¿Qué vacantes hay para mí?',
  'Busco un ejecutivo de tráfico',
  '¿Cómo publico una vacante?',
  'Dame el resumen informativo de hoy',
  '¿Qué empresas están contratando?',
  '¿Cómo mejoro mi perfil profesional?',
]

function fallbackAnswer(question) {
  const text = question.toLowerCase()
  if (text.includes('empresa') || text.includes('proveedor')) return 'Puedes consultar empresas y proveedores en **Directorio**: /directorio-empresarial. Usa los filtros para encontrar la categoría adecuada.'
  if (text.includes('flete') || text.includes('carga')) return 'La bolsa de cargas y unidades está en **Fletes**: /fletes. Faro solo mostrará publicaciones guardadas en la plataforma.'
  if (text.includes('vacante') || text.includes('empleo') || text.includes('trabajo')) return 'Consulta oportunidades en **Empleos**: /vacantes. También puedes completar tu perfil desde Mi cuenta.'
  if (text.includes('curso') || text.includes('capacita')) return 'Las guías prácticas y cursos descargables se organizan en **Capacitación**: /capacitacion. Son materiales educativos y no certificaciones oficiales.'
  if (text.includes('documento') || text.includes('formato')) return 'La biblioteca de formatos está en /documentos. Verifica siempre requisitos legales o aduanales con la autoridad o un profesional.'
  return 'Puedo orientarte para encontrar empresas, fletes, vacantes, capacitación y documentos dentro de Faro Portuario. También puedes usar el buscador de la página principal.'
}

function MarkdownText({ text }) {
  // Render básico de negritas y bullets
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
             style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
          <Bot size={13} className="text-white" />
        </div>
      )}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'text-white rounded-br-sm'
          : 'text-slate-800 rounded-bl-sm'
      }`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
            : '#f1f5f9',
          border: isUser ? 'none' : '1px solid #e2e8f0',
        }}>
        {msg.streaming ? (
          <span>
            <MarkdownText text={msg.content} />
            <span className="inline-block w-1 h-4 ml-0.5 bg-blue-400 rounded-full animate-pulse align-middle" />
          </span>
        ) : (
          msg.content.split('\n').map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <MarkdownText text={line} />
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default function ChatIA() {
  const { user, profile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola${user ? `, ${profile?.username || ''}` : ''}! 👋 Soy el asistente de Faro Portuario.\n\nPuedo ayudarte a encontrar empleos, talento, empresas y la información relevante del sector logístico de Manzanillo. ¿Qué necesitas?`,
      }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus()
  }, [open, minimized])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    // Placeholder de respuesta con streaming
    const assistantIdx = newMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error del servidor')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullText += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[assistantIdx] = { role: 'assistant', content: fullText, streaming: true }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIdx] = { role: 'assistant', content: fullText, streaming: false }
        return updated
      })
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIdx] = {
          role: 'assistant',
          content: `${fallbackAnswer(userText)}\n\nEl servicio de respuestas avanzadas no está disponible en este momento.`,
          streaming: false,
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6 flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-sm text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            boxShadow: '0 8px 32px rgba(59,130,246,0.45)',
          }}>
          <div className="relative">
            <Sparkles size={18} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <span className="hidden sm:inline">Asistente Faro</span>
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden shadow-2xl"
          style={{
            bottom: 80, right: 16,
            width: 'min(380px, calc(100vw - 32px))',
            height: minimized ? 56 : 520,
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            background: 'white',
            transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 shrink-0"
               style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-none">Asistente Faro</p>
              <p className="text-blue-200 text-[10px] mt-0.5 flex items-center gap-1">
                <Zap size={8} className="text-green-300" />
                Orientación dentro de la plataforma
              </p>
            </div>
            <button onClick={() => setMinimized(m => !m)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <ChevronDown size={14} className={`transition-transform ${minimized ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <X size={14} />
            </button>
          </div>

          {/* Mensajes */}
          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}

                {/* Sugerencias (solo al inicio) */}
                {messages.length <= 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {SUGERENCIAS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-blue-100 border"
                        style={{ background: '#f8fafc', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 px-3 pb-3 pt-2 border-t border-slate-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="¿Qué quieres encontrar?"
                    rows={1}
                    disabled={loading}
                    className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400 disabled:opacity-50"
                    style={{ maxHeight: 80, lineHeight: '1.4' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                    {loading
                      ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Send size={15} />
                    }
                  </button>
                </div>
                <p className="text-[9px] text-slate-300 text-center mt-1.5">
                  Información orientativa; no sustituye asesoría profesional ni fuentes oficiales.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
