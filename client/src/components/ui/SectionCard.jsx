import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, ChevronRight } from 'lucide-react'
import { STATUS_CONFIG } from '../../lib/constants.js'

export default function SectionCard({ section }) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[section.status] || STATUS_CONFIG.unknown
  const lastReport = section.last_report_at
    ? formatDistanceToNow(new Date(section.last_report_at), { addSuffix: true, locale: es })
    : null

  return (
    <button
      onClick={() => navigate(`/seccion/${section.slug}`)}
      className="w-full text-left rounded-2xl p-5 transition-all group active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #0F1F3D 0%, #0A1628 100%)',
        border: '1px solid #1E3A6E',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#0099E6'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1E3A6E'}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-white text-base leading-tight group-hover:text-[#00C2FF] transition-colors">
            {section.name}
          </h3>
          {section.description && (
            <p className="text-xs mt-1 line-clamp-1" style={{ color: '#3D5A80' }}>{section.description}</p>
          )}
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 transition-colors" style={{ color: '#1E3A6E' }} />
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{cfg.emoji}</span>
        <div>
          <div className={`font-bold text-sm ${cfg.tw.split(' ')[0]}`}>{cfg.label}</div>
          {section.confidence > 0 && (
            <div className="text-xs" style={{ color: '#3D5A80' }}>
              {Math.round(section.confidence * 100)}% confianza
            </div>
          )}
        </div>
      </div>

      {/* Barra */}
      <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: '#162B52' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(5, Math.round((section.confidence || 0) * 100))}%`,
            background: `linear-gradient(90deg, #0099E6, #00C2FF)`,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: '#3D5A80' }}>
        <div className="flex items-center gap-1">
          <Users size={11} />
          <span>{section.active_reports} reporte{section.active_reports !== 1 ? 's' : ''}</span>
        </div>
        <span>{lastReport || 'Sin reportes'}</span>
      </div>
    </button>
  )
}
