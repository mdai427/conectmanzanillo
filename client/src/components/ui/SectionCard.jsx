import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { STATUS_CONFIG } from '../../lib/constants.js'

const STATUS_BG = {
  free:      { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  glow: '#22C55E' },
  moderate:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', glow: '#F59E0B' },
  congested: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  glow: '#EF4444' },
  closed:    { bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.2)', glow: '#6B7280' },
  unknown:   { bg: 'rgba(255,255,255,0.03)',border: 'rgba(255,255,255,0.06)',glow: '#475569' },
}

export default function SectionCard({ section }) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[section.status] || STATUS_CONFIG.unknown
  const theme = STATUS_BG[section.status] || STATUS_BG.unknown
  const lastReport = section.last_report_at
    ? formatDistanceToNow(new Date(section.last_report_at), { addSuffix: true, locale: es })
    : null

  return (
    <button
      onClick={() => navigate(`/seccion/${section.slug}`)}
      className="w-full text-left rounded-2xl p-4 transition-all duration-200 group active:scale-[0.97]"
      style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${theme.glow}22`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight truncate">{section.name}</h3>
          {section.description && (
            <p className="text-xs mt-0.5 truncate text-slate-500">{section.description}</p>
          )}
        </div>
        <ChevronRight size={14} className="shrink-0 mt-0.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.emoji}</span>
        <div>
          <div className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
          {section.confidence > 0 && (
            <div className="text-xs text-slate-600">{Math.round(section.confidence * 100)}% confianza</div>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(4, Math.round((section.confidence || 0) * 100))}%`,
            background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
          }} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <AlertCircle size={10} />
          <span>{section.active_reports} reporte{section.active_reports !== 1 ? 's' : ''}</span>
        </div>
        {lastReport && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{lastReport}</span>
          </div>
        )}
      </div>
    </button>
  )
}
