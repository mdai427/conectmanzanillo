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
      className="w-full text-left bg-[#161B22] border border-[#30363D] rounded-2xl p-5 hover:border-[#4B5563] active:scale-[0.98] transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-white text-base leading-tight group-hover:text-[#00C2FF] transition-colors">
            {section.name}
          </h3>
          {section.description && (
            <p className="text-xs text-[#4B5563] mt-1 line-clamp-1">{section.description}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-[#30363D] group-hover:text-[#8B949E] mt-1 shrink-0 transition-colors" />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{cfg.emoji}</span>
        <div>
          <div className={`font-bold text-sm ${cfg.tw.split(' ')[0]}`}>{cfg.label}</div>
          {section.confidence > 0 && (
            <div className="text-xs text-[#4B5563]">
              {Math.round(section.confidence * 100)}% confianza
            </div>
          )}
        </div>
      </div>

      {/* Barra de confianza */}
      <div className="h-1 bg-[#30363D] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round((section.confidence || 0) * 100)}%`,
            backgroundColor: cfg.color,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[#4B5563]">
        <div className="flex items-center gap-1">
          <Users size={11} />
          <span>{section.active_reports} reporte{section.active_reports !== 1 ? 's' : ''} activo{section.active_reports !== 1 ? 's' : ''}</span>
        </div>
        {lastReport && <span>{lastReport}</span>}
        {!lastReport && <span>Sin reportes recientes</span>}
      </div>
    </button>
  )
}
