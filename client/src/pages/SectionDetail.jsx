import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Clock, Users, Navigation, CheckCircle2, AlertTriangle, Zap, Info, Radio } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSectionStatus } from '../hooks/useSectionStatus.js'
import { useReports } from '../hooks/useReports.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import ReportButton from '../components/ui/ReportButton.jsx'
import ConfirmReaction from '../components/ui/ConfirmReaction.jsx'
import SectionChat from '../components/ui/SectionChat.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Stagger from '../components/ui/Stagger.jsx'

const STATUS_COLOR = {
  free:      { bg: '#dcfce7', border: '#86efac', text: '#16a34a', dark: '#16a34a', label: '🟢 Libre',     est: '5-15 min' },
  moderate:  { bg: '#fef9c3', border: '#fde047', text: '#ca8a04', dark: '#ca8a04', label: '🟡 Moderado',  est: '20-45 min' },
  congested: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', dark: '#dc2626', label: '🔴 Saturado',  est: '45-90+ min' },
  closed:    { bg: '#f1f5f9', border: '#94a3b8', text: '#475569', dark: '#475569', label: '⚫ Cerrado',   est: 'No disponible' },
  unknown:   { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', dark: '#94a3b8', label: '⚪ Sin datos', est: 'Sin datos' },
}

const PRED_ICON  = { free: '🟢', moderate: '🟡', congested: '🔴', closed: '⚫' }
const PRED_LABEL = { free: 'Libre', moderate: 'Moderado', congested: 'Saturado', closed: 'Cerrado' }

const PATRON = {
  0:'free',1:'free',2:'free',3:'free',4:'moderate',5:'moderate',
  6:'congested',7:'congested',8:'congested',9:'moderate',10:'moderate',11:'moderate',
  12:'free',13:'free',14:'moderate',15:'moderate',16:'congested',17:'congested',
  18:'moderate',19:'moderate',20:'free',21:'free',22:'free',23:'free',
}

function getRecomendacionZona(status, pred1h, pred2h, hora) {
  if (status === 'free') {
    if (pred1h === 'congested' || pred2h === 'congested')
      return 'Zona libre ahora pero con saturación esperada pronto. Ingresa cuanto antes.'
    return 'Condiciones óptimas. Ingresa sin problema, tiempo estimado menor a 15 minutos.'
  }
  if (status === 'moderate') {
    if (pred1h === 'free')
      return 'Tráfico moderado mejorando. Si puedes esperar ~1 hora, encontrarás la zona libre.'
    if (pred1h === 'congested')
      return 'Tráfico moderado empeorando. Ingresa pronto antes de que aumente la congestión.'
    return 'Tráfico moderado estable. Espera razonable de 20-45 minutos.'
  }
  if (status === 'congested') {
    if (pred1h === 'free' || pred1h === 'moderate')
      return 'Zona saturada pero mejorará en ~1 hora. Se recomienda esperar o buscar zona alternativa.'
    if (hora >= 16 && hora < 19)
      return 'Pico vespertino. Espera hasta después de las 18:30 para mejor acceso.'
    if (hora >= 6 && hora < 10)
      return 'Pico matutino. Considera esperar hasta las 10:30-12:00 para mejor acceso.'
    return 'Zona saturada. Evalúa zona alternativa o espera a que disminuya la congestión.'
  }
  if (status === 'closed')
    return 'Zona cerrada temporalmente. Consulta terminales o grupos de WhatsApp para actualizaciones.'
  return 'Sin reportes recientes. Estado estimado por patrón horario. Reporta lo que ves.'
}

export default function SectionDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const hora = new Date().getHours()

  const { data: section, isLoading: loadingSection } = useSectionStatus(slug)
  const { data: reports = [], isLoading: loadingReports } = useReports(slug, section?.id)

  // Predicciones IA para esta zona
  const { data: predictions } = useQuery({
    queryKey: ['predictions'],
    queryFn: async () => {
      const res = await fetch('/api/predictions')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })

  const zonePred = predictions?.predicciones?.find(p => p.slug === slug)
  const pred30  = zonePred?.pred_30min || PATRON[(hora + 1) % 24]
  const pred1h  = zonePred?.pred_1hr   || PATRON[(hora + 1) % 24]
  const pred2h  = zonePred?.pred_2hr   || PATRON[(hora + 2) % 24]
  const confianza = zonePred?.confianza || (section?.active_reports > 0 ? 55 : 35)
  const hasPredIA = !!zonePred
  const hasData = (section?.active_reports || 0) > 0

  const cfg = STATUS_COLOR[section?.status] || STATUS_COLOR.unknown
  const confPct = section?.confidence
    ? Math.round(section.confidence * 100)
    : hasData ? 45 : 20

  const recomendacion = section ? getRecomendacionZona(section.status, pred1h, pred2h, hora) : null
  const source = hasData
    ? confPct >= 70 ? 'Comunidad verificada' : 'Datos comunitarios'
    : 'Patrón horario estimado'

  if (loadingSection) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!section) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-3xl">🗺️</p>
      <p className="text-slate-600 font-semibold">Zona no encontrada</p>
      <button onClick={() => navigate('/')} className="text-blue-600 text-sm font-semibold hover:underline">
        Volver al inicio
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <Reveal className="max-w-2xl mx-auto px-4 py-5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors font-medium">
            <ArrowLeft size={15} />
            Volver
          </button>

          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-800 leading-tight">{section.name}</h1>
              {section.description && (
                <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
              )}
            </div>
            <StatusBadge status={section.status} size="lg" />
          </div>

          {/* Tiempo estimado + fuente */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                 style={{ background: cfg.bg, borderColor: cfg.border }}>
              <Clock size={12} style={{ color: cfg.text }} />
              <span className="text-xs font-bold" style={{ color: cfg.text }}>
                ⏱ {cfg.est}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">
                {hasData ? `${section.active_reports} reporte${section.active_reports !== 1 ? 's' : ''} activo${section.active_reports !== 1 ? 's' : ''}` : 'Sin reportes recientes'}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: hasData ? '#2563eb' : '#94a3b8' }}>
              {source}
            </span>
          </div>

          {/* Barra de confianza */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Nivel de confianza</span>
              <span>{confPct}%{!hasData ? ' (estimado)' : ''}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${confPct}%`, background: confPct >= 70 ? cfg.dark : confPct >= 40 ? '#f59e0b' : '#cbd5e1' }} />
            </div>
          </div>

          {!hasData && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
              <Info size={12} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700">
                Sin reportes comunitarios recientes. Estado estimado por patrón histórico del Puerto de Manzanillo.
                Reporta lo que ves para mejorar la precisión.
              </p>
            </div>
          )}

          <ReportButton section={section} />
        </Reveal>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Predicciones */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"
               style={{ background: 'linear-gradient(135deg, #eff6ff, #fff)' }}>
            <p className="text-xs font-black text-blue-600 flex items-center gap-1.5">
              <Zap size={11} /> Predicción IA
            </p>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: hasPredIA ? '#dcfce7' : '#fef9c3', color: hasPredIA ? '#16a34a' : '#ca8a04' }}>
              {hasPredIA ? 'IA + comunidad' : 'Patrón horario'}
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: '30 min', val: pred30 },
              { label: '1 hora', val: pred1h },
              { label: '2 horas', val: pred2h },
            ].map(({ label, val }) => {
              const pc = STATUS_COLOR[val] || STATUS_COLOR.unknown
              return (
                <div key={label} className="p-3 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-2xl mb-0.5">{PRED_ICON[val] || '⚪'}</p>
                  <p className="text-xs font-bold" style={{ color: pc.text }}>{PRED_LABEL[val] || 'N/D'}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{pc.est}</p>
                </div>
              )
            })}
          </div>
          {/* Confianza predicción */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Confianza predicción</span>
              <span>{confianza}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${confianza}%`, background: cfg.dark }} />
            </div>
          </div>
        </div>

        {/* Recomendación operativa */}
        {recomendacion && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
               style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe' }}>
            <Navigation size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-0.5">Recomendación operativa</p>
              <p className="text-sm text-slate-700 leading-snug">{recomendacion}</p>
            </div>
          </div>
        )}

        {/* Reportes activos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Radio size={10} /> Reportes activos
            </p>
            {hasData && (
              <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                En vivo
              </span>
            )}
          </div>

          {loadingReports ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">📡</p>
              <p className="text-sm font-bold text-slate-600">Sin reportes activos en esta zona</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                El estado mostrado es una estimación por patrón horario.<br />
                Reporta lo que ves para ayudar a la comunidad.
              </p>
              <ReportButton section={section} />
            </div>
          ) : (
            <Stagger className="space-y-3">
              {reports.map(report => {
                const rc = STATUS_COLOR[report.status] || STATUS_COLOR.unknown
                return (
                  <Stagger.Item key={report.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <StatusBadge status={report.status} size="sm" />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                  style={{ background: rc.dark }}>
                              ⏱ {rc.est}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-1.5">
                            por <strong className="text-slate-700">{report.profiles?.username || 'Operador anónimo'}</strong>
                          </p>
                          {report.comment && (
                            <p className="text-sm text-slate-600 leading-snug bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              "{report.comment}"
                            </p>
                          )}
                          <ConfirmReaction report={report} />
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={8} />
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
                          </span>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <CheckCircle2 size={10} className="text-green-400" />
                            <span className="text-[10px] text-slate-400">{report.confirmations}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Stagger.Item>
                )
              })}
            </Stagger>
          )}
        </div>

        {/* Chat */}
        {section?.id && <SectionChat sectionId={section.id} />}

        {/* Disclaimer */}
        <div className="text-center py-3">
          <p className="text-[10px] text-slate-300 leading-relaxed max-w-md mx-auto">
            La información es colaborativa y referencial. No sustituye instrucciones oficiales de autoridades,
            terminales, patios, aduanas o dependencias del Puerto de Manzanillo.
          </p>
        </div>
      </div>
    </div>
  )
}
