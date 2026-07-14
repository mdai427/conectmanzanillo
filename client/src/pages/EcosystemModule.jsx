import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight, BadgeDollarSign, BookOpen, Calculator, CheckCircle2, FileDown,
  GraduationCap, MapPin, MessageSquareText, PackageSearch, Search, Sparkles,
  Star, Store, Truck, Users,
} from 'lucide-react'

const CONFIG = {
  '/marketplace': {
    eyebrow: 'Marketplace logístico', title: 'Equipo y soluciones para seguir operando.',
    description: 'Compra, vende o renta activos y suministros especializados para transporte y logística.',
    icon: Store, cta: 'Publicar producto',
    filters: ['Todo', 'Compra', 'Venta', 'Renta', 'Servicios'],
    categories: ['Tractocamiones', 'Remolques', 'Dolly', 'Chasis', 'Contenedores', 'Montacargas', 'Llantas', 'Refacciones', 'GPS', 'Seguridad', 'Herramientas', 'Uniformes'],
  },
  '/fletes': {
    eyebrow: 'Bolsa de fletes', title: 'Conecta cargas con capacidad disponible.',
    description: 'Consulta oportunidades por origen, destino, tipo de carga, equipo y fecha.',
    icon: PackageSearch, cta: 'Publicar flete',
    filters: ['Todos', 'Contenedor', 'Carga general', 'Refrigerado', 'Material peligroso'],
    categories: ['Origen', 'Destino', 'Tipo de carga', 'Peso', 'Contenedor', 'Precio', 'Fecha', 'Empresa'],
  },
  '/salarios': {
    eyebrow: 'Inteligencia laboral', title: 'Salarios del sector logístico-portuario.',
    description: 'Referencias salariales construidas con datos anónimos y fuentes verificables.',
    icon: BadgeDollarSign, cta: 'Aportar dato salarial',
    filters: ['Todos', 'Operación', 'Aduana', 'Administración', 'Dirección'],
    categories: ['Operador', 'Supervisor', 'Tráfico', 'Documentador', 'Glosador', 'Coordinador', 'Gerente', 'Despachador', 'Almacén', 'Maniobrista'],
  },
  '/capacitacion': {
    eyebrow: 'Capacitación', title: 'Conocimiento que abre oportunidades.',
    description: 'Cursos, diplomados y certificaciones relevantes para trabajar y crecer en el sector.',
    icon: GraduationCap, cta: 'Publicar curso',
    filters: ['Todos', 'Cursos', 'Diplomados', 'Certificaciones', 'En línea'],
    categories: ['Federal E', 'Hazmat', 'IMDG', 'Excel', 'VUCEM', 'Carta Porte', 'SAT', 'Comercio Exterior'],
  },
  '/documentos': {
    eyebrow: 'Biblioteca profesional', title: 'Documentos listos para el trabajo diario.',
    description: 'Formatos, checklists y plantillas editables para operaciones logísticas más ordenadas.',
    icon: FileDown, cta: 'Compartir recurso',
    filters: ['Todo', 'PDF', 'Excel', 'Checklist', 'Bitácora'],
    categories: ['Carta Porte', 'Checklist de unidad', 'Checklist de operador', 'Bitácoras', 'Inspecciones', 'Incidentes', 'Entrega', 'Recepción', 'Plantillas Excel', 'Formatos PDF'],
  },
  '/calculadoras': {
    eyebrow: 'Herramientas', title: 'Calculadoras para tomar mejores decisiones.',
    description: 'Estimaciones transparentes para personas, viajes y flotas. Cada cálculo explica sus supuestos.',
    icon: Calculator, cta: 'Sugerir calculadora',
    filters: ['Todas', 'Laboral', 'Viaje', 'Flota', 'Fiscal'],
    categories: ['ISR', 'Finiquito', 'Liquidación', 'Costo por kilómetro', 'Costo diésel', 'Rendimiento', 'Utilidad por viaje', 'Costo operador', 'Costo de flota'],
  },
  '/comunidad': {
    eyebrow: 'Comunidad portuaria', title: 'El lugar donde el sector comparte lo que sabe.',
    description: 'Preguntas, experiencias, recomendaciones y oportunidades publicadas por profesionales y empresas.',
    icon: MessageSquareText, cta: 'Crear publicación',
    filters: ['Para ti', 'Preguntas', 'Empresas', 'Operadores', 'Recomendaciones'],
    categories: ['Operación', 'Aduana', 'Transporte', 'Empleo', 'Proveedores', 'Capacitación', 'Seguridad', 'Tecnología'],
  },
  '/resenas': {
    eyebrow: 'Reputación laboral', title: 'Decisiones laborales con mayor contexto.',
    description: 'Reseñas moderadas sobre puntualidad de pago, ambiente, prestaciones, rotación y capacitación.',
    icon: Star, cta: 'Escribir reseña',
    filters: ['Todas', 'Mejor calificadas', 'Transportistas', 'Agencias', 'Proveedores'],
    categories: ['Puntualidad de pago', 'Ambiente laboral', 'Prestaciones', 'Rotación', 'Capacitación', 'Seguridad'],
  },
  '/ia-portuaria': {
    eyebrow: 'IA portuaria', title: 'Respuestas claras para operaciones complejas.',
    description: 'Una base de conocimiento preparada para conectarse a IA y responder siempre con fuentes y fecha.',
    icon: Sparkles, cta: 'Hacer una pregunta',
    filters: ['Todos', 'Aduana', 'Terminales', 'Documentos', 'Normatividad'],
    categories: ['Tramitar un gafete', 'Documentos de exportación', 'Qué significa RO', 'Contenedor rechazado', 'Requisitos SSA', 'Requisitos Contecon', 'Carta Porte', 'VUCEM'],
  },
}

export default function EcosystemModule() {
  const { pathname } = useLocation()
  const config = CONFIG[pathname] || CONFIG['/marketplace']
  const Icon = config.icon
  const [filter, setFilter] = useState(config.filters[0])
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => config.categories.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [config.categories, query])

  useEffect(() => {
    document.title = `${config.eyebrow} | Faro Portuario`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', config.description)
    return () => { document.title = 'Faro Portuario | Ecosistema logístico-portuario' }
  }, [config])

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <nav aria-label="Ruta de navegación" className="mb-8 flex items-center gap-2 text-[11px] font-semibold text-slate-400"><Link to="/" className="hover:text-teal-700">Inicio</Link><span>/</span><span className="text-slate-600">{config.eyebrow}</span></nav>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-[#0d4f4b] shadow-sm"><Icon size={22} /></div>
          <p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-teal-700">{config.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-.05em] text-[#081f2c] sm:text-6xl">{config.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">{config.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-[#0d4f4b] px-5 py-3 text-center text-sm font-extrabold text-white">{config.cta}</Link>
            <Link to="/" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-extrabold text-slate-700">Volver al ecosistema</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">{config.filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${filter === item ? 'border-[#0d4f4b] bg-[#0d4f4b] text-white' : 'border-slate-200 text-slate-600'}`}>{item}</button>)}</div>
          <label className="relative block lg:w-80"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item, index) => (
            <button type="button" onClick={() => setQuery(item)} key={item} className="group min-h-48 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_6px_24px_rgba(8,31,44,.04)] transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-[0_12px_34px_rgba(8,31,44,.08)]">
              <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><Icon size={18} /></div><span className="text-[10px] font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span></div>
              <h2 className="mt-7 text-base font-black tracking-tight">{item}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">Sección preparada para datos verificados y publicaciones de la comunidad.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-extrabold text-teal-800">Explorar <ArrowRight size={12} /></span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && <div className="py-20 text-center"><Search className="mx-auto text-slate-300" /><h2 className="mt-4 font-black">No encontramos coincidencias</h2><p className="mt-2 text-sm text-slate-500">Prueba con otra palabra o limpia la búsqueda.</p></div>}

        <div className="mt-14 rounded-2xl border border-slate-200 p-6 sm:flex sm:items-center sm:justify-between">
          <div className="flex gap-4"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={20} /><div><h2 className="font-black">Módulo preparado para crecer</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Los listados se conectarán a fuentes reales. Faro mostrará procedencia, fecha y estado de verificación cuando existan datos.</p></div></div>
          <Link to="/anunciate" className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-teal-800 sm:mt-0">Participar <ArrowRight size={13} /></Link>
        </div>
      </main>
    </div>
  )
}
