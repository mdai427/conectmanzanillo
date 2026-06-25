import { useEffect, useState, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function SectionChat({ sectionId }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.from('section_messages')
      .select('*, profiles(username)')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setMessages((data || []).reverse()))

    const channel = supabase.channel(`chat:${sectionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'section_messages',
        filter: `section_id=eq.${sectionId}`,
      }, async ({ new: msg }) => {
        const { data } = await supabase.from('section_messages')
          .select('*, profiles(username)').eq('id', msg.id).single()
        if (data) setMessages(prev => [...prev, data])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sectionId])

  async function handleSend() {
    if (!input.trim() || !user) return
    setSending(true)
    const { error } = await supabase.from('section_messages').insert({
      section_id: sectionId,
      user_id: user.id,
      content: input.trim().slice(0, 200),
    })
    if (error) toast.error('No se pudo enviar')
    else setInput('')
    setSending(false)
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center gap-2">
        <MessageSquare size={15} className="text-[#00C2FF]" />
        <h3 className="text-white text-sm font-semibold">Mensajes de la zona</h3>
        <span className="text-[#4B5563] text-xs">· {messages.length} mensajes</span>
      </div>

      <div className="h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-[#4B5563] text-xs text-center py-6">
            Sin mensajes aún. ¡Sé el primero en comentar!
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
              m.user_id === user?.id
                ? 'bg-[#00C2FF]/20 text-white rounded-tr-none'
                : 'bg-[#0D1117] text-[#F0F6FC] rounded-tl-none'
            }`}>
              {m.user_id !== user?.id && (
                <p className="text-[#00C2FF] font-semibold text-[10px] mb-0.5">
                  @{m.profiles?.username || 'Operador'}
                </p>
              )}
              <p className="leading-snug">{m.content}</p>
              <p className="text-[#4B5563] text-[10px] mt-1">
                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <div className="p-3 border-t border-[#30363D] flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Escribe un mensaje sobre esta zona..."
            maxLength={200}
            className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm
                       text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]/50"
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="bg-[#00C2FF] text-black p-2.5 rounded-xl hover:bg-[#00AADD]
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-[#30363D] text-center">
          <a href="/login" className="text-[#00C2FF] text-xs hover:underline">
            Inicia sesión para enviar mensajes →
          </a>
        </div>
      )}
    </div>
  )
}
