import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BookOpenCheck, Check, Download, FileSpreadsheet, FileText, GraduationCap,
  LockKeyhole, Search, ShieldCheck, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import { resourcesApi } from '../../lib/resourcesApi.js'

const FORMAT_STYLE = {
  XLSX: { icon: FileSpreadsheet, label: 'Excel editable', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  DOCX: { icon: FileText, label: 'Word editable', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  PDF: { icon: BookOpenCheck, label: 'PDF descargable', className: 'bg-rose-50 text-rose-800 border-rose-200' },
}

export default function ResourceCatalog({ library, eyebrow, title, description, benefits, note }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const [resources, setResources] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    resourcesApi.list(library)
      .then((data) => { if (active) { setResources(data.resources || []); setError('') } })
      .catch(() => { if (active) setError('No pudimos cargar la biblioteca. Intenta nuevamente en unos minutos.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [library])

  useEffect(() => {
    document.title = `${library === 'training' ? 'Capacitación' : 'Documentos'} | Faro Portuario`
    return () => { document.title = 'Faro Portuario | Ecosistema logístico-portuario' }
  }, [library])

  const categories = useMemo(() => ['Todos', ...new Set(resources.map((item) => item.category))], [resources])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    return resources.filter((item) => {
      const matchesCategory = category === 'Todos' || item.category === category
      const haystack = [item.title, item.description, item.category, ...(item.audiences || [])].join(' ').toLocaleLowerCase('es')
      return matchesCategory && (!term || haystack.includes(term))
    })
  }, [resources, query, category])

  async function download(resource) {
    if (!user) {
      toast('Crea tu cuenta o inicia sesión para descargar gratis', { icon: '🔐' })
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
      return
    }
    setDownloading(resource.id)
    try {
      await resourcesApi.download(resource)
      toast.success('Descarga preparada')
    } catch (downloadError) {
      if (downloadError.status === 401) navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
      else toast.error(downloadError.message)
    } finally { setDownloading('') }
  }

  return <main className="min-h-screen bg-[#f4f7f6] text-slate-950">
    <section className="overflow-hidden bg-[#082f35] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-teal-200">
            {library === 'training' ? <GraduationCap size={14}/> : <Sparkles size={14}/>} {eyebrow}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3"><Check size={15} className="text-teal-300"/>Sin costo</span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3"><LockKeyhole size={15} className="text-teal-300"/>Requiere registro</span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3"><ShieldCheck size={15} className="text-teal-300"/>Revisión 14 julio 2026</span>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[.16em] text-teal-200">Incluido en tu cuenta</p>
          <div className="mt-5 space-y-4">{benefits.map((benefit) => <div key={benefit} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-300 text-[#082f35]"><Check size={14}/></span><p className="text-sm leading-6 text-slate-200">{benefit}</p></div>)}</div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(8,31,44,.06)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar recursos</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={library === 'training' ? 'Buscar por curso, norma o sector' : 'Buscar plantilla o proceso'} className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-50"/>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por categoría">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-11 whitespace-nowrap rounded-xl px-4 text-xs font-extrabold transition ${category === item ? 'bg-[#0d4f4b] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300'}`}>{item}</button>)}</div>
        </div>
      </div>

      {note && <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950"><ShieldCheck size={18} className="mt-0.5 shrink-0"/><p>{note}</p></div>}

      {loading ? <div className="grid min-h-72 place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" aria-label="Cargando biblioteca"/></div> : error ? <div className="mt-8 rounded-3xl border border-rose-200 bg-white p-8 text-center"><p className="font-bold text-slate-800">{error}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#0d4f4b] px-5 py-3 text-xs font-extrabold text-white">Volver a intentar</button></div> : <>
        <div className="mt-8 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-teal-700">Biblioteca Faro</p><h2 className="mt-2 text-2xl font-black tracking-tight">{filtered.length} recursos disponibles</h2></div><p className="hidden text-xs text-slate-500 sm:block">Gratis con una cuenta registrada</p></div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((resource) => <ResourceCard key={resource.id} resource={resource} onDownload={download} loading={downloading === resource.id}/>)}</div>
        {!filtered.length && <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Search className="mx-auto text-slate-300" size={34}/><h3 className="mt-4 font-black">No encontramos coincidencias</h3><p className="mt-2 text-sm text-slate-500">Prueba otra palabra o elimina el filtro.</p></div>}
      </>}
    </section>
  </main>
}

function ResourceCard({ resource, onDownload, loading }) {
  const format = FORMAT_STYLE[resource.format] || FORMAT_STYLE.PDF
  const Icon = format.icon
  return <article className="group flex min-h-[360px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(8,31,44,.045)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(8,31,44,.09)]">
    <div className="flex items-start justify-between gap-3"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${format.className}`}><Icon size={13}/>{format.label}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold text-slate-600">{resource.category}</span></div>
    <h3 className="mt-6 text-xl font-black tracking-tight text-[#082f35]">{resource.title}</h3>
    <p className="mt-3 text-sm leading-6 text-slate-500">{resource.description}</p>
    {resource.reference && <p className="mt-4 text-xs font-extrabold text-teal-800">{resource.reference} • {resource.duration}</p>}
    <div className="mt-5 flex flex-wrap gap-2">{(resource.highlights || resource.audiences || []).slice(0, 3).map((item) => <span key={item} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">{item}</span>)}</div>
    <div className="mt-auto pt-6"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold text-slate-500"><LockKeyhole size={13}/>Descarga gratuita con registro</div><button onClick={() => onDownload(resource)} disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d4f4b] px-4 text-sm font-extrabold text-white transition hover:bg-[#083f3b] disabled:opacity-60"><Download size={16}/>{loading ? 'Preparando…' : 'Descargar gratis'}</button></div>
  </article>
}
