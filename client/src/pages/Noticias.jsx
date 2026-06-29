import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Newspaper } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import BannerRotativo from '../components/ui/BannerRotativo.jsx'

const CATEGORY_CONFIG = {
  aviso:     { label: 'Aviso',     bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: '📢' },
  cierre:    { label: 'Cierre',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon: '🚫' },
  operativo: { label: 'Operativo', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: '🚔' },
  clima:     { label: 'Clima',     bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-700',   icon: '🌤️' },
  general:   { label: 'General',   bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  icon: '📌' },
}

export default function Noticias() {
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data } = await supabase.from('news_items').select('*')
        .eq('is_active', true).gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false }).order('created_at', { ascending: false })
      return data || []
    },
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Newspaper size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Noticias del Día</h1>
              <p className="text-slate-500 text-sm">Avisos, cierres y novedades del puerto</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <BannerRotativo zona="noticias" className="h-20 mb-4" />
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Newspaper size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay noticias publicadas hoy</p>
            <p className="text-slate-400 text-sm mt-1">Vuelve más tarde</p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map(item => {
              const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general
              return (
                <div key={item.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${cfg.border}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        {item.priority > 5 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                            🔴 Alta prioridad
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 text-sm font-medium leading-snug">{item.content}</p>
                      <p className="text-slate-400 text-xs mt-2">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
