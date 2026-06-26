import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { STATUS_CONFIG } from '../../lib/constants.js'

const STATUS_THEME = {
  free:      { border: '#86efac', bg: '#f0fdf4', dot: '#22c55e', label: '#15803d' },
  moderate:  { border: '#fcd34d', bg: '#fffbeb', dot: '#f59e0b', label: '#b45309' },
  congested: { border: '#fca5a5', bg: '#fef2f2', dot: '#ef4444', label: '#b91c1c' },
  closed:    { border: '#d1d5db', bg: '#f9fafb', dot: '#6b7280', label: '#374151' },
  unknown:   { border: '#e2e8f0', bg: '#f8fafc', dot: '#94a3b8', label: '#64748b' },
}

export default function SectionCard({ section }) {
  const navigate = useNavigate()
  const cfg   = STATUS_CONFIG[section.status] || STATUS_CONFIG.unknown
  const theme = STATUS_THEME[section.status]  || STATUS_THEME.unknown
  const lastReport = section.last_report_at
    ? formatDistanceToNow(new Date(section.last_report_at), { addSuffix: true, locale: es })
    : null

  return (
    <button
      onClick={() => navigate(`/seccion/${section.slug}`)}
      className="w-full text-left rounded-2xl p-4 transition-all duration-200 group active:scale-[0.97] bg-white hover:shadow-md"
      style={{ border: `1.5px solid ${theme.border}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm leading-tight truncate group-hover:text-blue-700 transition-colors">
            {section.name}
          </h3>
          {section.description && (
            <p className="text-xs mt-0.5 truncate text-slate-400">{section.description}</p>
          )}
        </div>
        <ChevronRight size={14} className="shrink-0 mt-0.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: theme.bg, color: theme.label, border: `1px solid ${theme.border}` }}>
          <span className="w-2 h-2 rounded-full" style={{ background: theme.dot }} />
          {cfg.label}
        </span>
        {section.confidence > 0 && (
          <span className="text-xs text-slate-400">{Math.round(section.confidence * 100)}% conf.</span>
        )}
      </div>

      {/* Bar */}
      <div className="h-1.5 rounded-full mb-3 overflow-hidden bg-slate-100">
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(4, Math.round((section.confidence || 0) * 100))}%`,
            background: theme.dot,
          }} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400">
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
