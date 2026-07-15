import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check,
  Eye, MapPin, Megaphone, Search, Sparkles, Star, Users,
} from 'lucide-react'

const VACANTES = [
  { puesto: 'Ejecutivo/a de tráfico', empresa: 'Transportes del Pacífico', ubicacion: 'Manzanillo, Col.', postulaciones: 18, estado: 'Activa' },
  { puesto: 'Operador quinta rueda', empresa: 'Logística Costera', ubicacion: 'Local y foráneo', postulaciones: 31, estado: 'Activa' },
  { puesto: 'Documentador/a aduanal', empresa: 'Grupo Aduanal MX', ubicacion: 'Zona portuaria', postulaciones: 12, estado: 'En revisión' },
]

const TALENTO = [
  { iniciales: 'MR', nombre: 'Mariana Ríos', puesto: 'Ejecutiva de tráfico', detalle: '5 años · GPS y monitoreo', color: 'bg-cyan-100 text-cyan-800' },
  { iniciales: 'CG', nombre: 'Carlos García', puesto: 'Operador quinta rueda', detalle: 'Licencia federal E · Disponible', color: 'bg-amber-100 text-amber-800' },
  { iniciales: 'DL', nombre: 'Daniela López', puesto: 'Documentadora aduanal', detalle: 'Pedimentos · Recintos fiscalizados', color: 'bg-emerald-100 text-emerald-800' },
]

const PLANES = [
  {
    nombre: 'Impulso Faro', precio: '$799', periodo: 'MXN al mes',
    descripcion: 'Visibilidad constante para generar reconocimiento y contactos.',
    beneficios: ['Perfil destacado', 'Banner en una sección', '1 publicación patrocinada', 'Reporte de impresiones y clics'],
  },
  {
    nombre: 'Líder Portuario', precio: '$1,999', periodo: 'MXN al mes', destacado: true,
    descripcion: 'Cobertura preferente para posicionar la marca y captar oportunidades.',
    beneficios: ['Portada y hasta 3 secciones', 'Prioridad en el directorio', '4 publicaciones patrocinadas', 'Reporte y acompañamiento mensual'],
  },
]

export default function Empresa() {
  const [tab, setTab] = useState('resumen')

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-900">
      <section className="overflow-hidden bg-[#082f31] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-teal-100">
                <Building2 size={14} /> Espacio para empresas
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                Contrata a la gente que mueve la logística de Manzanillo.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-teal-50/75 md:text-lg">
                Publica vacantes, encuentra operadores y profesionales especializados, y construye una marca empleadora confiable dentro de la comunidad portuaria.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/vacantes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f4b942] px-5 font-extrabold text-[#082f31] transition hover:bg-amber-300">
                  <BriefcaseBusiness size={18} /> Publicar una vacante
                </Link>
                <Link to="/posturas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 font-bold text-white transition hover:bg-white/15">
                  <Search size={18} /> Buscar talento
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200">Espacio empresarial</p>
                  <p className="mt-1 font-extrabold">Todo tu proceso en un solo lugar</p>
                </div>
                <Sparkles className="text-amber-300" size={22} />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  'Publica y administra vacantes', 'Revisa candidatos y postulaciones', 'Guarda talento y crea equipos', 'Consulta visitas, CTR y conversiones',
                ].map((label) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-[#062628]/70 p-3">
                    <Check size={16} className="text-teal-300" />
                    <p className="text-xs font-semibold text-teal-50">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-teal-100/55">Las analíticas se activan cuando tu empresa recibe actividad real.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-7 overflow-x-auto px-4 md:px-6">
          {[
            ['resumen', 'Resumen'], ['vacantes', 'Mis vacantes'], ['talento', 'Talento guardado'], ['publicidad', 'Planes y publicidad'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`border-b-2 py-4 text-sm font-bold whitespace-nowrap ${tab === id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {tab === 'resumen' && (
          <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
            <div className="space-y-6">
              <Panel title="Vacantes recientes" icon={BriefcaseBusiness} action="Administrar vacantes" onAction={() => setTab('vacantes')}>
                <div className="divide-y divide-slate-100">
                  {VACANTES.map((vacante) => <Vacante key={vacante.puesto} {...vacante} />)}
                </div>
              </Panel>
              <Panel title="Talento recomendado" icon={Users} action="Ver directorio" actionTo="/posturas">
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {TALENTO.map((persona) => <Talento key={persona.nombre} {...persona} />)}
                </div>
              </Panel>
            </div>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-teal-100 bg-teal-50 p-6">
                <BadgeCheck className="text-teal-700" size={28} />
                <h2 className="mt-4 text-xl font-black">Completa tu perfil de empresa</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Las empresas con identidad, giro, ubicación y beneficios claros generan más confianza al postularse.</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white"><div className="h-full w-[70%] rounded-full bg-teal-600" /></div>
                <div className="mt-2 flex justify-between text-xs font-bold text-teal-800"><span>70% completo</span><span>Mejorar perfil</span></div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <Megaphone className="text-amber-600" size={26} />
                <h2 className="mt-4 text-lg font-black">Haz visible tu empresa</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Aparece frente a operadores, ejecutivos de tráfico, agentes y profesionales que buscan oportunidades.</p>
                <button onClick={() => setTab('publicidad')} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-teal-800">Conocer opciones <ArrowRight size={15} /></button>
              </div>
            </aside>
          </div>
        )}

        {tab === 'vacantes' && (
          <Panel title="Mis vacantes" icon={BriefcaseBusiness} action="Publicar nueva" actionTo="/vacantes">
            <div className="divide-y divide-slate-100">{VACANTES.map((vacante) => <Vacante key={vacante.puesto} {...vacante} />)}</div>
          </Panel>
        )}

        {tab === 'talento' && (
          <Panel title="Talento guardado" icon={Star} action="Buscar más talento" actionTo="/posturas">
            <div className="grid gap-4 p-5 md:grid-cols-3">{TALENTO.map((persona) => <Talento key={persona.nombre} {...persona} />)}</div>
          </Panel>
        )}

        {tab === 'publicidad' && (
          <div>
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Soluciones para contratar</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Elige cómo quieres aparecer</h2>
              <p className="mt-3 text-slate-600">Planes sencillos para publicar, buscar y posicionar tu empresa.</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
              {PLANES.map((plan) => (
                <article key={plan.nombre} className={`relative rounded-3xl border bg-white p-6 ${plan.destacado ? 'border-teal-600 shadow-xl shadow-teal-900/10' : 'border-slate-200'}`}>
                  {plan.destacado && <span className="absolute -top-3 left-6 rounded-full bg-teal-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Recomendado</span>}
                  <h3 className="text-xl font-black">{plan.nombre}</h3>
                  <p className="mt-2 min-h-12 text-sm text-slate-600">{plan.descripcion}</p>
                  <p className="mt-5 text-3xl font-black text-teal-900">{plan.precio}</p>
                  <p className="text-xs text-slate-500">{plan.periodo}</p>
                  <ul className="mt-6 space-y-3">{plan.beneficios.map((item) => <li key={item} className="flex gap-2 text-sm text-slate-700"><Check size={17} className="mt-0.5 shrink-0 text-teal-600" />{item}</li>)}</ul>
                  <Link to="/anunciate" className={`mt-7 flex min-h-11 items-center justify-center rounded-xl text-sm font-extrabold ${plan.destacado ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'}`}>Ver detalles</Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function Panel({ title, icon: Icon, action, actionTo, onAction, children }) {
  const actionClasses = 'inline-flex items-center gap-1 text-xs font-extrabold text-teal-800 hover:text-teal-600'
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-black"><Icon size={18} className="text-teal-700" />{title}</h2>
        {actionTo ? <Link className={actionClasses} to={actionTo}>{action} <ArrowRight size={14} /></Link> : <button className={actionClasses} onClick={onAction}>{action} <ArrowRight size={14} /></button>}
      </header>
      {children}
    </section>
  )
}

function Vacante({ puesto, empresa, ubicacion, postulaciones, estado }) {
  return (
    <article className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><BriefcaseBusiness size={19} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{puesto}</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{estado}</span></div>
        <p className="mt-1 text-xs text-slate-500">{empresa} · <MapPin size={11} className="inline" /> {ubicacion}</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users size={14} /> {postulaciones} postulaciones</div>
      <Link to="/vacantes" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><Eye size={14} className="mr-2" /> Ver</Link>
    </article>
  )
}

function Talento({ iniciales, nombre, puesto, detalle, color }) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${color}`}>{iniciales}</div>
      <h3 className="mt-3 font-black">{nombre}</h3>
      <p className="mt-0.5 text-sm font-semibold text-teal-800">{puesto}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detalle}</p>
      <Link to="/posturas" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-slate-700">Ver perfil <ArrowRight size={13} /></Link>
    </article>
  )
}
