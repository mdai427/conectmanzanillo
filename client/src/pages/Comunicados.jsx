import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Clock, CheckCircle2, X, FileText, Send } from 'lucide-react'
import { useAuthStore } from '../stores/authStore.js'
import { supabase } from '../lib/supabase.js'

const API = import.meta.env.VITE_API_URL || ''

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, ...opts.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error')
  return data
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function Comunicados() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')

  const { data: comunicados = [], isLoading } = useQuery({
    queryKey: ['comunicados'],
    queryFn: () => authFetch('/api/comunicados'),
    staleTime: 60_000,
  })

  const submit = useMutation({
    mutationFn: () => authFetch('/api/comunicados', {
      method: 'POST',
      body: JSON.stringify({ titulo, contenido }),
    }),
    onSuccess: () => {
      toast.success('Comunicado enviado — queda pendiente de aprobación')
      setTitulo(''); setContenido(''); setShowForm(false)
      qc.invalidateQueries({ queryKey: ['comunicados'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Megaphone size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comunicados</h1>
            <p className="text-gray-500 text-sm">Avisos oficiales del sector portuario</p>
          </div>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> Nuevo
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Nuevo comunicado</p>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2">
            <Clock size={13} className="shrink-0 mt-0.5" />
            Tu comunicado será revisado por un moderador antes de publicarse.
          </div>
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value.slice(0, 100))}
            placeholder="Título del comunicado"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
          />
          <textarea
            value={contenido}
            onChange={e => setContenido(e.target.value.slice(0, 1000))}
            placeholder="Contenido del comunicado…"
            rows={5}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{contenido.length}/1000</span>
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || !titulo.trim() || !contenido.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Send size={14} /> {submit.isPending ? 'Enviando…' : 'Enviar para revisión'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : comunicados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay comunicados publicados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicados.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-gray-900 text-base leading-snug">{c.titulo}</h2>
                <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0 font-semibold">
                  <CheckCircle2 size={10} /> Aprobado
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{c.contenido}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span>{c.profiles?.full_name || c.profiles?.username || 'Anónimo'}</span>
                <span>·</span>
                <span>{timeAgo(c.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
