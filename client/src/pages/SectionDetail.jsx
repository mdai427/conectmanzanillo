import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Clock, Users } from 'lucide-react'
import { useSectionStatus } from '../hooks/useSectionStatus.js'
import { useReports } from '../hooks/useReports.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import ReportButton from '../components/ui/ReportButton.jsx'
import ConfirmReaction from '../components/ui/ConfirmReaction.jsx'
import SectionChat from '../components/ui/SectionChat.jsx'

export default function SectionDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: section, isLoading: loadingSection } = useSectionStatus(slug)
  const { data: reports = [], isLoading: loadingReports } = useReports(slug, section?.id)

  if (loadingSection) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!section) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500">Sección no encontrada</p>
      <button onClick={() => navigate('/')} className="text-blue-600 text-sm font-semibold hover:underline">
        Volver al inicio
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors font-medium">
            <ArrowLeft size={15} />
            Volver
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800">{section.name}</h1>
              {section.description && (
                <p className="text-sm text-slate-500 mt-1">{section.description}</p>
              )}
            </div>
            <StatusBadge status={section.status} size="lg" />
          </div>

          <div className="flex gap-4 mt-3 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users size={13} />
              {section.active_reports} reportes activos
            </span>
            {section.confidence > 0 && (
              <span>{Math.round(section.confidence * 100)}% confianza</span>
            )}
          </div>

          {/* Barra de confianza */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3 border border-slate-200">
            <div className="h-full rounded-full transition-all bg-blue-500"
              style={{ width: `${Math.round((section.confidence || 0) * 100)}%` }} />
          </div>

          <div className="mt-4">
            <ReportButton section={section} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Reportes */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Reportes activos
          </p>

          {loadingReports ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">📡</p>
              <p className="text-sm text-slate-500 font-medium">Sin reportes activos en esta zona</p>
              <p className="text-xs text-slate-400 mt-1">¡Sé el primero en reportar!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={report.status} size="sm" />
                        <span className="text-xs text-slate-400">
                          por {report.profiles?.username || 'Operador anónimo'}
                        </span>
                      </div>
                      {report.comment && (
                        <p className="text-sm text-slate-600 mt-2">{report.comment}</p>
                      )}
                      <ConfirmReaction report={report} />
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        {section?.id && <SectionChat sectionId={section.id} />}
      </div>
    </div>
  )
}
