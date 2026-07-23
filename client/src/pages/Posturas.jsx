import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight, BadgeCheck, BarChart3, BriefcaseBusiness, Building2,
  CheckCircle2, ChevronDown, Filter, Heart, MapPin, MessageCircle,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, Trophy,
  UserPlus, Users, X, Zap,
} from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase.js'
import Reveal from '../components/ui/Reveal.jsx'
import Stagger from '../components/ui/Stagger.jsx'

const LICENCIAS = [
  { value: 'federal-a', label: 'Federal A' },
  { value: 'federal-b', label: 'Federal B' },
  { value: 'federal-c', label: 'Federal C' },
  { value: 'federal-d', label: 'Federal D' },
  { value: 'federal-e', label: 'Federal E' },
  { value: 'chofer', label: 'Chofer particular' },
]

const UNIDADES = ['Full', 'Sencillo', 'Doblero', 'Porteo', 'Plataforma', 'Refrigerado']
const CARGAS = ['Contenedores', 'Carga general', 'Material peligroso', 'Refrigerada', 'Granel', 'Sobredimensionada']
const ESPECIALIDADES = ['Puerto', 'Aduana', 'Doble articulado', 'MATPEL', 'Última milla', 'Carretera']
const AREAS = ['Operación de transporte', 'Tráfico y monitoreo', 'Aduanas y documentación', 'Logística y almacén', 'Administración', 'Supervisión']

const DEMO_OPERATORS = [
  {
    id: 'demo-op-1', nombre_completo: 'Carlos Mendoza', ciudad: 'Manzanillo, Colima', area: 'Operación de transporte',
    estatus: 'disponible', tipo_licencia: 'federal-e', tipo_maniobra: 'full', labora: 'ambos',
    experiencia: 12, especialidades: ['Puerto', 'Doble articulado', 'MATPEL'],
    tipo_carga: 'Material peligroso', empresa_anterior: 'Transportes del Pacífico',
    ultima_conexion: 'Hace 8 min', licencia_url: true, ine_url: true, medico_vigente: true,
    rating: 4.9, viajes: 1840, recomendaciones: 37, elite: true, score: 96,
    whatsapp: '3140000000', descripcion: 'Especialista en maniobras portuarias, full y rutas del corredor Manzanillo–Bajío.',
  },
  {
    id: 'demo-op-2', nombre_completo: 'Mariana López', ciudad: 'Manzanillo, Colima', area: 'Tráfico y monitoreo', puesto: 'Ejecutiva de tráfico',
    estatus: 'disponible', tipo_licencia: 'No requerida', tipo_maniobra: 'Monitoreo de flota', labora: 'local',
    experiencia: 7, especialidades: ['Navieras', 'GPS', 'Despacho'],
    tipo_carga: 'Contenedores', empresa_anterior: 'Logística Costera',
    ultima_conexion: 'Hace 21 min', licencia_url: true, ine_url: true, medico_vigente: true,
    rating: 4.8, viajes: 920, recomendaciones: 24, elite: false, score: 91,
    whatsapp: '3140000000', descripcion: 'Coordinación de unidades, seguimiento GPS, citas, evidencias y atención a clientes.',
  },
  {
    id: 'demo-op-3', nombre_completo: 'José Ramírez', ciudad: 'Tecomán, Colima', area: 'Operación de transporte',
    estatus: 'ocupado', tipo_licencia: 'federal-e', tipo_maniobra: 'plataforma', labora: 'foraneo',
    experiencia: 15, especialidades: ['Carretera', 'Sobredimensionada', 'Puerto'],
    tipo_carga: 'Sobredimensionada', empresa_anterior: 'Grupo Rápido',
    ultima_conexion: 'Hace 1 h', licencia_url: true, ine_url: true, medico_vigente: false,
    rating: 4.7, viajes: 2310, recomendaciones: 42, elite: true, score: 93,
    whatsapp: '3140000000', descripcion: 'Operador foráneo con experiencia nacional en plataforma y carga especializada.',
  },
  {
    id: 'demo-op-4', nombre_completo: 'Daniela Torres', ciudad: 'Manzanillo, Colima', area: 'Aduanas y documentación', puesto: 'Documentadora aduanal',
    estatus: 'disponible', tipo_licencia: 'No requerida', tipo_maniobra: 'Documentación', labora: 'local',
    experiencia: 5, especialidades: ['VUCEM', 'Glosa', 'Pedimentos'],
    tipo_carga: 'Carga general', empresa_anterior: 'Agencia Aduanal del Pacífico',
    ultima_conexion: 'Hoy, 21:40', licencia_url: true, ine_url: true, medico_vigente: true,
    rating: 4.9, viajes: 680, recomendaciones: 19, elite: false, score: 89,
    whatsapp: '3140000000', descripcion: 'Captura y revisión documental, seguimiento de pedimentos y coordinación con clientes.',
  },
]

const JOBS = [
  { role: 'Operador Full · Puerto–Bajío', company: 'Transmar Pacífico', meta: '$28–34 mil/mes · Federal E', age: 'Hace 2 h' },
  { role: 'Operador local de contenedores', company: 'Logística Costera', meta: '$22–26 mil/mes · Federal B', age: 'Hace 5 h' },
  { role: 'Operador refrigerado foráneo', company: 'Frío Express', meta: '$30–38 mil/mes · Experiencia cold chain', age: 'Ayer' },
]

const COMPANIES = [
  { name: 'Transmar Pacífico', openings: 4, verified: true, initials: 'TP' },
  { name: 'Logística Costera', openings: 3, verified: true, initials: 'LC' },
  { name: 'Frío Express', openings: 2, verified: true, initials: 'FE' },
]

const STATUS = {
  disponible: { label: 'Disponible hoy', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ocupado: { label: 'En ruta', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'no-disponible': { label: 'No disponible', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
}

function TrustBadge({ icon: Icon, children, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }
  return (
    <span className={'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ' + tones[tone]}>
      <Icon size={11} aria-hidden="true" /> {children}
    </span>
  )
}

function ScoreRing({ score }) {
  return (
    <div className="relative grid h-12 w-12 place-items-center rounded-full bg-teal-50" aria-label={'Índice de confianza ' + score + ' de 100'}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#ccfbf1" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="#0f766e" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={126} strokeDashoffset={126 - (126 * score / 100)} />
      </svg>
      <span className="text-xs font-black text-teal-800">{score}</span>
    </div>
  )
}

function OperatorCard({ operator, featured, favorite, selected, onFavorite, onCompare, onView }) {
  const status = STATUS[operator.estatus] || STATUS['no-disponible']
  const license = LICENCIAS.find(item => item.value === operator.tipo_licencia)?.label || operator.tipo_licencia
  const specialties = operator.especialidades || [operator.tipo_maniobra].filter(Boolean)
  const photo = operator.foto_url || operator.avatar_url
  const wa = String(operator.whatsapp || '').replace(/\D/g, '')
  const waHref = 'https://wa.me/52' + wa + '?text=' + encodeURIComponent('Hola ' + operator.nombre_completo + ', vi tu perfil en Faro Portuario y me interesa conversar sobre una oportunidad.')

  return (
    <article className={'group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ' + (featured ? 'border-amber-200' : 'border-slate-200')}>
      {featured && (
        <div className="flex items-center gap-1.5 bg-amber-50 px-5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
          <Trophy size={12} /> Talento destacado
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {photo ? (
              <img src={photo} alt={'Fotografía de ' + operator.nombre_completo} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-slate-50" loading="lazy" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-700 to-teal-950 text-xl font-black text-white ring-4 ring-slate-50">
                {operator.nombre_completo?.split(' ').slice(0, 2).map(part => part[0]).join('')}
              </div>
            )}
            <span className={'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ' + status.dot} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="truncate text-base font-black text-slate-950">{operator.nombre_completo}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={11} /> {operator.ciudad || 'Manzanillo, Colima'}</p>
              </div>
              <button onClick={() => onFavorite(operator.id)} aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ' + (favorite ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-400 hover:text-rose-600')}>
                <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className={'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ' + status.bg + ' ' + status.text + ' ' + status.border}>
              <span className={'h-1.5 w-1.5 rounded-full ' + status.dot} /> {status.label} · {operator.ultima_conexion || 'Actividad reciente'}
            </div>
          </div>
          <ScoreRing score={operator.score || 72} />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {operator.licencia_url && <TrustBadge icon={BadgeCheck}>Licencia verificada</TrustBadge>}
          {operator.ine_url && <TrustBadge icon={ShieldCheck} tone="blue">Identidad verificada</TrustBadge>}
          {operator.medico_vigente && <TrustBadge icon={CheckCircle2} tone="slate">Médico vigente</TrustBadge>}
          {operator.elite && <TrustBadge icon={Trophy} tone="amber">Perfil Elite</TrustBadge>}
          {operator.empresa_anterior && <TrustBadge icon={Building2} tone="blue">Empresa recomendada</TrustBadge>}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-4 text-xs">
          <div><dt className="text-slate-400">{operator.area === 'Operación de transporte' ? 'Licencia' : 'Área'}</dt><dd className="mt-0.5 font-bold text-slate-800">{operator.area === 'Operación de transporte' ? license : (operator.area || 'Logística')}</dd></div>
          <div><dt className="text-slate-400">Experiencia</dt><dd className="mt-0.5 font-bold text-slate-800">{operator.experiencia || '3+'} años</dd></div>
          <div><dt className="text-slate-400">Especialidad</dt><dd className="mt-0.5 font-bold capitalize text-slate-800">{operator.puesto || operator.tipo_maniobra || 'Operaciones'}</dd></div>
          <div><dt className="text-slate-400">Empresa anterior</dt><dd className="mt-0.5 truncate font-bold text-slate-800">{operator.empresa_anterior || 'Experiencia independiente'}</dd></div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {specialties.slice(0, 4).map(item => <span key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{item}</span>)}
        </div>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{operator.descripcion || 'Perfil operativo disponible para oportunidades en el ecosistema portuario.'}</p>

        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center">
          <div><p className="font-black text-slate-900">{operator.rating || '4.6'} <Star size={10} className="inline fill-amber-400 text-amber-400" /></p><p className="text-[9px] text-slate-400">Calificación</p></div>
          <div><p className="font-black text-slate-900">{Number(operator.viajes || 320).toLocaleString()}</p><p className="text-[9px] text-slate-400">Viajes</p></div>
          <div><p className="font-black text-slate-900">{operator.recomendaciones || 8}</p><p className="text-[9px] text-slate-400">Referencias</p></div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => onView(operator)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">Ver perfil</button>
          {wa ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-700">
              <MessageCircle size={14} /> Contactar
            </a>
          ) : (
            <button disabled className="flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-400">Sin contacto</button>
          )}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-500">
          <input type="checkbox" checked={selected} onChange={() => onCompare(operator.id)} className="h-4 w-4 rounded border-slate-300 accent-teal-700" />
          Comparar perfil
        </label>
      </div>
    </article>
  )
}

function EmptyState({ filtered, onRegister, onClear }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-6 grid h-32 w-52 place-items-center rounded-[2rem] bg-teal-50">
        <svg viewBox="0 0 220 120" className="h-28 w-48" aria-hidden="true">
          <rect x="28" y="70" width="116" height="30" rx="8" fill="#0f766e" />
          <path d="M144 78h26l20 18h-46z" fill="#115e59" />
          <circle cx="61" cy="101" r="10" fill="#0f172a" /><circle cx="165" cy="101" r="10" fill="#0f172a" />
          <circle cx="61" cy="101" r="4" fill="#f8fafc" /><circle cx="165" cy="101" r="4" fill="#f8fafc" />
          <path d="M51 65h82M73 45h80" stroke="#2dd4bf" strokeWidth="6" strokeLinecap="round" />
          <circle cx="178" cy="34" r="20" fill="#fef3c7" /><path d="m169 34 6 6 12-14" stroke="#d97706" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{filtered ? 'Amplía tu búsqueda' : 'Sé parte de la primera generación'}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{filtered ? 'Hay talento que puede encajar con otros criterios' : 'Tu perfil puede abrir la siguiente oportunidad'}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        {filtered ? 'Elimina algunos filtros o describe el puesto con otras palabras.' : 'Faro Portuario está reuniendo al talento que mueve el ecosistema logístico de Manzanillo. Registrarte toma menos de cinco minutos.'}
      </p>
      <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
        {['Visibilidad ante empresas verificadas', 'Control de tu disponibilidad', 'Reputación que crece contigo'].map(item => (
          <div key={item} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700"><CheckCircle2 size={15} className="shrink-0 text-teal-700" /> {item}</div>
        ))}
      </div>
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
        {filtered && <button onClick={onClear} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Limpiar filtros</button>}
        <button onClick={onRegister} className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">Publicar mi perfil</button>
      </div>
    </section>
  )
}

function RegistrationForm({ onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nombre_completo: '', ciudad: 'Manzanillo, Colima', area: 'Operación de transporte', tipo_licencia: 'federal-b',
    tipo_maniobra: 'sencillo', labora: 'local', experiencia: '', whatsapp: '',
    empresa_anterior: '', descripcion: '', estatus: 'disponible',
  })
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.nombre_completo.trim()) throw new Error('Escribe tu nombre completo')
      if (!form.whatsapp.trim()) throw new Error('Agrega tu WhatsApp')
      if (isDemoMode) return
      const { error } = await supabase.from('posturas').insert({ ...form, experiencia: Number(form.experiencia) || null })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(isDemoMode ? 'Perfil completado en la demostración' : 'Perfil publicado correctamente')
      qc.invalidateQueries({ queryKey: ['posturas'] })
      onDone()
    },
    onError: error => toast.error(error.message),
  })
  const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100'
  const label = 'mb-1.5 block text-xs font-black text-slate-700'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Perfil profesional</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Hazte visible para empresas del puerto</h2>
        <p className="mt-2 text-sm text-slate-500">Completa la información esencial. Podrás verificar documentos y enriquecer el perfil después.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Nombre completo *</span><input className={input} value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} /></label>
          <label><span className={label}>Ciudad</span><input className={input} value={form.ciudad} onChange={e => set('ciudad', e.target.value)} /></label>
          <label><span className={label}>Área profesional</span><select className={input} value={form.area} onChange={e => set('area', e.target.value)}>{AREAS.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span className={label}>Licencia (si aplica)</span><select className={input} value={form.tipo_licencia} onChange={e => set('tipo_licencia', e.target.value)}>{LICENCIAS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className={label}>Tipo de unidad</span><select className={input} value={form.tipo_maniobra} onChange={e => set('tipo_maniobra', e.target.value)}>{UNIDADES.map(item => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></label>
          <label><span className={label}>Experiencia (años)</span><input type="number" min="0" className={input} value={form.experiencia} onChange={e => set('experiencia', e.target.value)} /></label>
          <label><span className={label}>WhatsApp *</span><input type="tel" className={input} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="314 000 0000" /></label>
          <label><span className={label}>Cobertura</span><select className={input} value={form.labora} onChange={e => set('labora', e.target.value)}><option value="local">Local</option><option value="foraneo">Foráneo</option><option value="ambos">Local y foráneo</option></select></label>
          <label><span className={label}>Empresa anterior</span><input className={input} value={form.empresa_anterior} onChange={e => set('empresa_anterior', e.target.value)} /></label>
        </div>
        <label className="mt-4 block"><span className={label}>Experiencia y especialidades</span><textarea rows="4" className={input} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Rutas, terminales, tipo de carga y logros relevantes…" /></label>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="mt-6 w-full rounded-xl bg-teal-700 px-5 py-3.5 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-50">
          {mutation.isPending ? 'Publicando…' : 'Publicar mi perfil'}
        </button>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div className="flex items-center gap-2 text-teal-800"><Sparkles size={17} /><h3 className="font-black">Recomendaciones IA</h3></div>
          <p className="mt-2 text-xs leading-5 text-teal-900/70">Completa estos puntos para aparecer más arriba en búsquedas:</p>
          <ul className="mt-4 space-y-3">
            {['Verifica licencia e identidad', 'Agrega al menos 3 especialidades', 'Describe viajes y rutas recientes', 'Solicita 2 recomendaciones'].map((item, index) => (
              <li key={item} className="flex gap-2 text-xs font-bold text-teal-900"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px]">{index + 1}</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <ShieldCheck className="text-teal-700" />
          <h3 className="mt-3 font-black text-slate-900">Tus datos bajo control</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Tú decides cuándo estar disponible y qué datos de contacto mostrar.</p>
        </div>
      </aside>
    </div>
  )
}

export default function Posturas() {
  const [view, setView] = useState('search')
  const [query, setQuery] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [comparison, setComparison] = useState([])
  const [profile, setProfile] = useState(null)
  const [filters, setFilters] = useState({
    area: 'todos', status: 'todos', license: 'todos', unit: 'todos', cargo: 'todos', coverage: 'todos',
    experience: 'todos', specialty: 'todos', company: '', rating: 'todos', verified: false,
  })

  const { data: remoteOperators = [], isLoading } = useQuery({
    queryKey: ['posturas'],
    queryFn: async () => {
      if (isDemoMode) return DEMO_OPERATORS
      const { data, error } = await supabase.from('posturas').select('*').eq('is_active', true).order('estatus').order('created_at', { ascending: false }).limit(24)
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  const operators = remoteOperators
  const stats = {
    operators: isDemoMode ? '—' : operators.length,
    companies: isDemoMode ? '—' : new Set(operators.map(op => op.empresa_anterior).filter(Boolean)).size,
    jobs: '—',
    available: isDemoMode ? '—' : operators.filter(op => op.estatus === 'disponible').length,
  }

  const filtered = useMemo(() => operators.filter(op => {
    const text = [op.nombre_completo, op.ciudad, op.area, op.puesto, op.descripcion, op.empresa_anterior, ...(op.especialidades || [])].join(' ').toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (filters.area !== 'todos' && op.area !== filters.area) return false
    if (filters.status !== 'todos' && op.estatus !== filters.status) return false
    if (filters.license !== 'todos' && op.tipo_licencia !== filters.license) return false
    if (filters.unit !== 'todos' && String(op.tipo_maniobra).toLowerCase() !== filters.unit.toLowerCase()) return false
    if (filters.cargo !== 'todos' && op.tipo_carga !== filters.cargo) return false
    if (filters.coverage !== 'todos' && op.labora !== filters.coverage && op.labora !== 'ambos') return false
    if (filters.experience !== 'todos' && Number(op.experiencia || 0) < Number(filters.experience)) return false
    if (filters.specialty !== 'todos' && !(op.especialidades || []).includes(filters.specialty)) return false
    if (filters.company && !String(op.empresa_anterior || '').toLowerCase().includes(filters.company.toLowerCase())) return false
    if (filters.rating !== 'todos' && Number(op.rating || 0) < Number(filters.rating)) return false
    if (filters.verified && !(op.licencia_url && op.ine_url)) return false
    return true
  }), [operators, query, filters])

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))
  const clearFilters = () => {
    setQuery('')
    setFilters({ area: 'todos', status: 'todos', license: 'todos', unit: 'todos', cargo: 'todos', coverage: 'todos', experience: 'todos', specialty: 'todos', company: '', rating: 'todos', verified: false })
  }
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === 'verified' ? value : value !== 'todos' && value !== '').length
  const toggleList = (setter, list, id, max) => setter(list.includes(id) ? list.filter(item => item !== id) : list.length < max ? [...list, id] : list)
  const runAiSearch = () => {
    const prompt = aiQuery.toLowerCase()
    setQuery('')
    if (prompt.includes('disponible')) setFilter('status', 'disponible')
    if (prompt.includes('federal e')) setFilter('license', 'federal-e')
    if (prompt.includes('full')) setFilter('unit', 'full')
    if (prompt.includes('matpel')) setFilter('specialty', 'MATPEL')
    if (prompt.includes('local')) setFilter('coverage', 'local')
    if (prompt.includes('tráfico') || prompt.includes('trafico')) setFilter('area', 'Tráfico y monitoreo')
    if (prompt.includes('aduanal') || prompt.includes('aduana')) setFilter('area', 'Aduanas y documentación')
    if (prompt.includes('administr')) setFilter('area', 'Administración')
    toast.success('Búsqueda interpretada: priorizando experiencia, disponibilidad y coincidencia')
    setView('search')
  }

  if (view === 'register') {
    return <div className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-6xl"><button onClick={() => setView('search')} className="mb-5 text-sm font-bold text-teal-700">← Volver al marketplace</button><RegistrationForm onDone={() => setView('search')} /></div></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-teal-950/20 bg-[#082f35] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_470px]">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-teal-200"><Zap size={12} /> Talento portuario verificado</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl">Encuentra talento logístico especializado en menos de 60 segundos.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Operadores, ejecutivos de tráfico, personal aduanal, coordinadores y perfiles administrativos de Manzanillo.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-teal-400 px-5 py-3 text-sm font-black text-teal-950 hover:bg-teal-300">Buscar talento</button>
                <button onClick={() => setView('register')} className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Publicar mi perfil</button>
              </div>
            </Reveal>
            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-black"><Sparkles size={16} className="text-amber-300" /> Búsqueda inteligente</div>
              <p className="mt-1 text-xs text-slate-300">Describe el perfil que necesitas con tus propias palabras.</p>
              <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)} rows="3" placeholder="Ej. Federal E, full, MATPEL, disponible hoy y con más de 5 años…"
                className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-300" />
              <button onClick={runAiSearch} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-teal-900"><Search size={15} /> Encontrar coincidencias</button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-100 px-4 sm:grid-cols-4 sm:divide-y-0">
          {[
            [stats.operators, 'Perfiles registrados', Users],
            [stats.companies, 'Empresas activas', Building2],
            [stats.jobs, 'Vacantes abiertas', BriefcaseBusiness],
            [stats.available, 'Disponibles hoy', CheckCircle2],
          ].map(([value, label, Icon]) => (
            <div key={label} className="flex items-center gap-3 px-3 py-5 sm:px-6">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon size={18} /></div>
              <div><p className="text-xl font-black text-slate-950">{value}</p><p className="text-[10px] font-bold text-slate-500 sm:text-xs">{label}</p>{value === '—' && <p className="text-[9px] text-slate-400">Fuente por conectar</p>}</div>
            </div>
          ))}
        </div>
      </section>

      <main id="marketplace" className="mx-auto max-w-7xl px-4 py-8">
        <section>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Directorio de talento</p><h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Profesionales destacados</h2><p className="mt-1 text-sm text-slate-500">Ordenados por confianza, disponibilidad y experiencia en el sector.</p></div>
            <div className="flex gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm"><SlidersHorizontal size={15} /> Filtros {activeFilterCount > 0 && <span className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>}</button>
              <button onClick={() => setView('register')} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-xs font-black text-white"><UserPlus size={15} /> Publicar perfil</button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca por nombre, especialidad, empresa, ruta o ciudad…"
                className="w-full rounded-xl bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none ring-teal-100 focus:ring-4" aria-label="Buscar talento" />
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black"><Filter size={15} /> Afinar resultados</h3><button onClick={clearFilters} className="text-xs font-bold text-teal-700">Limpiar todo</button></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['area', 'Área profesional', [['todos','Todas'], ...AREAS.map(item => [item,item])]],
                  ['status', 'Disponibilidad', [['todos','Cualquiera'],['disponible','Disponible hoy'],['ocupado','En ruta']]],
                  ['experience', 'Experiencia', [['todos','Cualquiera'],['3','3+ años'],['5','5+ años'],['10','10+ años']]],
                  ['license', 'Licencia', [['todos','Todas'], ...LICENCIAS.map(item => [item.value,item.label])]],
                  ['unit', 'Tipo de unidad', [['todos','Todas'], ...UNIDADES.map(item => [item.toLowerCase(),item])]],
                  ['cargo', 'Tipo de carga', [['todos','Todas'], ...CARGAS.map(item => [item,item])]],
                  ['coverage', 'Local / Foráneo', [['todos','Cualquiera'],['local','Local'],['foraneo','Foráneo'],['ambos','Ambos']]],
                  ['specialty', 'Especialidad', [['todos','Todas'], ...ESPECIALIDADES.map(item => [item,item])]],
                  ['rating', 'Calificación', [['todos','Cualquiera'],['4.5','4.5+'],['4.8','4.8+']]],
                ].map(([key, label, options]) => (
                  <label key={key} className="relative"><span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span><select value={filters[key]} onChange={e => setFilter(key, e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-teal-600">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute bottom-3 right-3 text-slate-400" /></label>
                ))}
                <label><span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Empresa anterior</span><input value={filters.company} onChange={e => setFilter('company', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-teal-600" placeholder="Buscar empresa" /></label>
                <label className="flex items-end"><span className="flex h-[38px] w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={filters.verified} onChange={e => setFilter('verified', e.target.checked)} className="accent-teal-700" /> Documentos verificados</span></label>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between text-xs"><p className="font-bold text-slate-500">{filtered.length} coincidencia{filtered.length === 1 ? '' : 's'} relevantes</p><p className="text-slate-400">Resultados según tus filtros</p></div>
          {isLoading ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">{[1,2,3,4].map(item => <div key={item} className="h-96 animate-pulse rounded-2xl bg-slate-200" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="mt-4"><EmptyState filtered={operators.length > 0} onRegister={() => setView('register')} onClear={clearFilters} /></div>
          ) : (
            <Stagger className="mt-4 grid gap-4 lg:grid-cols-2">{filtered.map((op, index) => <Stagger.Item key={op.id}><OperatorCard operator={op} featured={index < 2 && !query && activeFilterCount === 0} favorite={favorites.includes(op.id)} selected={comparison.includes(op.id)} onFavorite={id => toggleList(setFavorites, favorites, id, 100)} onCompare={id => toggleList(setComparison, comparison, id, 3)} onView={setProfile} /></Stagger.Item>)}</Stagger>
          )}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Oportunidades</p><h2 className="mt-1 text-2xl font-black">Vacantes recientes</h2></div><a href="/vacantes" className="text-xs font-black text-teal-700">Ver todas →</a></div>
            <div className="mt-4 space-y-3">{JOBS.map(job => <article key={job.role} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white"><BriefcaseBusiness size={19} /></div><div className="min-w-0 flex-1"><h3 className="font-black text-slate-900">{job.role}</h3><p className="text-xs text-slate-500">{job.company} · {job.meta}</p></div><span className="text-[10px] font-bold text-slate-400">{job.age}</span><a href="/vacantes" className="rounded-xl bg-teal-50 px-4 py-2.5 text-center text-xs font-black text-teal-800">Ver vacante</a></article>)}</div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Red empresarial</p><h2 className="mt-1 text-2xl font-black">Empresas contratando</h2>
            <div className="mt-4 space-y-3">{COMPANIES.map(company => <article key={company.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-800 text-xs font-black text-white">{company.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{company.name} {company.verified && <BadgeCheck size={13} className="inline text-blue-600" />}</p><p className="text-[10px] text-slate-500">{company.openings} vacantes abiertas</p></div><ArrowRight size={15} className="text-slate-400" /></article>)}</div>
          </div>
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">¿Por qué registrarte?</p><h2 className="mt-3 text-3xl font-black tracking-tight">Tu experiencia merece convertirse en reputación.</h2><p className="mt-3 text-sm leading-6 text-slate-400">Cada documento, viaje y recomendación fortalece tu posición en el ranking y mejora la calidad de las oportunidades que recibes.</p><button onClick={() => setView('register')} className="mt-6 rounded-xl bg-teal-400 px-5 py-3 text-sm font-black text-teal-950">Crear mi perfil gratis</button></div>
            <div className="grid gap-3 sm:grid-cols-2">{[
              [ShieldCheck, 'Confianza verificable', 'Licencia, identidad y médico visibles para empresas.'],
              [BarChart3, 'Ranking transparente', 'Sube posiciones con actividad y buenas referencias.'],
              [MessageCircle, 'Contacto directo', 'Recibe oportunidades por WhatsApp sin intermediarios.'],
              [Sparkles, 'Asistente de perfil', 'Recomendaciones para mejorar alcance y conversión.'],
            ].map(([Icon, title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4"><Icon size={20} className="text-teal-300" /><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>)}</div>
          </div>
        </section>
      </main>

      {comparison.length > 0 && (
        <div className="fixed bottom-16 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl sm:bottom-5">
          <div className="min-w-0 flex-1"><p className="text-xs font-black">{comparison.length}/3 perfiles seleccionados</p><p className="text-[10px] text-slate-400">Compara confianza, experiencia y disponibilidad</p></div>
          <button disabled={comparison.length < 2} onClick={() => toast.success('Comparador preparado con ' + comparison.length + ' perfiles')} className="rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-black text-teal-950 disabled:bg-slate-700 disabled:text-slate-400">Comparar</button>
          <button onClick={() => setComparison([])} aria-label="Limpiar comparación" className="text-slate-400"><X size={16} /></button>
        </div>
      )}

      {profile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={'Perfil de ' + profile.nombre_completo}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Perfil profesional</p><h2 className="mt-1 text-2xl font-black">{profile.nombre_completo}</h2></div><button onClick={() => setProfile(null)} aria-label="Cerrar perfil" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"><X size={16} /></button></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{profile.descripcion}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">{[['Confianza', (profile.score || 72) + '/100'],['Experiencia', (profile.experiencia || 3) + ' años'],['Viajes', Number(profile.viajes || 320).toLocaleString()],['Recomendaciones', profile.recomendaciones || 8]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="font-black text-slate-900">{value}</p></div>)}</div>
            <button onClick={() => setProfile(null)} className="mt-5 w-full rounded-xl bg-teal-700 py-3 text-sm font-black text-white">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
