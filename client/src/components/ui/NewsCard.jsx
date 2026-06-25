import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CATEGORY_COLORS = {
  aviso:     'border-blue-500/40 bg-blue-950/30',
  cierre:    'border-red-500/40 bg-red-950/30',
  operativo: 'border-yellow-500/40 bg-yellow-950/30',
  clima:     'border-cyan-500/40 bg-cyan-950/30',
  general:   'border-gray-500/40 bg-gray-900/30',
}

const CATEGORY_ICONS = {
  aviso: '📢', cierre: '🚫', operativo: '🚔', clima: '🌤️', general: '📌'
}

export default function NewsCard({ item }) {
  const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general

  return (
    <div className={`border rounded-xl p-4 ${colorClass} transition-all hover:brightness-110`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[item.category] || '📌'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-snug">{item.content}</p>
          <p className="text-[#8B949E] text-xs mt-2">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>
    </div>
  )
}
