import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSocketEvent } from '../../hooks/useRealtime.js'
import { STATUS_CONFIG } from '../../lib/constants.js'

export default function ActivityFeed() {
  const [activities, setActivities] = useState([])

  useSocketEvent('activity', (report) => {
    setActivities(prev => [report, ...prev].slice(0, 20))
  })

  if (activities.length === 0) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">📡</div>
        <p className="text-sm text-[#4B5563]">Esperando reportes en tiempo real…</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => {
        const cfg = STATUS_CONFIG[activity.status] || STATUS_CONFIG.unknown
        return (
          <div
            key={activity.id || i}
            className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 animate-[fadeIn_0.3s_ease]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{cfg.emoji}</span>
              <span className={`text-sm font-semibold ${cfg.tw.split(' ')[0]}`}>{cfg.label}</span>
              <span className="ml-auto text-xs text-[#4B5563]">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
            {activity.comment && (
              <p className="text-xs text-[#8B949E] mt-1 line-clamp-2">{activity.comment}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
