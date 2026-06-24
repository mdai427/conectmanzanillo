import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft } from 'lucide-react'
import { useSectionStatus } from '../hooks/useSectionStatus.js'
import { useReports } from '../hooks/useReports.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import ReportButton from '../components/ui/ReportButton.jsx'
import ConfirmReaction from '../components/ui/ConfirmReaction.jsx'

export default function SectionDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: section, isLoading: loadingSection } = useSectionStatus(slug)
  const { data: reports = [], isLoading: loadingReports } = useReports(slug, section?.id)

  if (loadingSection) return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00C2FF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!section) return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-4">
      <p className="text-[#8B949E]">Sección no encontrada</p>
      <button onClick={() => navigate('/')} className="text-[#00C2FF] text-sm">Volver al inicio</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#00C2FF]/6 to-transparent border-b border-[#30363D]/50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{section.name}</h1>
              {section.description && (
                <p className="text-sm text-[#8B949E] mt-1">{section.description}</p>
              )}
            </div>
            <StatusBadge status={section.status} size="lg" />
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4 text-sm text-[#4B5563]">
            <span>{section.active_reports} reportes activos</span>
            {section.confidence > 0 && (
              <span>{Math.round(section.confidence * 100)}% confianza</span>
            )}
          </div>

          {/* Barra de confianza */}
          <div className="h-1.5 bg-[#30363D] rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((section.confidence || 0) * 100)}%`, backgroundColor: '#00C2FF' }}
            />
          </div>

          <div className="mt-5">
            <ReportButton section={section} />
          </div>
        </div>
      </div>

      {/* Reportes */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-xs font-mono text-[#4B5563] uppercase tracking-widest mb-4">
          reportes activos
        </p>

        {loadingReports ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 text-center">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm text-[#8B949E]">Sin reportes activos en esta zona</p>
            <p className="text-xs text-[#4B5563] mt-1">¡Sé el primero en reportar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={report.status} size="sm" />
                      <span className="text-xs text-[#4B5563]">
                        por {report.profiles?.username || 'Operador anónimo'}
                      </span>
                    </div>
                    {report.comment && (
                      <p className="text-sm text-[#8B949E] mt-2">{report.comment}</p>
                    )}
                    <ConfirmReaction report={report} />
                  </div>
                  <span className="text-xs text-[#4B5563] whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
