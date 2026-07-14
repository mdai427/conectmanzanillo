import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp, BarChart2, Users, Clock, Zap, RefreshCw,
  Trophy, MapPin, AlertTriangle, CheckCircle2, Activity,
  Shield, Star, ArrowRight, Info, Navigation,
} from 'lucide-react'
import { api } from '../lib/api.js'
import ReputacionBadge, { NIVELES } from '../components/ui/ReputacionBadge.jsx'

/* ─── Constantes ──────────────────────────────────────────── */
const STATUS_COLOR = {
  free:      { bg: '#dcfce7', border: '#86efac', text: '#16a34a', label: '🟢 Libre',     dark: '#16a34a', est: '5-15 min' },
  moderate:  { bg: '#fef9c3', border: '#fde047', text: '#ca8a04', label: '🟡 Moderado',  dark: '#ca8a04', est: '20-45 min' },
  congested: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', label: '🔴 Saturado',  dark: '#dc2626', est: '45-90+ min' },
  closed:    { bg: '#f1f5f9', border: '#94a3b8', text: '#475569', label: '⚫ Cerrado',   dark: '#475569', est: 'No disponible' },
  unknown:   { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', label: '⚪ Sin datos', dark: '#94a3b8', est: 'Sin datos' },
}

const PRED_LABEL = { free: 'Libre', moderate: 'Moderado', congested: 'Saturado', closed: 'Cerrado' }
const PRED_ICON  = { free: '🟢', moderate: '🟡', congested: '🔴', closed: '⚫' }

// Patrón horario típico del Puerto de Manzanillo por hora del día
const PATRON_HORARIO = {
  0: 'free', 1: 'free', 2: 'free', 3: 'free',
  4: 'moderate', 5: 'moderate',
  6: 'congested', 7: 'congested', 8: 'congested',
  9: 'moderate', 10: 'moderate', 11: 'moderate',
  12: 'free', 13: 'free',
  14: 'moderate', 15: 'moderate',
  16: 'congested', 17: 'congested',
  18: 'moderate', 19: 'moderate',
  20: 'free', 21: 'free', 22: 'free', 23: 'free',
}

const SCHEDULE_HOURS = [6, 8, 10, 12, 14, 16, 18, 20]

function getBadgeSource(confidence, hasRealData) {
  if (!hasRealData) return { label: 'Patrón horario', color: '#94a3b8' }
  if (confidence >= 80)  return { label: 'Comunidad verificada', color: '#16a34a' }
  if (confidence >= 60)  return { label: 'Datos comunitarios', color: '#3b82f6' }
  return { label: 'Confianza limitada', color: '#f59e0b' }
}

/* ─── Componente: Heat Map Zona ───────────────────────────── */
function HeatMapZone({ section }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_COLOR[section.status] || STATUS_COLOR.unknown
  const hasData = section.status !== 'unknown' && section.active_reports > 0
  const source = getBadgeSource(section.confidence || 0, hasData)
  const horaActual = new Date().getHours()
  const predNext = PATRON_HORARIO[(horaActual + 1) % 24]
  const cfgNext = STATUS_COLOR[predNext]

  return (
    <div
      className="rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md"
      style={{ background: cfg.bg, borderColor: expanded ? cfg.dark : cfg.border }}
      onClick={() => setExpanded(e => !e)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: cfg.text }}>
            {cfg.label}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: cfg.dark }}>
            {section.active_reports || 0} rep.
          </span>
        </div>
        <p className="text-sm font-black text-slate-800 leading-tight mb-2">{section.name}</p>

        {/* Barra de congestión */}
        <div className="h-1.5 rounded-full overflow-hidden bg-white/60 mb-2">
          <div className="h-full rounded-full transition-all"
               style={{
                 width: section.status === 'congested' ? '88%'
                      : section.status === 'moderate' ? '52%'
                      : section.status === 'free' ? '12%' : '0%',
                 background: cfg.dark,
               }} />
        </div>

        {/* Tiempo estimado */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold" style={{ color: cfg.text }}>
            ⏱ {cfg.est}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <span>Próx: {PRED_ICON[predNext]} {PRED_LABEL[predNext]}</span>
          </span>
        </div>
      </div>

      {/* Expandible */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: cfg.border, background: 'rgba(255,255,255,0.5)' }}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Fuente:</span>
            <span className="font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: source.color, fontSize: 9 }}>
              {source.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Siguiente hora:</span>
            <span style={{ color: cfgNext.text }} className="font-bold">{cfgNext.label}</span>
          </div>
          {section.last_report_at && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Último reporte:</span>
              <span className="text-slate-700 font-medium">
                {formatDistanceToNow(new Date(section.last_report_at), { addSuffix: true, locale: es })}
              </span>
            </div>
          )}
          {!hasData && (
            <p className="text-[10px] text-slate-400 italic mt-1">
              Estimación basada en patrones históricos del puerto
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Componente: Prediction Card ─────────────────────────── */
function PredCard({ pred }) {
  const cfg = STATUS_COLOR[pred.estado_actual] || STATUS_COLOR.unknown
  const estActual = cfg.est
  const est1h = STATUS_COLOR[pred.pred_1hr]?.est || 'N/D'
  const hasRealData = (pred.confianza || 0) >= 60
  const source = getBadgeSource(pred.confianza || 0, hasRealData)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-slate-800">{pred.nombre}</p>
            <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-1"
                  style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
              {cfg.label} ahora
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Confianza</p>
            <p className="text-lg font-black" style={{ color: (pred.confianza||0) >= 70 ? '#16a34a' : '#f59e0b' }}>
              {pred.confianza || '~'}%
            </p>
          </div>
        </div>
      </div>

      {/* Tiempos estimados */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3 bg-slate-50/60 border-b border-slate-100">
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Tiempo est. ahora</p>
          <p className="text-sm font-black" style={{ color: cfg.text }}>{estActual}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">En 1 hora</p>
          <p className="text-sm font-black" style={{ color: STATUS_COLOR[pred.pred_1hr]?.text || '#94a3b8' }}>{est1h}</p>
        </div>
      </div>

      {/* Predicciones 30m / 1h / 2h */}
      <div className="grid grid-cols-3 gap-2 p-4 pb-3">
        {[
          { label: '30 min', val: pred.pred_30min },
          { label: '1 hora', val: pred.pred_1hr },
          { label: '2 horas', val: pred.pred_2hr },
        ].map(({ label, val }) => (
          <div key={label} className="text-center rounded-xl py-2 px-1"
               style={{ background: STATUS_COLOR[val]?.bg || '#f8fafc', border: `1px solid ${STATUS_COLOR[val]?.border || '#e2e8f0'}` }}>
            <p className="text-base">{PRED_ICON[val] || '⚪'}</p>
            <p className="text-[9px] font-black text-slate-500 mt-0.5">{label}</p>
            <p className="text-[10px] font-bold" style={{ color: STATUS_COLOR[val]?.text || '#94a3b8' }}>
              {PRED_LABEL[val] || 'N/D'}
            </p>
          </div>
        ))}
      </div>

      {/* Fuente + Recomendación */}
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                style={{ background: source.color }}>
            {source.label}
          </span>
          <span className="text-[9px] text-slate-400">· Últ. act.: ahora</span>
        </div>

        {pred.tip && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-start gap-2">
            <Navigation size={11} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-700 font-semibold leading-snug">{pred.tip}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Componente: Schedule Heatmap ────────────────────────── */
function ScheduleHeatmap({ sections, predictions }) {
  const horaActual = new Date().getHours()

  // Combinar predicciones IA con patrón base
  const getStatusForHour = (sectionSlug, hour) => {
    // Si hay predicción IA y es hora cercana, usarla
    if (predictions?.predicciones) {
      const pred = predictions.predicciones.find(p => p.slug === sectionSlug)
      if (pred) {
        if (hour === horaActual) return { status: pred.estado_actual, source: 'real' }
        const diff = hour - horaActual
        if (diff > 0 && diff <= 1) return { status: pred.pred_1hr, source: 'ia' }
        if (diff > 1 && diff <= 2) return { status: pred.pred_2hr, source: 'ia' }
      }
    }
    // Si no hay predicción, usar patrón horario base
    return { status: PATRON_HORARIO[hour % 24] || 'unknown', source: 'patron' }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
          <Activity size={11} /> Predicción por horario
        </p>
        <p className="text-xs text-slate-400">
          Congestión estimada para las zonas del puerto por franja horaria
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wide w-36">Zona</th>
              {SCHEDULE_HOURS.map(h => (
                <th key={h}
                    className={`px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wide ${
                      horaActual >= h && horaActual < h + 2 ? 'text-blue-600 bg-blue-50' : 'text-slate-400'
                    }`}>
                  {h}:00
                  {horaActual >= h && horaActual < h + 2 && (
                    <span className="block text-[8px] text-blue-500">ahora</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sections || []).slice(0, 8).map((section, idx) => (
              <tr key={section.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                <td className="px-4 py-2.5 font-semibold text-slate-700 text-xs leading-tight min-w-[140px]">
                  {section.name}
                </td>
                {SCHEDULE_HOURS.map(h => {
                  const { status, source } = getStatusForHour(section.slug, h)
                  const cfg = STATUS_COLOR[status] || STATUS_COLOR.unknown
                  const isNow = horaActual >= h && horaActual < h + 2
                  return (
                    <td key={h} className={`px-2 py-1.5 text-center ${isNow ? 'ring-1 ring-inset ring-blue-300' : ''}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{PRED_ICON[status] || '⚪'}</span>
                        <span className="text-[8px] font-bold" style={{ color: cfg.text }}>
                          {PRED_LABEL[status] || 'N/D'}
                        </span>
                        {source === 'patron' && (
                          <span className="text-[7px] text-slate-300">patrón</span>
                        )}
                        {source === 'ia' && (
                          <span className="text-[7px] text-blue-400">IA</span>
                        )}
                        {source === 'real' && (
                          <span className="text-[7px] text-green-500">real</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
        {[
          { color: '#16a34a', label: 'Libre' },
          { color: '#ca8a04', label: 'Moderado' },
          { color: '#dc2626', label: 'Saturado' },
          { color: '#475569', label: 'Cerrado' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-slate-300">
          Patrón horario + datos de comunidad + IA
        </span>
      </div>
    </div>
  )
}

/* ─── Componente: Ranking Row ─────────────────────────────── */
function RankingRow({ user, position }) {
  const isTop3 = position <= 3
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const nivelCfg = NIVELES[user.nivel] || NIVELES.nuevo
  const reliability = user.total_reportes > 0
    ? Math.round((user.reportes_confirmados / user.total_reportes) * 100)
    : 0

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all`}
         style={isTop3 ? {
           background: position === 1 ? 'linear-gradient(90deg, #fefce8, #fff)'
                     : position === 2 ? 'linear-gradient(90deg, #f8fafc, #fff)'
                     : 'linear-gradient(90deg, #fff7ed, #fff)',
           border: '1px solid',
           borderColor: position === 1 ? '#fde047' : position === 2 ? '#cbd5e1' : '#fed7aa',
         } : { borderBottom: '1px solid #f1f5f9' }}>
      <div className="w-7 text-center shrink-0">
        {isTop3
          ? <span className="text-xl">{medals[position]}</span>
          : <span className="text-xs font-black text-slate-400">#{position}</span>}
      </div>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
           style={{ background: `${nivelCfg.color}18`, border: `1px solid ${nivelCfg.color}44` }}>
        {nivelCfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 break-all">{user.username || 'Operador'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400">{user.total_reportes} reportes</span>
          <span className="text-[10px] font-bold" style={{ color: reliability >= 70 ? '#16a34a' : reliability >= 40 ? '#f59e0b' : '#94a3b8' }}>
            {reliability}% fiabilidad
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-slate-800">{(user.puntos || 0).toLocaleString()}</p>
        <p className="text-[9px] text-slate-400 flex items-center justify-end gap-0.5">
          <CheckCircle2 size={8} className="text-green-400" />
          {user.reportes_confirmados} conf.
        </p>
      </div>
    </div>
  )
}

/* ─── Componente: Timeline Item ───────────────────────────── */
function TimelineItem({ report, idx }) {
  const cfg = STATUS_COLOR[report.status] || STATUS_COLOR.unknown
  const isCongested = report.status === 'congested'
  const isConfirmed = report.confirmations >= 3
  const eventType = isCongested && report.confirmations >= 2 ? 'alert'
                  : isConfirmed ? 'confirmed'
                  : 'report'

  const icons = {
    alert:     { emoji: '🚨', label: 'Saturación detectada', color: '#dc2626' },
    confirmed: { emoji: '✅', label: 'Reporte confirmado',   color: '#16a34a' },
    report:    { emoji: '📡', label: 'Reporte recibido',     color: '#3b82f6' },
  }
  const ev = icons[eventType]

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border-2 bg-white"
             style={{ borderColor: ev.color }}>
          {ev.emoji}
        </div>
        {idx > 0 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: ev.color }}>
            {ev.label}
          </span>
          <span className="text-[10px] text-slate-300 ml-auto shrink-0 flex items-center gap-1">
            <Clock size={8} />
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
            <span className="text-xs font-bold text-slate-700">{report.sections?.name}</span>
          </div>
          {report.comment && <p className="text-xs text-slate-500 leading-snug mb-1">{report.comment}</p>}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span>por <strong className="text-slate-600">{report.profiles?.username || 'Anónimo'}</strong></span>
            <span>👍 {report.confirmations}</span>
            <span>👎 {report.contradictions}</span>
            {isCongested && (
              <span className="text-red-500 font-bold">⚠️ Alta congestión</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Página Principal ────────────────────────────────────── */
export default function Analitica() {
  const [tab, setTab] = useState('prediccion')
  const [rankingTab, setRankingTab] = useState('global')

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: api.getSections,
    refetchInterval: 60_000,
  })

  const { data: predictions, isLoading: predLoading, refetch: refetchPred, dataUpdatedAt } = useQuery({
    queryKey: ['predictions'],
    queryFn: async () => {
      const res = await fetch('/api/predictions')
      if (!res.ok) throw new Error('Error predicciones')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  })

  const { data: rankings = [], isLoading: rankLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: async () => {
      const res = await fetch('/api/rankings')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports?limit=40')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const TABS = [
    { id: 'prediccion', label: 'IA Predictiva', icon: Zap },
    { id: 'horario',    label: 'Por horario',   icon: Clock },
    { id: 'heatmap',    label: 'Heat Map',      icon: Activity },
    { id: 'ranking',    label: 'Rankings',      icon: Trophy },
    { id: 'timeline',   label: 'Historial',     icon: TrendingUp },
  ]

  const freeCount    = sections.filter(s => s.status === 'free').length
  const congestCount = sections.filter(s => s.status === 'congested').length
  const totalReports = sections.reduce((a, s) => a + (s.active_reports || 0), 0)
  const predUpdatedAgo = dataUpdatedAt
    ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: es })
    : null

  // Rankings por zona (más reportes)
  const zonasMasReportadas = [...sections]
    .sort((a, b) => (b.active_reports || 0) - (a.active_reports || 0))
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <BarChart2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Analítica del Puerto</h1>
              <p className="text-xs text-slate-400">Inteligencia operativa · Puerto de Manzanillo</p>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Activity,     color: '#3b82f6', val: sections.length,   label: 'Zonas',        sub: 'monitoreadas' },
              { icon: CheckCircle2, color: '#10b981', val: freeCount,          label: 'Libres',       sub: 'ahora' },
              { icon: AlertTriangle,color: '#dc2626', val: congestCount,       label: 'Saturadas',    sub: 'ahora' },
              { icon: Users,        color: '#8b5cf6', val: totalReports,       label: 'Reportes',     sub: 'activos' },
            ].map(({ icon: Icon, color, val, label, sub }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                     style={{ background: `${color}18` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <p className="text-xl font-black text-slate-800">{val}</p>
                <p className="text-[9px] text-slate-500 font-semibold">{label}</p>
                <p className="text-[8px] text-slate-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ── IA PREDICTIVA ───────────────────────────────── */}
        {tab === 'prediccion' && (
          <>
            {predLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Generando predicciones con IA…</p>
                <p className="text-xs text-slate-400 mt-1">Analizando patrones del puerto</p>
              </div>
            ) : predictions ? (
              <>
                {/* Resumen general */}
                <div className="rounded-2xl p-4 border"
                     style={{ background: 'linear-gradient(135deg, #eff6ff, #fff)', borderColor: '#bfdbfe' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                      <Zap size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
                        Estado general del puerto
                      </p>
                      <p className="text-sm font-bold text-slate-800">{predictions.resumen}</p>
                      {predictions.mejor_momento && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <CheckCircle2 size={12} className="text-green-500" />
                          <p className="text-xs text-slate-600 font-medium">{predictions.mejor_momento}</p>
                        </div>
                      )}
                      {predictions.hora_pico && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={12} className="text-amber-500" />
                          <p className="text-xs text-slate-500">{predictions.hora_pico}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => refetchPred()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center border border-blue-100 text-blue-400 hover:bg-blue-50 transition-all shrink-0">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  {predUpdatedAgo && (
                    <p className="text-[10px] text-slate-300 mt-3 flex items-center gap-1">
                      <Clock size={9} />
                      Actualizado {predUpdatedAgo}{predictions.cached ? ' · desde caché (15 min)' : ''}
                    </p>
                  )}
                </div>

                {/* Aviso de datos */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <Info size={12} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700">
                    Las predicciones se basan en reportes de la comunidad, patrones históricos y análisis IA.
                    Son orientativas y se actualizan cada 15 minutos.
                  </p>
                </div>

                {/* Cards predicción */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(predictions.predicciones || []).length > 0
                    ? predictions.predicciones.map(pred => <PredCard key={pred.slug} pred={pred} />)
                    : sections.map(s => (
                        <PredCard key={s.id} pred={{
                          slug: s.slug,
                          nombre: s.name,
                          estado_actual: s.status || 'unknown',
                          pred_30min: PATRON_HORARIO[(new Date().getHours() + 1) % 24],
                          pred_1hr:   PATRON_HORARIO[(new Date().getHours() + 1) % 24],
                          pred_2hr:   PATRON_HORARIO[(new Date().getHours() + 2) % 24],
                          confianza: 45,
                          tip: 'Estimación por patrón horario. Reporta para mejorar la precisión.',
                        }} />
                      ))
                  }
                </div>

                <p className="text-[10px] text-slate-300 text-center">
                  Predicciones IA · Datos comunitarios · No sustituyen información oficial de terminales
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Info size={12} className="text-amber-500" />
                  <p className="text-[11px] text-amber-700">Sin conexión a predicciones IA. Mostrando estimaciones por patrón horario.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sections.map(s => (
                    <PredCard key={s.id} pred={{
                      slug: s.slug,
                      nombre: s.name,
                      estado_actual: s.status || 'unknown',
                      pred_30min: PATRON_HORARIO[(new Date().getHours() + 1) % 24],
                      pred_1hr:   PATRON_HORARIO[(new Date().getHours() + 1) % 24],
                      pred_2hr:   PATRON_HORARIO[(new Date().getHours() + 2) % 24],
                      confianza: 40,
                      tip: 'Estimación por patrón histórico del puerto. Confianza limitada.',
                    }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PREDICCIÓN POR HORARIO ──────────────────────── */}
        {tab === 'horario' && (
          <div className="space-y-4">
            {sectionsLoading ? (
              <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ) : (
              <ScheduleHeatmap sections={sections} predictions={predictions} />
            )}

            {/* Mejores horarios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={11} /> Mejores horarios para ingresar
                </p>
                <div className="space-y-2">
                  {[
                    { hora: '12:00 – 14:00', desc: 'Menor congestión del día', stars: 5 },
                    { hora: '06:00 – 06:30', desc: 'Antes del pico matutino', stars: 4 },
                    { hora: '20:00 – 22:00', desc: 'Operaciones nocturnas', stars: 4 },
                  ].map(({ hora, desc, stars }) => (
                    <div key={hora} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-green-100">
                      <div>
                        <p className="text-sm font-black text-slate-800">{hora}</p>
                        <p className="text-[10px] text-slate-500">{desc}</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={10} className={i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> Horarios a evitar
                </p>
                <div className="space-y-2">
                  {[
                    { hora: '06:00 – 10:00', desc: 'Pico máximo matutino', nivel: '🔴 Saturado' },
                    { hora: '16:00 – 18:00', desc: 'Pico vespertino', nivel: '🔴 Saturado' },
                    { hora: '14:00 – 16:00', desc: 'Congestión moderada-alta', nivel: '🟡 Moderado' },
                  ].map(({ hora, desc, nivel }) => (
                    <div key={hora} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-red-100">
                      <div>
                        <p className="text-sm font-black text-slate-800">{hora}</p>
                        <p className="text-[10px] text-slate-500">{desc}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-black">{nivel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
              <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Basado en patrón histórico del Puerto de Manzanillo. Los horarios pueden variar por operativos,
                clima, temporada y días de la semana. Repórtanos lo que ves para mejorar la precisión.
              </p>
            </div>
          </div>
        )}

        {/* ── HEAT MAP ────────────────────────────────────── */}
        {tab === 'heatmap' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Info size={11} />
              Toca una tarjeta para ver detalles · Datos de la comunidad en tiempo real
            </p>

            {sectionsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center">
                <p className="text-3xl mb-2">🗺️</p>
                <p className="text-sm text-slate-500">Sin zonas disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sections.map(s => <HeatMapZone key={s.id} section={s} />)}
              </div>
            )}

            {/* Distribución */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Distribución actual</p>
              {Object.entries(
                sections.reduce((acc, s) => {
                  const st = s.status || 'unknown'
                  acc[st] = (acc[st] || 0) + 1
                  return acc
                }, {})
              ).map(([status, count]) => {
                const cfg = STATUS_COLOR[status] || STATUS_COLOR.unknown
                const pct = sections.length > 0 ? Math.round((count / sections.length) * 100) : 0
                return (
                  <div key={status} className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: cfg.text }} className="font-bold">{cfg.label}</span>
                      <span className="text-slate-400">{count} zona{count !== 1 ? 's' : ''} · {pct}% · {cfg.est}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${pct}%`, background: cfg.dark }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── RANKINGS ────────────────────────────────────── */}
        {tab === 'ranking' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'global',  label: 'Globales' },
                { id: 'zonas',   label: 'Zonas + activas' },
                { id: 'niveles', label: 'Niveles' },
              ].map(t => (
                <button key={t.id} onClick={() => setRankingTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    rankingTab === t.id ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Top reporteros globales */}
            {rankingTab === 'global' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Trophy size={13} className="text-amber-500" />
                    Top reporteros del puerto
                  </p>
                  <span className="text-[10px] text-slate-400">por puntos totales</span>
                </div>
                {rankLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🏆</p>
                    <p className="text-sm text-slate-500">Sé el primero en reportar y aparecer aquí</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {rankings.map((u, i) => <RankingRow key={u.id} user={u} position={i + 1} />)}
                  </div>
                )}
              </div>
            )}

            {/* Zonas más activas */}
            {rankingTab === 'zonas' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <MapPin size={13} className="text-blue-500" />
                    Zonas con más actividad
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {zonasMasReportadas.map((s, i) => {
                    const cfg = STATUS_COLOR[s.status] || STATUS_COLOR.unknown
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-sm font-black text-slate-400 w-5">#{i + 1}</span>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.dark }} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{cfg.label} · {cfg.est}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">{s.active_reports || 0}</p>
                          <p className="text-[9px] text-slate-400">reportes</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Niveles */}
            {rankingTab === 'niveles' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Star size={11} /> Sistema de niveles — Faro Portuario
                </p>
                <div className="space-y-3">
                  {Object.entries(NIVELES).map(([key, cfg]) => {
                    const usersInLevel = rankings.filter(u => u.nivel === key).length
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-xl border"
                           style={{ background: cfg.bg, borderColor: cfg.border }}>
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-black" style={{ color: cfg.color }}>{cfg.label}</p>
                          <p className="text-[10px] text-slate-400">{cfg.min.toLocaleString()} puntos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-slate-700">{usersInLevel}</p>
                          <p className="text-[9px] text-slate-400">usuarios</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-xs font-bold text-blue-700 mb-1">¿Cómo subir de nivel?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { pts: '+5', label: 'Enviar reporte' },
                      { pts: '+10', label: 'Confirmación' },
                      { pts: '+15', label: 'Alta precisión' },
                    ].map(({ pts, label }) => (
                      <div key={label} className="bg-white rounded-lg p-2 text-center border border-blue-100">
                        <p className="text-sm font-black text-blue-600">{pts}</p>
                        <p className="text-[9px] text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ───────────────────────────────────── */}
        {tab === 'timeline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Últimos reportes activos · actualiza cada minuto
              </p>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            {timelineLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />)}
              </div>
            ) : timeline.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-3xl mb-2">📡</p>
                <p className="text-sm font-bold text-slate-600">Sin reportes activos en este momento</p>
                <p className="text-xs text-slate-400 mt-1">Sé el primero en reportar lo que ves en el puerto</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                {timeline.map((r, i) => (
                  <TimelineItem key={r.id} report={r} idx={timeline.length - 1 - i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
