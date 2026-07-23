import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BellRing, CheckCircle2, Clock3, ExternalLink, Newspaper, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Logo from '../components/ui/Logo.jsx'
import BannerRotativo from '../components/ui/BannerRotativo.jsx'
import { API_BASE } from '../lib/apiBase.js'

const CATEGORIES = [
  ['todos', 'Todo'], ['accesos', 'Accesos'], ['puerto', 'Puerto'], ['aduana', 'Aduana'],
  ['transporte', 'Transporte'], ['comercio_exterior', 'Comercio exterior'],
  ['clima', 'Clima'], ['normatividad', 'Normatividad'], ['empleo', 'Empleo'],
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES)

// Respaldo local temático por categoría (solo si falla la imagen remota).
const CATEGORY_IMAGES = {
  accesos: ['/news/accesos-transporte.jpg'],
  transporte: ['/news/accesos-transporte.jpg'],
  empleo: ['/news/accesos-transporte.jpg'],
  puerto: ['/news/puerto-volumen-1.jpg', '/news/puerto-volumen-2.jpg', '/news/puerto-volumen-3.jpg'],
  comercio_exterior: ['/news/puerto-volumen-3.jpg', '/news/aduana-inspeccion.jpg'],
  aduana: ['/news/aduana-inspeccion.jpg'],
  normatividad: ['/news/aduana-inspeccion.jpg'],
  clima: ['/news/clima-operacion.jpg'],
}

// Hash estable: la misma noticia siempre recibe la misma imagen y se reparten.
function hashString(value) {
  let hash = 0
  const str = String(value)
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}

// Semilla única y estable por noticia para no repetir imágenes.
function imageSeed(item) {
  return encodeURIComponent(String(item.id || item.canonical_url || item.title || 'faro')).slice(0, 48)
}

// Imagen principal: la del medio si el feed la ofrece; si no, una imagen
// libre (Picsum) única y determinista por noticia — nunca se repite.
function newsImage(item) {
  if (item.image_url) return item.image_url
  return `https://picsum.photos/seed/faro-${imageSeed(item)}/900/540`
}

// Respaldo local si la imagen remota no carga.
function localFallbackImage(item) {
  const pool = CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.puerto
  return pool[hashString(item.id || item.title || '') % pool.length]
}

async function fetchNews() {
  const response = await fetch(`${API_BASE}/api/news?limit=48`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('No fue posible consultar la actualidad portuaria.')
  return response.json()
}

function NewsCard({ item, featured = false }) {
  const editorialImage = newsImage(item)
  const publishedDate = item.published_at_source || item.published_at_portal
  const when = publishedDate
    ? formatDistanceToNow(new Date(publishedDate), { addSuffix: true, locale: es })
    : 'Fecha por confirmar'

  return (
    <article className={`group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(8,47,53,.06)] transition duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-[0_20px_55px_rgba(8,47,53,.12)] ${featured ? 'lg:grid lg:grid-cols-[1.15fr_.85fr]' : ''}`}>
      <div className={`relative overflow-hidden bg-[#082F35] ${featured ? 'min-h-64 lg:min-h-full' : 'h-40'}`}>
        <img src={editorialImage} alt={`Imagen editorial individual sobre ${CATEGORY_LABEL[item.category] || 'actividad portuaria'}: ${item.title}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" onError={(event) => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = '1'; event.currentTarget.src = localFallbackImage(item) } }} />
        <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-white backdrop-blur">
          {CATEGORY_LABEL[item.category] || 'Sector'}
        </span>
      </div>

      <div className={featured ? 'p-7 sm:p-9' : 'p-6'}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-teal-700"><ShieldCheck size={14} /> Fuente identificada</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {when}</span>
        </div>
        <h2 className={`mt-4 font-black leading-tight tracking-[-.035em] text-[#082F35] ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>{item.title}</h2>
        <p className="mt-4 text-sm leading-6 text-slate-500">{item.editorial_summary}</p>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Fuente original</p>
            <p className="mt-1 truncate text-xs font-extrabold text-slate-700">{item.source_name}</p>
          </div>
          <a href={item.canonical_url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Consultar noticia en ${item.source_name}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#0F766E] px-4 text-xs font-black text-white transition hover:bg-[#0b5f59] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
            Ir a la fuente <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  )
}

export default function Noticias() {
  const [category, setCategory] = useState('todos')
  const [query, setQuery] = useState('')
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['faro-port-news'],
    queryFn: fetchNews,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-MX')
    return (data?.items || []).filter(item => {
      const categoryMatch = category === 'todos' || item.category === category
      const queryMatch = !normalized || `${item.title} ${item.editorial_summary} ${item.source_name}`.toLocaleLowerCase('es-MX').includes(normalized)
      return categoryMatch && queryMatch
    })
  }, [category, data?.items, query])

  const [featured, ...remaining] = filtered

  return (
    <div className="min-h-screen bg-[#F6F8F8] text-slate-950">
      <section className="relative overflow-hidden bg-[#082F35] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_80%_20%,#2DD4BF_0,transparent_27%),radial-gradient(circle_at_10%_90%,#F6B73C_0,transparent_18%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="flex items-center justify-between gap-4"><Logo dark showDescriptor /><span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-teal-200 sm:inline-flex"><span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" /> Actualización editorial</span></div>
          <div className="mt-14 max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-teal-300"><Newspaper size={16} /> Actualidad logística-portuaria</p>
            <h1 className="mt-5 text-4xl font-black tracking-[-.055em] sm:text-6xl">Noticias que mueven a Manzanillo.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Información relevante sobre el puerto, sus accesos, la aduana y el transporte. Cada publicación muestra procedencia, fecha y enlace directo al medio original.</p>
          </div>
          <div className="mt-9 grid max-w-3xl gap-3 text-xs sm:grid-cols-3">
            {[['Fuentes identificadas', ShieldCheck], ['Resumen editorial propio', CheckCircle2], ['Sin copiar artículos', ArrowUpRight]].map(([label, Icon]) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-slate-200"><Icon size={16} className="text-teal-300" />{label}</div>)}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <BannerRotativo zona="noticias" className="mb-7 h-20" />

        <section aria-label="Filtros de noticias" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorías">
              {CATEGORIES.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => setCategory(value)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-xs font-black transition ${category === value ? 'bg-[#082F35] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-400'}`}>{label}</button>)}
            </div>
            <label className="relative block xl:w-80"><span className="sr-only">Buscar noticias</span><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar tema o fuente…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100" /></label>
          </div>
        </section>

        {isLoading ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-white" />)}</div>
        ) : isError ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center"><BellRing className="mx-auto text-amber-600" /><h2 className="mt-4 text-xl font-black text-slate-800">La actualización está temporalmente pausada</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Conservamos la trazabilidad y no mostramos información sin verificar. Intenta nuevamente en unos minutos.</p><button type="button" onClick={() => refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#082F35] px-5 text-xs font-black text-white"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Reintentar</button></div>
        ) : !featured ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center"><Newspaper className="mx-auto text-teal-700" size={36} /><h2 className="mt-5 text-xl font-black text-[#082F35]">Estamos preparando la siguiente actualización</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Prueba con otra categoría o vuelve más tarde. Faro Portuario solo publica referencias que cumplen sus criterios editoriales.</p>{(category !== 'todos' || query) && <button type="button" onClick={() => { setCategory('todos'); setQuery('') }} className="mt-5 text-sm font-black text-teal-700">Limpiar filtros</button>}</div>
        ) : (
          <>
            <section className="mt-8" aria-labelledby="destacada-title"><div className="mb-5 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Mayor relevancia</p><h2 id="destacada-title" className="mt-1 text-2xl font-black tracking-tight text-[#082F35]">Información destacada</h2></div><button type="button" onClick={() => refetch()} className="hidden min-h-10 items-center gap-2 text-xs font-black text-slate-500 sm:inline-flex"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Actualizar</button></div><NewsCard item={featured} featured /></section>
            {remaining.length > 0 && <section className="mt-12" aria-labelledby="feed-title"><div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Últimas referencias</p><h2 id="feed-title" className="mt-1 text-2xl font-black tracking-tight text-[#082F35]">Más actualidad del sector</h2></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{remaining.map((item) => <NewsCard key={item.id} item={item} />)}</div></section>}
          </>
        )}

        <section className="mt-12 rounded-3xl bg-[#082F35] p-7 text-white sm:flex sm:items-center sm:justify-between sm:p-9">
          <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-300">Política editorial</p><h2 className="mt-2 text-2xl font-black tracking-tight">Contexto útil, fuente siempre visible.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Faro Portuario no sustituye los avisos oficiales. Antes de tomar una decisión operativa, consulta el enlace original y confirma la vigencia de la información.</p></div><Link to="/comunidad" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F6B73C] px-5 text-xs font-black text-[#082F35] sm:mt-0">Ir a la comunidad <ArrowUpRight size={15} /></Link>
        </section>
      </main>
    </div>
  )
}
