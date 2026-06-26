import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, Clock, Radio, TrendingUp } from 'lucide-react'
import { STATUS_CONFIG } from '../../lib/constants.js'

const THEME = {
  free:      { border: '#86efac', bg: '#f0fdf4', dot: '#22c55e', label: '#15803d', badgeBg: '#dcfce7' },
  moderate:  { border: '#fcd34d', bg: '#fffbeb', dot: '#f59e0b', label: '#b45309', badgeBg: '#fef9c3' },
  congested: { border: '#fca5a5', bg: '#fef2f2', dot: '#ef4444', label: '#b91c1c', badgeBg: '#fee2e2' },
  closed:    { border: '#d1d5db', bg: '#f9fafb', dot: '#6b7280', label: '#374151', badgeBg: '#f1f5f9' },
  unknown:   { border: '#e2e8f0', bg: '#f8fafc', dot: '#94a3b8', label: '#64748b', badgeBg: '#f8fafc' },
}

const TIME_EST = {
  free:      '5-15 min',
  moderate:  '20-45 min',
  congested: '45-90+ min',
  closed:    'No disponible',
  unknown:   'Sin datos',
}

// Patrón horario para calcular source
const PATRON = {
  0:'free',1:'free',2:'free',3:'free',4:'moderate',5:'moderate',
  6:'congested',7:'congested',8:'congested',9:'moderate',10:'moderate',11:'moderate',
  12:'free',13:'free',14:'moderate',15:'moderate',16:'congested',17:'congested',
  18:'moderate',19:'moderate',20:'free',21:'free',22:'free',23:'free',
}

export default function SectionCard({ section }) {
  const navigate = useNavigate()
  const cfg   = STATUS_CONFIG[section.status] || STATUS_CONFIG.unknown
  const theme = THEME[section.status] || THEME.unknown
  const hasData = section.active_reports > 0
  const horaActual = new Date().getHours()
  const statusPorPatron = PATRON[horaActual] || 'unknown'

  // Fuente del dato
  const source = hasData
    ? section.confidence >= 0.7 ? { label: 'Comunitario ✓', color: '#16a34a' }
      : section.confidence >= 0.4 ? { label: 'Comunidad', color: '#2563eb' }
      : { label: 'Datos limitados', color: '#f59e0b' }
    : { label: 'Patrón horario', color: '#94a3b8' }

  const lastReport = section.last_report_at
    ? formatDistanceToNow(new Date(section.last_report_at), { addSuffix: true, locale: es })
    : null

  const confPct = section.confidence > 0
    ? Math.round(section.confidence * 100)
    : hasData ? 40 : 0

  return (
    <button
      onClick={() => navigate(`/seccion/${section.slug}`)}
      className="w-full text-left rounded-2xl transition-all duration-200 group active:scale-[0.97] bg-white hover:shadow-lg overflow-hidden"
      style={{ border: `1.5px solid ${theme.border}` }}
    >
      {/* Top stripe */}
      <div className="h-1 w-full" style={{ background: theme.dot }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-sm leading-tight truncate group-hover:text-blue-700 transition-colors">
              {section.name}
            </h3>
            {section.description && (
              <p className="text-[11px] mt-0.5 truncate text-slate-400">{section.description}</p>
            )}
          </div>
          <ChevronRight size={14} className="shrink-0 mt-0.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Status + tiempo estimado */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: theme.badgeBg, color: theme.label, border: `1px solid ${theme.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dot }} />
            {cfg.label}
          </span>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Clock size={10} />
            {TIME_EST[section.status] || 'Sin datos'}
          </span>
        </div>

        {/* Barra de confianza */}
        <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: `${theme.dot}20` }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: hasData ? `${Math.max(8, confPct)}%` : '12%',
              background: hasData ? theme.dot : '#cbd5e1',
            }} />
        </div>

        {/* Footer: reportes + fuente + última actualización */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio size={9} style={{ color: hasData ? theme.dot : '#94a3b8' }} />
              <span className="text-[10px] text-slate-500">
                {hasData
                  ? `${section.active_reports} reporte${section.active_reports !== 1 ? 's' : ''} activo${section.active_reports !== 1 ? 's' : ''}`
                  : 'Sin reportes recientes'}
              </span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: source.color }}>
              {source.label}
            </span>
          </div>

          {!hasData ? (
            <p className="text-[10px] text-slate-400 italic">
              Estimación por patrón horario del puerto
            </p>
          ) : lastReport ? (
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={8} />
              Últ. reporte {lastReport}
            </div>
          ) : null}
        </div>
      </div>

      {/* CTA bar */}
      <div className="px-4 py-2 flex items-center justify-between border-t"
           style={{ background: `${theme.dot}08`, borderColor: `${theme.dot}30` }}>
        <span className="text-[10px] font-bold" style={{ color: theme.dot }}>Ver detalle y reportar</span>
        <TrendingUp size={10} style={{ color: theme.dot }} />
      </div>
    </button>
  )
}
