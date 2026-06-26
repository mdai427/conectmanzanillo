import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, Search, ChevronDown, MapPin, Clock, BadgeCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../stores/authStore.js'

// ─── Constantes ────────────────────────────────────────────────────────────────
const LICENCIAS = [
  { value: 'federal-a',   label: 'Federal tipo A – Pasajeros' },
  { value: 'federal-b',   label: 'Federal tipo B – Carga general' },
  { value: 'federal-c',   label: 'Federal tipo C – Autobús' },
  { value: 'federal-d',   label: 'Federal tipo D – Carga especial' },
  { value: 'chofer',      label: 'Chofer particular' },
  { value: 'cualquiera',  label: 'Cualquier licencia' },
]

const MANIOBRAS = [
  { value: 'full',        label: 'Full' },
  { value: 'sencillo',    label: 'Sencillo' },
  { value: 'doblero',     label: 'Doblero' },
  { value: 'porteo',      label: 'Porteo' },
  { value: 'plataforma',  label: 'Plataforma' },
  { value: 'cualquiera',  label: 'Cualquier maniobra' },
]

const LABORA = [
  { value: 'local',   label: 'Local' },
  { value: 'foraneo', label: 'Foráneo' },
  { value: 'ambos',   label: 'Local y Foráneo' },
]

const CONTRATOS = [
  { value: 'indefinido', label: 'Base / Planta' },
  { value: 'temporal',   label: 'Temporal' },
  { value: 'por-viaje',  label: 'Por viaje / Flete' },
  { value: 'honorarios', label: 'Honorarios' },
]

const CONTRATO_COLOR = {
  indefinido: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  temporal:   { bg: '#fefce8', text: '#92400e', border: '#fde68a' },
  'por-viaje':{ bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  honorarios: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
}

const inputCls = 'w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400'
const selectCls = inputCls + ' appearance-none cursor-pointer'
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5'

// ─── Card de vacante ──────────────────────────────────────────────────────────
function VacanteCard({ v, perfil, destacada }) {
  const licLabel = LICENCIAS.find(l => l.value === v.tipo_licencia)?.label || v.tipo_licencia
  const laboraLabel = LABORA.find(l => l.value === v.labora)?.label || v.labora
  const contratoLabel = CONTRATOS.find(c => c.value === v.tipo_contrato)?.label || v.tipo_contrato
  const contratoCfg = CONTRATO_COLOR[v.tipo_contrato] || CONTRATO_COLOR.indefinido

  const diasRestantes = Math.max(0, Math.ceil((new Date(v.expires_at) - new Date()) / 86400000))

  // Calcular match si hay perfil
  const match = perfil ? calcularMatch(v, perfil) : null

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 ${destacada ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
         style={{ borderColor: destacada ? '#93c5fd' : '#e2e8f0' }}>

      {destacada && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full w-fit text-[10px] font-bold"
             style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
          <Sparkles size={10} />
          Recomendada para tu perfil · {match}% compatible
        </div>
      )}

      {/* Header empresa */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg text-white"
               style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
            {v.empresa.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-800 text-sm leading-tight">{v.puesto}</p>
            <p className="text-xs text-slate-500 font-medium">{v.empresa}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: contratoCfg.bg, color: contratoCfg.text, border: `1px solid ${contratoCfg.border}` }}>
          {contratoLabel}
        </span>
      </div>

      {/* Chips de requisitos */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          🪪 {licLabel}
        </span>
        {v.tipo_maniobra && v.tipo_maniobra !== 'cualquiera' && (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            🚛 {MANIOBRAS.find(m => m.value === v.tipo_maniobra)?.label}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          📍 {laboraLabel}
        </span>
        {v.antiguedad_min > 0 && (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            ⏱ {v.antiguedad_min}+ años exp.
          </span>
        )}
      </div>

      {/* Sueldo */}
      {(v.sueldo_min || v.sueldo_max) && (
        <p className="text-sm font-black text-green-700 mb-2">
          💰 {v.sueldo_min ? `$${Number(v.sueldo_min).toLocaleString()}` : ''}
          {v.sueldo_min && v.sueldo_max ? ' – ' : ''}
          {v.sueldo_max ? `$${Number(v.sueldo_max).toLocaleString()} MXN` : 'MXN / mes'}
        </p>
      )}

      {/* Descripción */}
      {v.descripcion && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{v.descripcion}</p>
      )}

      {/* Beneficios */}
      {v.beneficios && (
        <div className="flex items-center gap-1.5 mb-3">
          <BadgeCheck size={12} className="text-green-500 shrink-0" />
          <p className="text-xs text-slate-500 line-clamp-1">{v.beneficios}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><MapPin size={9} />{v.ciudad}</span>
          <span className="flex items-center gap-1"><Clock size={9} />{diasRestantes}d restantes</span>
        </div>
        {v.contacto_wa ? (
          <a href={`https://wa.me/52${v.contacto_wa.replace(/\D/g,'')}?text=Hola%2C%20vi%20la%20vacante%20de%20${encodeURIComponent(v.puesto)}%20en%20ConectManzanillo%20y%20me%20interesa.`}
             target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
             style={{ background: '#25D366' }}>
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactar
          </a>
        ) : v.contacto_tel ? (
          <a href={`tel:${v.contacto_tel}`}
             className="px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all">
            📞 Llamar
          </a>
        ) : null}
      </div>
    </div>
  )
}

// ─── Calcular compatibilidad entre vacante y perfil del operador ──────────────
function calcularMatch(vacante, perfil) {
  let score = 0
  let total = 0

  // Licencia (peso alto)
  total += 40
  if (vacante.tipo_licencia === 'cualquiera' || vacante.tipo_licencia === perfil.tipo_licencia) score += 40

  // Maniobra
  total += 20
  if (!vacante.tipo_maniobra || vacante.tipo_maniobra === 'cualquiera' || vacante.tipo_maniobra === perfil.tipo_maniobra) score += 20

  // Labora (local/foráneo)
  total += 20
  if (vacante.labora === 'ambos' || perfil.labora === 'ambos' || vacante.labora === perfil.labora) score += 20

  // Antigüedad
  total += 20
  const antigCumple = !vacante.antiguedad_min || (perfil.edad && (perfil.edad - 18) >= vacante.antiguedad_min)
  if (antigCumple) score += 20

  return Math.round((score / total) * 100)
}

// ─── Formulario empresa ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  empresa: '', contacto_nombre: '', contacto_tel: '', contacto_wa: '', contacto_correo: '',
  ciudad: 'Manzanillo', puesto: '', descripcion: '', sueldo_min: '', sueldo_max: '',
  tipo_contrato: 'indefinido', tipo_licencia: 'federal-b', tipo_maniobra: 'cualquiera',
  antiguedad_min: '0', labora: 'ambos', edad_min: '', edad_max: '',
  requisitos_extra: '', beneficios: '',
}

function FormEmpresa({ onSuccess }) {
  const { user } = useAuthStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const qc = useQueryClient()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.empresa.trim()) throw new Error('El nombre de la empresa es requerido')
      if (!form.puesto.trim()) throw new Error('El nombre del puesto es requerido')
      if (!form.contacto_wa && !form.contacto_tel) throw new Error('Agrega al menos un contacto')

      const payload = {
        ...form,
        sueldo_min: form.sueldo_min ? parseFloat(form.sueldo_min) : null,
        sueldo_max: form.sueldo_max ? parseFloat(form.sueldo_max) : null,
        antiguedad_min: parseInt(form.antiguedad_min) || 0,
        edad_min: form.edad_min ? parseInt(form.edad_min) : null,
        edad_max: form.edad_max ? parseInt(form.edad_max) : null,
        user_id: user?.id || null,
      }
      const { error } = await supabase.from('vacantes').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('¡Vacante publicada! Los operadores ya pueden verla.')
      setForm(EMPTY_FORM)
      qc.invalidateQueries({ queryKey: ['vacantes'] })
      onSuccess?.()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      {/* Datos empresa */}
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Datos de la empresa</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre de la empresa *</label>
            <input value={form.empresa} onChange={e => set('empresa', e.target.value)}
              placeholder="Transportes Manzanillo SA de CV" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nombre de contacto</label>
            <input value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
              placeholder="Nombre del responsable" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ciudad</label>
            <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
              placeholder="Manzanillo, Colima" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp *</label>
            <input type="tel" value={form.contacto_wa} onChange={e => set('contacto_wa', e.target.value)}
              placeholder="314 000 0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="tel" value={form.contacto_tel} onChange={e => set('contacto_tel', e.target.value)}
              placeholder="314 000 0000" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Correo (opcional)</label>
            <input type="email" value={form.contacto_correo} onChange={e => set('contacto_correo', e.target.value)}
              placeholder="rrhh@empresa.com" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Datos del puesto */}
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Descripción del puesto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre del puesto *</label>
            <input value={form.puesto} onChange={e => set('puesto', e.target.value)}
              placeholder="Operador de camión de carga / Chofer foráneo" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Descripción del trabajo</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              rows={3} placeholder="Describe las actividades, rutas, horarios..."
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Tipo de contrato</label>
            <div className="relative">
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} className={selectCls}>
                {CONTRATOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Modalidad de trabajo</label>
            <div className="relative">
              <select value={form.labora} onChange={e => set('labora', e.target.value)} className={selectCls}>
                {LABORA.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Sueldo mínimo (MXN/mes)</label>
            <input type="number" value={form.sueldo_min} onChange={e => set('sueldo_min', e.target.value)}
              placeholder="15000" min={0} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sueldo máximo (MXN/mes)</label>
            <input type="number" value={form.sueldo_max} onChange={e => set('sueldo_max', e.target.value)}
              placeholder="25000" min={0} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Beneficios</label>
            <input value={form.beneficios} onChange={e => set('beneficios', e.target.value)}
              placeholder="IMSS, INFONAVIT, vales de despensa, fondo de ahorro..." className={inputCls} />
          </div>
        </div>
      </div>

      {/* Requisitos */}
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Requisitos del operador</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tipo de licencia requerida *</label>
            <div className="relative">
              <select value={form.tipo_licencia} onChange={e => set('tipo_licencia', e.target.value)} className={selectCls}>
                {LICENCIAS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tipo de maniobra</label>
            <div className="relative">
              <select value={form.tipo_maniobra} onChange={e => set('tipo_maniobra', e.target.value)} className={selectCls}>
                {MANIOBRAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Antigüedad mínima (años)</label>
            <input type="number" value={form.antiguedad_min} onChange={e => set('antiguedad_min', e.target.value)}
              placeholder="2" min={0} max={30} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Edad mín.</label>
              <input type="number" value={form.edad_min} onChange={e => set('edad_min', e.target.value)}
                placeholder="25" min={18} max={70} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Edad máx.</label>
              <input type="number" value={form.edad_max} onChange={e => set('edad_max', e.target.value)}
                placeholder="55" min={18} max={70} className={inputCls} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Otros requisitos</label>
            <textarea value={form.requisitos_extra} onChange={e => set('requisitos_extra', e.target.value)}
              rows={2} placeholder="Sin antecedentes penales, disponibilidad de lunes a sábado, etc."
              className={inputCls + ' resize-none'} />
          </div>
        </div>
      </div>

      <button onClick={() => mutate()} disabled={isPending}
        className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
        {isPending ? 'Publicando…' : '📋 Publicar vacante'}
      </button>
      <p className="text-xs text-slate-400 text-center">
        La vacante estará activa 30 días. Aparecerá recomendada a los operadores con perfil compatible.
      </p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Vacantes() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('buscar')
  const [busqueda, setBusqueda] = useState('')
  const [filtroLabora, setFiltroLabora] = useState('todos')
  const [filtroLicencia, setFiltroLicencia] = useState('todos')
  const [filtroContrato, setFiltroContrato] = useState('todos')

  // Cargar perfil del operador si está logueado (para recomendaciones)
  const { data: miPerfil } = useQuery({
    queryKey: ['mi-postura', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('posturas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const { data: vacantes = [], isLoading } = useQuery({
    queryKey: ['vacantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacantes')
        .select('*')
        .eq('is_active', true)
        .eq('estatus', 'activa')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  // Calcular vacantes recomendadas según perfil
  const recomendadas = miPerfil
    ? vacantes
        .map(v => ({ ...v, _match: calcularMatch(v, miPerfil) }))
        .filter(v => v._match >= 60)
        .sort((a, b) => b._match - a._match)
        .slice(0, 4)
    : []

  const filtradas = vacantes.filter(v => {
    if (filtroLabora !== 'todos' && v.labora !== filtroLabora && v.labora !== 'ambos') return false
    if (filtroLicencia !== 'todos' && v.tipo_licencia !== filtroLicencia && v.tipo_licencia !== 'cualquiera') return false
    if (filtroContrato !== 'todos' && v.tipo_contrato !== filtroContrato) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return v.empresa?.toLowerCase().includes(q) ||
             v.puesto?.toLowerCase().includes(q) ||
             v.descripcion?.toLowerCase().includes(q)
    }
    return true
  })

  const tabCls = (id) =>
    `flex-1 py-3 text-sm font-black rounded-xl transition-all ${
      tab === id ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
    }`

  const selectFiltro = 'rounded-xl px-3 py-2.5 text-sm bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer font-medium w-full'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Vacantes</h1>
              <p className="text-slate-500 text-sm">
                {vacantes.length} vacante{vacantes.length !== 1 ? 's' : ''} activa{vacantes.length !== 1 ? 's' : ''}
                {miPerfil && recomendadas.length > 0 && (
                  <span className="text-blue-600 font-bold"> · {recomendadas.length} recomendadas para ti</span>
                )}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 rounded-2xl gap-1 bg-slate-100">
            <button onClick={() => setTab('buscar')} className={tabCls('buscar')}
              style={tab === 'buscar' ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
              🔍 Ver vacantes
            </button>
            <button onClick={() => setTab('publicar')} className={tabCls('publicar')}
              style={tab === 'publicar' ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' } : {}}>
              🏢 Publicar vacante
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── VER VACANTES ── */}
        {tab === 'buscar' && (
          <div>
            {/* Recomendadas (si tiene perfil) */}
            {miPerfil && recomendadas.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-blue-500" />
                  <p className="text-sm font-black text-slate-700">Recomendadas para tu perfil</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recomendadas.map(v => (
                    <VacanteCard key={v.id} v={v} perfil={miPerfil} destacada={true} />
                  ))}
                </div>
                <div className="mt-4 mb-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Todas las vacantes</p>
                </div>
              </div>
            )}

            {/* Sin perfil: banner para crear postura */}
            {!miPerfil && user && (
              <div className="mb-5 p-4 rounded-2xl border border-blue-100 bg-blue-50 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-blue-800">¿Buscas trabajo?</p>
                  <p className="text-xs text-blue-600">Crea tu perfil en Posturas y te mostraremos vacantes compatibles.</p>
                </div>
                <a href="/posturas" className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-white"
                   style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  Crear perfil
                </a>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar empresa, puesto, descripción…"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={filtroLabora} onChange={e => setFiltroLabora(e.target.value)} className={selectFiltro}>
                  <option value="todos">Local / Foráneo</option>
                  <option value="local">📍 Local</option>
                  <option value="foraneo">🗺️ Foráneo</option>
                </select>
                <select value={filtroLicencia} onChange={e => setFiltroLicencia(e.target.value)} className={selectFiltro}>
                  <option value="todos">Tipo de licencia</option>
                  {LICENCIAS.filter(l => l.value !== 'cualquiera').map(l =>
                    <option key={l.value} value={l.value}>{l.label}</option>
                  )}
                </select>
                <select value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)} className={selectFiltro}>
                  <option value="todos">Tipo de contrato</option>
                  {CONTRATOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Listado */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-52 animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : filtradas.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-slate-700 mb-1">No hay vacantes con esos filtros</p>
                <p className="text-sm text-slate-400 mb-4">¿Eres empresa? Publica una vacante ahora.</p>
                <button onClick={() => setTab('publicar')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  Publicar vacante
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 font-semibold mb-3">
                  {filtradas.length} vacante{filtradas.length !== 1 ? 's' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtradas.map(v => <VacanteCard key={v.id} v={v} perfil={miPerfil} destacada={false} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PUBLICAR VACANTE ── */}
        {tab === 'publicar' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-800 mb-1">Publica una vacante</h2>
              <p className="text-sm text-slate-500">
                Llega directo a los operadores disponibles del Puerto de Manzanillo.
                Los operadores con perfil compatible verán tu vacante destacada.
              </p>
            </div>
            <FormEmpresa onSuccess={() => setTab('buscar')} />
          </div>
        )}
      </div>
    </div>
  )
}
