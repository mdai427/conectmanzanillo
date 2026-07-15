import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Activity, AlertTriangle, Anchor, ArrowRight, Building2, CheckCircle2,
  ChevronRight, Clock3, Container, Gauge, MapPin, Radio, Route, Search,
  ShieldCheck, Sparkles, Truck, Users, Warehouse,
} from 'lucide-react'
import { useSections } from '../hooks/useSections.js'
import ReportModal from '../components/ui/ReportModal.jsx'
import PortLiveMap from '../components/ui/PortLiveMap.jsx'

const STATUS = {
  free: { label: 'Fluido', hint: 'Circulación reportada sin demora relevante', color: '#22c55e', soft: 'bg-emerald-50 text-emerald-800 border-emerald-200', glow: 'shadow-[0_0_24px_rgba(34,197,94,.22)]' },
  moderate: { label: 'Con carga', hint: 'Avance lento o espera moderada', color: '#f59e0b', soft: 'bg-amber-50 text-amber-800 border-amber-200', glow: 'shadow-[0_0_24px_rgba(245,158,11,.22)]' },
  congested: { label: 'Saturado', hint: 'Demora alta reportada por la comunidad', color: '#ef4444', soft: 'bg-red-50 text-red-800 border-red-200', glow: 'shadow-[0_0_24px_rgba(239,68,68,.22)]' },
  closed: { label: 'Sin paso', hint: 'Acceso no disponible según reportes', color: '#64748b', soft: 'bg-slate-100 text-slate-700 border-slate-300', glow: '' },
  unknown: { label: 'Sin confirmar', hint: 'Aún no existen reportes recientes', color: '#94a3b8', soft: 'bg-slate-50 text-slate-600 border-slate-200', glow: '' },
}

const GROUPS = [
  { id: 'all', label: 'Todas', icon: Activity },
  { id: 'access', label: 'Accesos y vialidades', icon: Route, test: /acceso|libramiento|báscula|bascula|vialidad|carretera|cruce|glorieta/i },
  { id: 'yards', label: 'Patios y regulación', icon: Warehouse, test: /patio|industrial|contenedor|ferroviario/i },
  { id: 'customs', label: 'Aduana y trámites', icon: ShieldCheck, test: /aduana|verificación|verificacion|ventanilla/i },
  { id: 'terminals', label: 'Terminales', icon: Container, test: /terminal|impala|ssa|ictsi|tmesa/i },
  { id: 'services', label: 'Servicios', icon: Building2 },
]

function currentStatus(section) {
  return Number(section.active_reports || 0) > 0 ? (section.status || 'unknown') : 'unknown'
}

function groupFor(section) {
  const text = `${section.name} ${section.slug} ${section.description || ''}`
  return GROUPS.slice(1, -1).find((group) => group.test.test(text))?.id || 'services'
}

async function fetchRecentReports() {
  const response = await fetch('/api/reports?limit=8')
  if (!response.ok) return []
  return response.json()
}

export default function PortStatus() {
  const navigate = useNavigate()
  const { data: sections = [], isLoading } = useSections()
  const { data: reports = [] } = useQuery({ queryKey: ['port-pulse-reports'], queryFn: fetchRecentReports, refetchInterval: 30_000, staleTime: 20_000 })
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [reporting, setReporting] = useState(null)

  const filtered = useMemo(() => sections.filter((section) => {
    const matchesText = `${section.name} ${section.description || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesText && (group === 'all' || groupFor(section) === group)
  }), [sections, query, group])

  const totals = useMemo(() => sections.reduce((acc, section) => {
    const status = currentStatus(section)
    acc[status] = (acc[status] || 0) + 1
    acc.reports += Number(section.active_reports || 0)
    return acc
  }, { free: 0, moderate: 0, congested: 0, closed: 0, unknown: 0, reports: 0 }), [sections])

  const lastUpdate = sections.map((section) => section.last_report_at).filter(Boolean).sort().at(-1)

  return <div className="min-h-screen bg-[#f4f7f7] text-slate-950">
    <section className="relative isolate overflow-hidden bg-[#061e26] text-white">
      <img src="/puerto-hero.jpg" alt="Vista del Puerto de Manzanillo" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_22%,rgba(45,212,191,.17),transparent_28%),linear-gradient(100deg,rgba(4,25,33,.98),rgba(4,25,33,.84))]" />
      <div className="port-grid absolute inset-0 -z-10 opacity-25" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-teal-200"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-60"/><span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300"/></span> Pulso comunitario</div>
            <h1 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-6xl">Entiende el puerto antes de moverte.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Consulta zonas, identifica puntos con demora y comparte lo que ves. Cada estado muestra cuándo se actualizó y cuánta evidencia comunitaria tiene.</p>
          </div>
          <div className="grid min-w-full grid-cols-2 gap-2 sm:min-w-[440px] sm:grid-cols-4">
            {[['free','Fluidas'],['moderate','Con carga'],['congested','Saturadas'],['unknown','Sin confirmar']].map(([status,label]) => <div key={status} className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-md"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: STATUS[status].color, boxShadow: `0 0 14px ${STATUS[status].color}` }}/><span className="text-[10px] font-bold text-slate-300">{label}</span></div><p className="mt-2 text-2xl font-black">{totals[status]}</p></div>)}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[10px] font-semibold text-slate-400"><span className="flex items-center gap-1.5"><Radio size={12} className="text-teal-300" /> Actualización automática cada 60 segundos</span><span>{totals.reports} reportes activos</span><span>{lastUpdate ? `Último reporte ${formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: es })}` : 'Esperando el primer reporte reciente'}</span><span className="flex items-center gap-1.5 text-amber-200"><AlertTriangle size={12}/> Información comunitaria, no oficial</span></div>
      </div>
    </section>

    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(8,31,44,.06)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><span className="sr-only">Buscar una zona</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un acceso, patio, terminal o servicio" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50"/></label>
              <button onClick={() => document.getElementById('zonas')?.scrollIntoView()} className="port-glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0d5b55] px-5 text-xs font-black text-white"><MapPin size={16}/> Explorar zonas</button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{GROUPS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setGroup(id)} aria-pressed={group === id} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition ${group === id ? 'border-[#0d5b55] bg-[#0d5b55] text-white shadow-[0_0_20px_rgba(13,91,85,.2)]' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-500 hover:text-teal-800'}`}><Icon size={14}/>{label}</button>)}</div>
          </section>

          <PortLiveMap sections={sections} onReport={setReporting}/>

          <section id="zonas" className="mt-6">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">Mapa de decisiones</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#081f2c]">{filtered.length} zonas para consultar</h2></div><p className="hidden text-xs text-slate-400 sm:block">Selecciona una para ver detalle o reportar</p></div>
            {isLoading ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-white"/>)}</div> : filtered.length ? <div className="grid gap-3 sm:grid-cols-2">{filtered.map((section, index) => <ZoneCard key={section.id} section={section} index={index} onOpen={() => navigate(`/seccion/${section.slug}`)} onReport={() => setReporting(section)}/>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Search className="mx-auto text-slate-300"/><h3 className="mt-3 font-black">No encontramos esa zona</h3><p className="mt-2 text-sm text-slate-500">Prueba con otro nombre o selecciona “Todas”.</p></div>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-3xl bg-[#082f35] p-5 text-white shadow-[0_20px_55px_rgba(8,47,53,.18)]"><div className="flex items-center gap-2 text-teal-200"><Sparkles size={17}/><p className="text-[10px] font-black uppercase tracking-[.18em]">Reporte rápido</p></div><h2 className="mt-4 text-xl font-black">Lo que ves ayuda a todos.</h2><p className="mt-2 text-xs leading-5 text-teal-50/70">Elige una zona y marca si está fluida, con carga, saturada o sin paso.</p><button onClick={() => document.getElementById('zonas')?.scrollIntoView()} className="port-glow-button mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-xs font-black text-[#062b2f]"><Radio size={16}/> Elegir una zona</button><p className="mt-3 text-center text-[9px] leading-4 text-teal-100/50">Necesitas una cuenta para enviar. Consultar es público.</p></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={17} className="text-teal-700"/> Cómo leer los datos</h2><div className="mt-4 space-y-3">{Object.entries(STATUS).map(([key, item]) => <div key={key} className="flex items-start gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background:item.color }}/><div><p className="text-xs font-black text-slate-700">{item.label}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400">{item.hint}</p></div></div>)}</div></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-black">Actividad reciente</h2><Clock3 size={15} className="text-slate-400"/></div>{reports.length ? <div className="mt-3 divide-y divide-slate-100">{reports.slice(0,5).map((report) => <div key={report.id} className="py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: STATUS[report.status]?.color }}/><p className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">{report.sections?.name}</p></div><p className="mt-1 pl-4 text-[10px] text-slate-400">{formatDistanceToNow(new Date(report.created_at), { addSuffix:true, locale:es })}</p></div>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-400">Aún no hay reportes activos. Puedes abrir la primera actualización.</p>}</section>
          <Link to="/noticias" className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-xs font-black text-slate-700 hover:border-teal-500"><span>Ver noticias y avisos</span><ArrowRight size={15} className="transition group-hover:translate-x-1"/></Link>
        </aside>
      </div>
    </main>
    <ReportModal open={Boolean(reporting)} section={reporting} onClose={() => setReporting(null)}/>
  </div>
}

function ZoneCard({ section, index, onOpen, onReport }) {
  const status = currentStatus(section)
  const config = STATUS[status]
  const confidence = status === 'unknown' ? 0 : Math.round(Number(section.confidence || 0) * 100)
  return <article className="zone-reveal group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(8,31,44,.045)] transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-[0_18px_38px_rgba(8,31,44,.10)]" style={{ animationDelay:`${Math.min(index, 8) * 45}ms` }}>
    <button onClick={onOpen} className="w-full p-5 text-left"><div className="flex items-start gap-4"><div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${config.soft} ${config.glow}`}><MapPin size={20}/>{status !== 'unknown' && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white" style={{ background:config.color, boxShadow:`0 0 12px ${config.color}` }}/>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-black leading-5 text-[#081f2c]">{section.name}</h3><ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-700"/></div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">{section.description || 'Consulta la actividad reciente de esta zona.'}</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${config.soft}`}><span className="h-1.5 w-1.5 rounded-full" style={{ background:config.color }}/>{config.label}</span><span className="text-[10px] font-semibold text-slate-400">{status === 'unknown' ? 'Sin evidencia reciente' : `${section.active_reports} reportes · ${confidence}% confianza`}</span></div>{status !== 'unknown' && <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-700" style={{ width:`${Math.max(confidence,12)}%`, background:config.color }}/></div>}</button>
    <div className="flex border-t border-slate-100"><button onClick={onOpen} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">Ver detalle <ArrowRight size={12}/></button><button onClick={onReport} className="port-report-action flex min-h-11 flex-1 items-center justify-center gap-1.5 border-l border-slate-100 text-[10px] font-black text-teal-800 hover:bg-teal-50"><Radio size={12}/> Reportar ahora</button></div>
  </article>
}
