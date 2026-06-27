import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Briefcase, Search, User, Phone, Star, ChevronDown, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../stores/authStore.js'

// ─── Constantes ────────────────────────────────────────────────────────────────
const LICENCIAS = [
  { value: 'federal-a',   label: 'Federal tipo A – Pasajeros' },
  { value: 'federal-b',   label: 'Federal tipo B – Carga general' },
  { value: 'federal-c',   label: 'Federal tipo C – Autobús' },
  { value: 'federal-d',   label: 'Federal tipo D – Carga especial' },
  { value: 'federal-e',   label: 'Federal tipo E – Doble articulado / MATPEL' },
  { value: 'chofer',      label: 'Chofer particular' },
  { value: 'otro',        label: 'Otro' },
]

const MANIOBRAS = [
  { value: 'full',      label: 'Full' },
  { value: 'sencillo',  label: 'Sencillo' },
  { value: 'doblero',   label: 'Doblero' },
  { value: 'porteo',    label: 'Porteo' },
  { value: 'plataforma',label: 'Plataforma' },
  { value: 'otro',      label: 'Otro' },
]

const LABORA = [
  { value: 'local',   label: 'Local' },
  { value: 'foraneo', label: 'Foráneo' },
  { value: 'ambos',   label: 'Local y Foráneo' },
]

const ESTATUS_CFG = {
  disponible:      { label: 'Disponible',        color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  ocupado:         { label: 'Ocupado / En ruta',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  'no-disponible': { label: 'No disponible',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
}

// ─── Semáforo inline ──────────────────────────────────────────────────────────
function Semaforo({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {Object.entries(ESTATUS_CFG).map(([key, cfg]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all"
          style={{
            borderColor: value === key ? cfg.color : '#e2e8f0',
            background:  value === key ? cfg.bg    : 'white',
            color:       value === key ? cfg.color : '#94a3b8',
          }}
        >
          <span className="w-3 h-3 rounded-full shrink-0 transition-all"
            style={{ background: value === key ? cfg.dot : '#cbd5e1',
                     boxShadow: value === key ? `0 0 6px ${cfg.dot}` : 'none' }} />
          {cfg.label}
        </button>
      ))}
    </div>
  )
}

// ─── Card de operador ─────────────────────────────────────────────────────────
function OperadorCard({ op }) {
  const cfg = ESTATUS_CFG[op.estatus] || ESTATUS_CFG['no-disponible']
  const licLabel = LICENCIAS.find(l => l.value === op.tipo_licencia)?.label || op.tipo_licencia
  const manoLabel = MANIOBRAS.find(m => m.value === op.tipo_maniobra)?.label || op.tipo_maniobra
  const laboraLabel = LABORA.find(l => l.value === op.labora)?.label || op.labora

  return (
    <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-4"
         style={{ borderColor: cfg.border }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg text-white"
               style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})` }}>
            {op.nombre_completo.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-800 text-sm leading-tight">{op.nombre_completo}</p>
            {op.ciudad && <p className="text-xs text-slate-400">{op.ciudad}</p>}
          </div>
        </div>
        {/* Semáforo badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
             style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
          {cfg.label}
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          🪪 {licLabel}
        </span>
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          🚛 {manoLabel}
        </span>
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          📍 {laboraLabel}
        </span>
        {op.edad && (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            {op.edad} años
          </span>
        )}
      </div>

      {/* Verificado */}
      {(op.licencia_url || op.ine_url) && (
        <div className="flex gap-2 mb-3">
          {op.licencia_url && (
            <span className="flex items-center gap-1 text-[10px] text-green-700 font-semibold">
              <CheckCircle size={10} /> Licencia verificada
            </span>
          )}
          {op.ine_url && (
            <span className="flex items-center gap-1 text-[10px] text-green-700 font-semibold">
              <CheckCircle size={10} /> INE verificada
            </span>
          )}
        </div>
      )}

      {op.descripcion && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{op.descripcion}</p>
      )}

      {/* Contacto */}
      {op.estatus === 'disponible' && (
        <div className="flex gap-2 mt-1">
          {op.whatsapp && (
            <a href={`https://wa.me/52${op.whatsapp.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(op.nombre_completo)}%2C%20te%20vi%20en%20ConectManzanillo%20y%20me%20interesa%20contactarte.`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-1 justify-center transition-all hover:opacity-90"
               style={{ background: '#25D366' }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
          {op.telefono && (
            <a href={`tel:${op.telefono}`}
               className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
              <Phone size={12} />
              Llamar
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulario de registro ───────────────────────────────────────────────────
const EMPTY_FORM = {
  nombre_completo: '', edad: '', tipo_licencia: 'federal-b', tipo_maniobra: 'full',
  labora: 'local', telefono: '', whatsapp: '', correo: '', ciudad: 'Manzanillo', descripcion: '',
  estatus: 'disponible',
}

function FormPostular({ onSuccess }) {
  const { user } = useAuthStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [licenciaFile, setLicenciaFile] = useState(null)
  const [ineFile, setIneFile] = useState(null)
  const qc = useQueryClient()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.nombre_completo.trim()) throw new Error('El nombre es requerido')
      if (!form.whatsapp && !form.telefono) throw new Error('Agrega al menos un número de contacto')

      let licencia_url = null
      let ine_url = null

      // Upload licencia
      if (licenciaFile) {
        const ext = licenciaFile.name.split('.').pop()
        const path = `posturas/licencias/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('documents').upload(path, licenciaFile, { upsert: true })
        if (!error) {
          const { data } = supabase.storage.from('documents').getPublicUrl(path)
          licencia_url = data.publicUrl
        }
      }
      // Upload INE
      if (ineFile) {
        const ext = ineFile.name.split('.').pop()
        const path = `posturas/ine/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('documents').upload(path, ineFile, { upsert: true })
        if (!error) {
          const { data } = supabase.storage.from('documents').getPublicUrl(path)
          ine_url = data.publicUrl
        }
      }

      const payload = {
        ...form,
        edad: form.edad ? parseInt(form.edad) : null,
        user_id: user?.id || null,
        licencia_url,
        ine_url,
      }
      const { error } = await supabase.from('posturas').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('¡Perfil publicado! Ya eres visible para empresas.')
      setForm(EMPTY_FORM)
      setLicenciaFile(null)
      setIneFile(null)
      qc.invalidateQueries({ queryKey: ['posturas'] })
      onSuccess?.()
    },
    onError: (e) => toast.error(e.message),
  })

  const inputCls = 'w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400'
  const selectCls = inputCls + ' appearance-none cursor-pointer'
  const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5'

  return (
    <div className="space-y-5">
      {/* Nombre y edad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nombre completo *</label>
          <input value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)}
            placeholder="Tu nombre completo" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Edad</label>
          <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)}
            placeholder="Ej: 35" min={18} max={75} className={inputCls} />
        </div>
      </div>

      {/* Licencia y maniobra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tipo de licencia *</label>
          <div className="relative">
            <select value={form.tipo_licencia} onChange={e => set('tipo_licencia', e.target.value)} className={selectCls}>
              {LICENCIAS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Tipo de maniobra *</label>
          <div className="relative">
            <select value={form.tipo_maniobra} onChange={e => set('tipo_maniobra', e.target.value)} className={selectCls}>
              {MANIOBRAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Labora y ciudad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Disponibilidad de trabajo</label>
          <div className="relative">
            <select value={form.labora} onChange={e => set('labora', e.target.value)} className={selectCls}>
              {LABORA.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Ciudad</label>
          <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
            placeholder="Manzanillo, Colima" className={inputCls} />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Teléfono (llamadas)</label>
          <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)}
            placeholder="314 000 0000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>WhatsApp *</label>
          <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
            placeholder="314 000 0000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Correo (opcional)</label>
          <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)}
            placeholder="tu@correo.com" className={inputCls} />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className={labelCls}>Descripción / experiencia</label>
        <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          rows={3} placeholder="Cuéntanos tu experiencia, años manejando, rutas que conoces..."
          className={inputCls + ' resize-none'} />
      </div>

      {/* Documentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 bg-slate-50 hover:border-blue-300 transition-colors">
          <label className="cursor-pointer block text-center">
            <div className="text-2xl mb-1">🪪</div>
            <p className="text-xs font-bold text-slate-600 mb-0.5">Licencia federal</p>
            <p className="text-[10px] text-slate-400 mb-2">Foto de tu licencia (JPG/PNG)</p>
            {licenciaFile ? (
              <span className="text-[11px] text-green-600 font-semibold">✅ {licenciaFile.name}</span>
            ) : (
              <span className="text-[11px] text-blue-500 font-semibold">Seleccionar foto</span>
            )}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setLicenciaFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 bg-slate-50 hover:border-blue-300 transition-colors">
          <label className="cursor-pointer block text-center">
            <div className="text-2xl mb-1">🪪</div>
            <p className="text-xs font-bold text-slate-600 mb-0.5">INE / Credencial</p>
            <p className="text-[10px] text-slate-400 mb-2">Foto de tu INE (JPG/PNG)</p>
            {ineFile ? (
              <span className="text-[11px] text-green-600 font-semibold">✅ {ineFile.name}</span>
            ) : (
              <span className="text-[11px] text-blue-500 font-semibold">Seleccionar foto</span>
            )}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setIneFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>

      {/* Semáforo */}
      <div>
        <label className={labelCls}>Mi estatus actual</label>
        <Semaforo value={form.estatus} onChange={v => set('estatus', v)} />
      </div>

      <button onClick={() => mutate()} disabled={isPending}
        className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
        {isPending ? 'Publicando…' : '📤 Publicar mi perfil'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Tu perfil será visible para empresas y transportistas del puerto. Puedes actualizar tu estatus cuando quieras.
      </p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Posturas() {
  const [tab, setTab] = useState('buscar')       // 'buscar' | 'postular'
  const [filtroEstatus, setFiltroEstatus] = useState('todos')
  const [filtroLabora, setFiltroLabora] = useState('todos')
  const [filtroLicencia, setFiltroLicencia] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const { data: operadores = [], isLoading } = useQuery({
    queryKey: ['posturas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posturas')
        .select('*')
        .eq('is_active', true)
        .order('estatus')          // disponibles primero
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  const filtrados = operadores.filter(op => {
    if (filtroEstatus !== 'todos' && op.estatus !== filtroEstatus) return false
    if (filtroLabora  !== 'todos' && op.labora  !== filtroLabora)  return false
    if (filtroLicencia !== 'todos' && op.tipo_licencia !== filtroLicencia) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (op.nombre_completo?.toLowerCase().includes(q) ||
              op.ciudad?.toLowerCase().includes(q) ||
              op.descripcion?.toLowerCase().includes(q))
    }
    return true
  })

  const disponibles = operadores.filter(o => o.estatus === 'disponible').length

  const tabCls = (id) =>
    `flex-1 py-3 text-sm font-black rounded-xl transition-all ${
      tab === id
        ? 'text-white shadow-md'
        : 'text-slate-500 hover:text-slate-700'
    }`

  const selectCls = 'rounded-xl px-3 py-2.5 text-sm bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-400 appearance-none cursor-pointer font-medium'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <Briefcase size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Operadores</h1>
              <p className="text-slate-500 text-sm">
                Operadores disponibles · <span className="text-green-600 font-bold">{disponibles} disponibles ahora</span>
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 rounded-2xl gap-1 bg-slate-100">
            <button onClick={() => setTab('buscar')} className={tabCls('buscar')}
              style={tab === 'buscar' ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
              🔍 Buscar operador
            </button>
            <button onClick={() => setTab('postular')} className={tabCls('postular')}
              style={tab === 'postular' ? { background: 'linear-gradient(135deg, #16a34a, #22c55e)' } : {}}>
              📤 Publicar mi perfil
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── BUSCAR ── */}
        {tab === 'buscar' && (
          <div>
            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, ciudad, experiencia…"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={selectCls + ' w-full'}>
                    <option value="todos">Todos los estatus</option>
                    <option value="disponible">🟢 Disponibles</option>
                    <option value="ocupado">🟡 Ocupados</option>
                    <option value="no-disponible">🔴 No disponible</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={filtroLabora} onChange={e => setFiltroLabora(e.target.value)} className={selectCls + ' w-full'}>
                    <option value="todos">Local / Foráneo</option>
                    <option value="local">📍 Local</option>
                    <option value="foraneo">🗺️ Foráneo</option>
                    <option value="ambos">🌐 Ambos</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={filtroLicencia} onChange={e => setFiltroLicencia(e.target.value)} className={selectCls + ' w-full'}>
                    <option value="todos">Todas las licencias</option>
                    {LICENCIAS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Semáforo resumen */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {Object.entries(ESTATUS_CFG).map(([key, cfg]) => {
                const count = operadores.filter(o => o.estatus === key).length
                return (
                  <button key={key} onClick={() => setFiltroEstatus(filtroEstatus === key ? 'todos' : key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
                    style={{
                      background: filtroEstatus === key ? cfg.bg : 'white',
                      borderColor: filtroEstatus === key ? cfg.color : '#e2e8f0',
                      color: filtroEstatus === key ? cfg.color : '#64748b',
                    }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot }} />
                    {cfg.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Resultados */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-44 animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">🚛</p>
                <p className="font-bold text-slate-700 mb-1">No hay operadores con esos filtros</p>
                <p className="text-sm text-slate-400">Intenta con otros criterios o vuelve más tarde</p>
                <button onClick={() => setTab('postular')}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
                  Publicar mi perfil
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 font-semibold mb-3">
                  {filtrados.length} operador{filtrados.length !== 1 ? 'es' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtrados.map(op => <OperadorCard key={op.id} op={op} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── POSTULAR ── */}
        {tab === 'postular' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-800 mb-1">Publica tu perfil de operador</h2>
              <p className="text-sm text-slate-500">
                Tu perfil será visible para transportistas y empresas del puerto que buscan operadores.
                Incluye tu licencia e INE para aparecer como <span className="text-green-600 font-semibold">verificado</span>.
              </p>
            </div>
            <FormPostular onSuccess={() => setTab('buscar')} />
          </div>
        )}
      </div>
    </div>
  )
}
