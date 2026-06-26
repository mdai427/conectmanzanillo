import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CATEGORY_CONFIG = {
  aviso:     { label: 'Aviso',     bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  icon: '📢' },
  cierre:    { label: 'Cierre',    bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   icon: '🚫' },
  operativo: { label: 'Operativo', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '🚔' },
  clima:     { label: 'Clima',     bg: 'bg-cyan-50',  border: 'border-cyan-200',  text: 'text-cyan-700',  icon: '🌤️' },
  general:   { label: 'General',   bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: '📌' },
}

export default function NewsCard({ item }) {
  const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {cfg.label}
          </span>
          <p className="text-slate-800 text-sm font-medium leading-snug">{item.content}</p>
          <p className="text-slate-400 text-xs mt-2">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>
    </div>
  )
}
