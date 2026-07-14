import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, ChevronRight, Container,
  GraduationCap, Handshake, Landmark, MapPin, Newspaper, PackageSearch, Search,
  ShieldCheck, Ship, Store, Truck, Users, Warehouse, Wrench,
} from 'lucide-react'
import SponsoredCompanies from '../components/ui/SponsoredCompanies.jsx'
import { isDemoMode, supabase } from '../lib/supabase.js'

const API = import.meta.env.VITE_API_URL || ''
const SEARCH_TYPES = ['Todo', 'Empresas', 'Fletes', 'Vacantes', 'Proveedores', 'Servicios', 'Noticias']

const CATEGORIES = [
  { name: 'Transportistas', detail: 'Carga local y foránea', icon: Truck, to: '/directorio-empresarial?categoria=transportistas' },
  { name: 'Agentes aduanales', detail: 'Despacho y comercio exterior', icon: Landmark, to: '/directorio-empresarial?categoria=agentes-aduanales' },
  { name: 'Freight forwarders', detail: 'Logística internacional', icon: Container, to: '/directorio-empresarial?categoria=forwarders' },
  { name: 'Patios y almacenes', detail: 'Espacio, resguardo y maniobras', icon: Warehouse, to: '/directorio-empresarial?categoria=almacenes' },
  { name: 'Talleres y refacciones', detail: 'Mantenimiento para flotas', icon: Wrench, to: '/directorio-empresarial?categoria=talleres' },
  { name: 'Navieras y terminales', detail: 'Servicios marítimos', icon: Ship, to: '/directorio-empresarial?categoria=navieras' },
  { name: 'Proveedores', detail: 'Servicios especializados', icon: Handshake, to: '/directorio-empresarial?categoria=proveedores' },
  { name: 'Empleo y talento', detail: 'Vacantes y profesionales', icon: Users, to: '/vacantes' },
]

async function fetchVerifiedCompanies() {
  const response = await fetch(`${API}/api/directorio?tier=verificado&limit=4`)
  if (!response.ok) return []
  return (await response.json()).data || []
}

async function fetchRecentJobs() {
  if (isDemoMode) return []
  const { data, error } = await supabase.from('vacantes').select('id, puesto, empresa, ciudad, tipo_contrato, created_at').eq('is_active', true).eq('estatus', 'activa').order('created_at', { ascending: false }).limit(4)
  if (error) return []
  return data || []
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('Todo')
  const { data: companies = [] } = useQuery({ queryKey: ['home-verified-companies'], queryFn: fetchVerifiedCompanies, staleTime: 120_000, retry: 1 })
  const { data: jobs = [] } = useQuery({ queryKey: ['home-recent-jobs'], queryFn: fetchRecentJobs, staleTime: 120_000, retry: 1 })

  const search = (event) => {
    event.preventDefault()
    const target = { Todo: '/directorio-empresarial', Empresas: '/directorio-empresarial', Fletes: '/fletes', Vacantes: '/vacantes', Proveedores: '/directorio-empresarial', Servicios: '/directorio-empresarial', Noticias: '/noticias' }[type]
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    navigate(`${target}${params.size ? `?${params}` : ''}`)
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-[640px] overflow-hidden bg-[#071d28] text-white sm:min-h-[700px]">
        <img src="/puerto-hero.jpg" alt="Terminal de contenedores y grúas del puerto de Manzanillo" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,23,31,.95)_0%,rgba(5,23,31,.84)_45%,rgba(5,23,31,.35)_100%)]" />
        <div className="mx-auto flex min-h-[640px] max-w-7xl items-center px-4 py-16 sm:min-h-[700px] sm:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold backdrop-blur"><MapPin size={13} /> Manzanillo · México</div>
            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.03] tracking-[-.055em] sm:text-6xl lg:text-7xl">Todo el ecosistema logístico de Manzanillo, en un solo lugar.</h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-200 sm:text-xl sm:leading-8">Encuentra transportistas, agentes aduanales, proveedores, fletes, vacantes, patios, talleres, noticias y herramientas para operar mejor.</p>

            <form onSubmit={search} className="mt-9 max-w-4xl rounded-2xl bg-white p-2 text-slate-900 shadow-2xl shadow-black/25 sm:flex">
              <label className="relative block flex-1"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Buscar en Faro Portuario</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca empresas, servicios, fletes, vacantes o proveedores" className="h-14 w-full rounded-xl pl-12 pr-4 text-sm outline-none placeholder:text-slate-400 focus:bg-slate-50" /></label>
              <button className="h-14 w-full rounded-xl bg-[#0d5b55] px-7 text-sm font-extrabold text-white transition hover:bg-[#0a4945] sm:w-auto">Buscar</button>
            </form>
            <div className="mt-4 flex max-w-4xl flex-wrap gap-2">{SEARCH_TYPES.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold backdrop-blur transition ${type === item ? 'border-white bg-white text-[#081f2c]' : 'border-white/25 bg-black/10 text-slate-200 hover:border-white/50'}`}>{item}</button>)}</div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/directorio-empresarial" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#081f2c]">Explorar empresas <ArrowRight size={16} /></Link>
              <Link to="/fletes" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-extrabold backdrop-blur hover:bg-white/15">Publicar un flete</Link>
              <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-extrabold hover:bg-white/10">Registrar mi empresa</Link>
            </div>
          </div>
        </div>
      </section>

      <SponsoredCompanies />

      <main>
        <section className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <Heading eyebrow="Accesos rápidos" title="Encuentra lo que necesitas" text="Explora empresas y servicios por actividad dentro de la cadena logística." />
            <div className="mt-9 grid grid-cols-2 border-l border-t border-slate-200 sm:grid-cols-4">
              {CATEGORIES.map(({ name, detail, icon: Icon, to }) => <Link key={name} to={to} className="group min-h-40 border-b border-r border-slate-200 p-5 transition hover:z-10 hover:border-teal-700 hover:shadow-[0_12px_34px_rgba(8,31,44,.08)] sm:p-6"><Icon size={22} strokeWidth={1.7} className="text-teal-800" /><h2 className="mt-6 text-sm font-black sm:text-base">{name}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p><ChevronRight size={14} className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-700" /></Link>)}
            </div>
          </div>
        </section>

        {(companies.length > 0 || jobs.length > 0) && (
          <section className="border-b border-slate-100 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4">
              <Heading eyebrow="Actividad reciente" title="Oportunidades dentro del ecosistema" text="Publicaciones visibles únicamente cuando existen registros activos en la plataforma." />
              <div className="mt-9 grid gap-10 lg:grid-cols-2">
                {companies.length > 0 && <DynamicGroup title="Empresas verificadas" icon={BadgeCheck} to="/directorio-empresarial"><div className="divide-y divide-slate-100">{companies.map((company) => <Link key={company.id} to={`/directorio-empresarial/${company.slug}`} className="group flex items-center gap-4 py-4"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">{company.logo_url ? <img src={company.logo_url} alt={`Logo de ${company.nombre_comercial}`} className="h-full w-full object-contain" /> : <Building2 size={18} className="text-slate-400" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{company.nombre_comercial}</p><p className="mt-1 text-xs capitalize text-slate-500">{company.categoria_slug?.replace(/-/g, ' ')}</p></div><ArrowRight size={14} className="text-slate-300 group-hover:text-teal-700" /></Link>)}</div></DynamicGroup>}
                {jobs.length > 0 && <DynamicGroup title="Vacantes recientes" icon={BriefcaseBusiness} to="/vacantes"><div className="divide-y divide-slate-100">{jobs.map((job) => <Link key={job.id} to="/vacantes" className="group flex items-center gap-4 py-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><BriefcaseBusiness size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{job.puesto}</p><p className="mt-1 truncate text-xs text-slate-500">{job.empresa} · {job.ciudad}</p></div><ArrowRight size={14} className="text-slate-300 group-hover:text-teal-700" /></Link>)}</div></DynamicGroup>}
              </div>
            </div>
          </section>
        )}

        <section className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <Heading eyebrow="Para empresas" title="Una presencia digital que también genera oportunidades" text="Crea tu perfil, presenta tus servicios, publica vacantes y prepara a tu equipo para participar en los módulos comerciales de Faro Portuario." />
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">{[
              [Building2, 'Perfil empresarial', 'Reúne identidad, servicios, cobertura y canales de contacto.'],
              [ShieldCheck, 'Validación responsable', 'Los distintivos solo aparecen después de revisión administrativa.'],
              [PackageSearch, 'Oportunidades comerciales', 'Accede progresivamente a fletes, cotizaciones y publicaciones.'],
              [BriefcaseBusiness, 'Empleo especializado', 'Publica vacantes y organiza candidatos desde un mismo espacio.'],
            ].map(([Icon, title, text]) => <div key={title} className="border-t border-slate-200 pt-5"><Icon size={20} className="text-teal-800" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div>
          </div>
        </section>

        <section className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-10 lg:grid-cols-2">
              <div><Heading eyebrow="Actualidad" title="Información útil, con fuente y fecha" text="Noticias, normatividad, capacitación y alertas editoriales publicadas con contexto verificable." /><Link to="/noticias" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold">Consultar actualidad <Newspaper size={14} /></Link></div>
              <div><Heading eyebrow="Planes" title="Empieza con una cuenta gratuita" text="Registra tu empresa y elige después las herramientas que realmente necesitas. Los precios y límites se administran desde la plataforma." /><Link to="/register" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d4f4b] px-5 text-xs font-extrabold text-white">Registrar empresa <ArrowRight size={14} /></Link></div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4"><Heading eyebrow="Preguntas frecuentes" title="Antes de comenzar" text="Respuestas claras sobre participación, publicación y validación." /><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{[
            ['¿Faro Portuario participa en las operaciones?', 'No. Faro facilita la conexión entre terceros; cada usuario debe verificar información, condiciones y reputación antes de contratar.'],
            ['¿Todas las empresas aparecen como verificadas?', 'No. La insignia se muestra únicamente después de una revisión administrativa y puede retirarse si la documentación pierde vigencia.'],
            ['¿Puedo registrarme sin contratar un plan?', 'Sí. Existe una opción gratuita para crear presencia básica y conocer la plataforma antes de ampliar funciones.'],
            ['¿Faro publica estados oficiales del puerto?', 'Solo se mostrará información operativa cuando exista una fuente identificada, activa y con fecha de actualización.'],
          ].map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black"><span>{question}</span><span className="text-xl font-light text-slate-400 group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{answer}</p></details>)}</div></div>
        </section>

        <section className="py-16 sm:py-24"><div className="mx-auto max-w-7xl px-4"><div className="rounded-3xl bg-[#081f2c] px-6 py-11 text-white sm:px-12 sm:py-14 lg:flex lg:items-center lg:justify-between"><div className="max-w-3xl"><p className="text-[11px] font-black uppercase tracking-[.2em] text-teal-300">Faro Portuario</p><h2 className="mt-4 text-3xl font-black tracking-[-.04em] sm:text-4xl">Forma parte del ecosistema logístico de Manzanillo.</h2><p className="mt-4 text-sm leading-6 text-slate-300">Crea tu cuenta y construye una presencia profesional con información real.</p></div><div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0"><Link to="/register" className="rounded-xl bg-white px-6 py-3 text-center text-sm font-extrabold text-[#081f2c]">Crear cuenta</Link><Link to="/directorio-empresarial" className="rounded-xl border border-white/25 px-6 py-3 text-center text-sm font-extrabold">Explorar directorio</Link></div></div></div></section>
      </main>
    </div>
  )
}

function Heading({ eyebrow, title, text }) { return <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#081f2c] sm:text-4xl">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">{text}</p></div> }
function DynamicGroup({ title, icon: Icon, to, children }) { return <section><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-black"><Icon size={17} className="text-teal-700" />{title}</h3><Link to={to} className="text-xs font-extrabold text-teal-800">Ver todo</Link></div><div className="mt-3">{children}</div></section> }
