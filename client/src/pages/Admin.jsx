import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import {
  AlertTriangle, Newspaper, Megaphone, List, Users, Map,
  Plus, Trash2, X, Shield
} from 'lucide-react'

const ROLES = ['operator_free', 'operator_premium', 'company', 'admin']

const TABS = [
  { id: 'alerts',    label: 'Alertas',    icon: AlertTriangle },
  { id: 'news',      label: 'Noticias',   icon: Newspaper     },
  { id: 'ads',       label: 'Anuncios',   icon: Megaphone     },
  { id: 'directory', label: 'Directorio', icon: List          },
  { id: 'users',     label: 'Usuarios',   icon: Users         },
  { id: 'sections',  label: 'Zonas',      icon: Map           },
]

// ── Alertas ──────────────────────────────────────────────────────────────────
function AlertsTab() {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const qc = useQueryClient()

  const { data: alerts = [] } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const { data } = await supabase.from('emergency_alerts')
        .select('*').order('created_at', { ascending: false }).limit(10)
      return data || []
    },
  })

  async function createAlert() {
    if (!msg.trim()) return
    setSending(true)
    const { error } = await supabase.from('emergency_alerts').insert({ message: msg.trim() })
    if (error) toast.error(error.message)
    else { toast.success('Alerta activada'); setMsg(''); qc.invalidateQueries({ queryKey: ['admin-alerts'] }) }
    setSending(false)
  }

  async function deactivate(id) {
    await supabase.from('emergency_alerts')
      .update({ is_active: false, resolved_at: new Date().toISOString() }).eq('id', id)
    toast.success('Alerta desactivada')
    qc.invalidateQueries({ queryKey: ['admin-alerts'] })
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161B22] border border-red-500/30 rounded-xl p-4 space-y-3">
        <p className="text-xs text-[#8B949E]">Activar nueva alerta de emergencia visible para todos los usuarios</p>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Mensaje de emergencia..."
          className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-red-500/50"
        />
        <button onClick={createAlert} disabled={!msg.trim() || sending}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
          <AlertTriangle size={14} />
          Activar alerta
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            a.is_active ? 'border-red-500/40 bg-red-950/20' : 'border-[#30363D] bg-[#161B22] opacity-60'
          }`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{a.message}</p>
              <p className="text-[#4B5563] text-xs mt-0.5">
                {a.is_active ? '🔴 Activa' : '⚫ Resuelta'} ·{' '}
                {new Date(a.created_at).toLocaleString('es-MX')}
              </p>
            </div>
            {a.is_active && (
              <button onClick={() => deactivate(a.id)}
                className="text-[#4B5563] hover:text-white p-1.5 rounded-lg hover:bg-[#30363D] transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Noticias ──────────────────────────────────────────────────────────────────
const NEWS_CATS = ['aviso', 'cierre', 'operativo', 'clima', 'general']

function NewsTab() {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('aviso')
  const [priority, setPriority] = useState(0)
  const [sending, setSending] = useState(false)
  const qc = useQueryClient()

  const { data: news = [] } = useQuery({
    queryKey: ['admin-news'],
    queryFn: async () => {
      const { data } = await supabase.from('news_items')
        .select('*').order('created_at', { ascending: false }).limit(20)
      return data || []
    },
  })

  async function create() {
    if (!content.trim()) return
    setSending(true)
    const { error } = await supabase.from('news_items').insert({
      content: content.trim(), category, priority: Number(priority),
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    })
    if (error) toast.error(error.message)
    else { toast.success('Noticia publicada'); setContent(''); qc.invalidateQueries({ queryKey: ['admin-news'] }) }
    setSending(false)
  }

  async function deactivate(id) {
    await supabase.from('news_items').update({ is_active: false }).eq('id', id)
    toast.success('Noticia desactivada')
    qc.invalidateQueries({ queryKey: ['admin-news'] })
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-[#8B949E] focus:outline-none focus:border-[#00C2FF]">
            {NEWS_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={priority} onChange={e => setPriority(e.target.value)}
            placeholder="Prioridad"
            className="w-24 bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-[#8B949E] focus:outline-none focus:border-[#00C2FF]" />
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Contenido de la noticia (máx 200 caracteres)..."
          maxLength={200}
          rows={3}
          className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]/50 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#4B5563]">{content.length}/200</span>
          <button onClick={create} disabled={!content.trim() || sending}
            className="flex items-center gap-2 bg-[#00C2FF] hover:bg-[#00AADD] text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            <Plus size={14} />
            Publicar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {news.map(n => (
          <div key={n.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            n.is_active ? 'border-[#30363D] bg-[#161B22]' : 'border-[#30363D]/30 bg-[#161B22] opacity-50'
          }`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs truncate">{n.content}</p>
              <p className="text-[#4B5563] text-[10px] mt-0.5">
                {n.category} · prioridad {n.priority} · {n.is_active ? '✅ Activa' : '⛔ Inactiva'}
              </p>
            </div>
            {n.is_active && (
              <button onClick={() => deactivate(n.id)}
                className="text-[#4B5563] hover:text-white p-1.5 rounded-lg hover:bg-[#30363D] transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Anuncios ──────────────────────────────────────────────────────────────────
function AdsTab() {
  const [form, setForm] = useState({ company_name: '', tagline: '', cta_url: '', cta_text: 'Ver más', phone: '', whatsapp: '', plan: 'basic', position: 'dashboard' })
  const [sending, setSending] = useState(false)
  const qc = useQueryClient()

  const { data: ads = [] } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  async function create() {
    if (!form.company_name.trim()) return
    setSending(true)
    const { error } = await supabase.from('ads').insert(form)
    if (error) toast.error(error.message)
    else {
      toast.success('Anuncio creado')
      setForm({ company_name: '', tagline: '', cta_url: '', cta_text: 'Ver más', phone: '', whatsapp: '', plan: 'basic', position: 'dashboard' })
      qc.invalidateQueries({ queryKey: ['admin-ads'] })
    }
    setSending(false)
  }

  async function toggleAd(id, is_active) {
    await supabase.from('ads').update({ is_active: !is_active }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-ads'] })
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['company_name', 'Nombre empresa *'],
            ['tagline', 'Tagline'],
            ['cta_url', 'URL destino'],
            ['cta_text', 'Texto botón'],
            ['phone', 'Teléfono'],
            ['whatsapp', 'WhatsApp (sin +52)'],
          ].map(([key, label]) => (
            <input key={key}
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={label}
              className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
          ))}
        </div>
        <div className="flex gap-2">
          <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-[#8B949E] focus:outline-none">
            {['basic', 'premium', 'featured'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-[#8B949E] focus:outline-none">
            {['dashboard', 'sidebar', 'ticker', 'all'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button onClick={create} disabled={!form.company_name.trim() || sending}
          className="flex items-center gap-2 bg-[#00C2FF] text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40 hover:bg-[#00AADD]">
          <Plus size={14} />
          Crear anuncio
        </button>
      </div>

      <div className="space-y-2">
        {ads.map(ad => (
          <div key={ad.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-[#30363D] ${ad.is_active ? 'bg-[#161B22]' : 'bg-[#161B22] opacity-50'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{ad.company_name}</p>
              <p className="text-[#4B5563] text-xs">{ad.plan} · {ad.position} · {ad.clicks} clicks · {ad.is_active ? '✅' : '⛔'}</p>
            </div>
            <button onClick={() => toggleAd(ad.id, ad.is_active)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#30363D] text-[#8B949E] hover:text-white transition-colors">
              {ad.is_active ? 'Pausar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Directorio ────────────────────────────────────────────────────────────────
const DIR_CATS = ['taller', 'grua', 'gasolinera', 'restaurante', 'hotel', 'agencia_aduanal', 'refaccionaria', 'lavado', 'otro']

function DirectoryTab() {
  const [form, setForm] = useState({ name: '', category: 'taller', description: '', address: '', phone: '', whatsapp: '', maps_url: '', is_featured: false })
  const [sending, setSending] = useState(false)
  const qc = useQueryClient()

  const { data: listings = [] } = useQuery({
    queryKey: ['admin-directory'],
    queryFn: async () => {
      const { data } = await supabase.from('directory_listings').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  async function create() {
    if (!form.name.trim()) return
    setSending(true)
    const { error } = await supabase.from('directory_listings').insert(form)
    if (error) toast.error(error.message)
    else {
      toast.success('Listado creado')
      setForm({ name: '', category: 'taller', description: '', address: '', phone: '', whatsapp: '', maps_url: '', is_featured: false })
      qc.invalidateQueries({ queryKey: ['admin-directory'] })
    }
    setSending(false)
  }

  async function remove(id) {
    await supabase.from('directory_listings').update({ is_active: false }).eq('id', id)
    toast.success('Listado eliminado')
    qc.invalidateQueries({ queryKey: ['admin-directory'] })
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Nombre del negocio *"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-[#8B949E] focus:outline-none">
            {DIR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] sm:col-span-2" />
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="Teléfono"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
          <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
            placeholder="WhatsApp (sin +52)"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            placeholder="Dirección"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
          <input value={form.maps_url} onChange={e => setForm(p => ({ ...p, maps_url: e.target.value }))}
            placeholder="URL Google Maps"
            className="bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF]" />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#8B949E] cursor-pointer">
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))}
            className="w-4 h-4 accent-[#00C2FF]" />
          Destacado (de pago)
        </label>
        <button onClick={create} disabled={!form.name.trim() || sending}
          className="flex items-center gap-2 bg-[#00C2FF] text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00AADD] transition-colors disabled:opacity-40">
          <Plus size={14} />
          Agregar al directorio
        </button>
      </div>

      <div className="space-y-2">
        {listings.map(l => (
          <div key={l.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-[#30363D] ${l.is_active ? 'bg-[#161B22]' : 'opacity-50 bg-[#161B22]'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{l.name} {l.is_featured ? '⭐' : ''}</p>
              <p className="text-[#4B5563] text-xs">{l.category} · {l.phone || l.whatsapp || 'Sin contacto'}</p>
            </div>
            {l.is_active && (
              <button onClick={() => remove(l.id)}
                className="text-[#4B5563] hover:text-red-400 p-1.5 rounded-lg hover:bg-[#30363D] transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.getAdminUsers })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.setUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Rol actualizado') },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl h-14 animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363D] text-left">
              <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Usuario</th>
              <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Rol</th>
              <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Rep.</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-[#30363D]/50 hover:bg-[#0D1117]/50 ${i === users.length - 1 ? 'border-b-0' : ''}`}>
                <td className="px-4 py-3 text-white">{u.username || u.full_name || 'Sin nombre'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                    className="bg-[#0D1117] border border-[#30363D] rounded-lg px-2 py-1 text-xs text-[#8B949E] focus:outline-none focus:border-[#00C2FF]">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-[#00C2FF] font-mono text-xs">{u.reputation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Zonas ─────────────────────────────────────────────────────────────────────
function SectionsTab() {
  const { data: sections = [] } = useQuery({
    queryKey: ['admin-sections'],
    queryFn: async () => {
      const { data } = await supabase.from('sections').select('*').order('name')
      return data || []
    },
  })

  async function toggleSection(id, is_active) {
    await supabase.from('sections').update({ is_active: !is_active }).eq('id', id)
  }

  return (
    <div className="space-y-2">
      {sections.map(s => (
        <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#30363D] bg-[#161B22]">
          <div>
            <p className="text-white text-sm font-semibold">{s.name}</p>
            <p className="text-[#4B5563] text-xs">{s.slug} · {s.status}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${s.is_active !== false ? 'bg-green-900/40 text-green-400' : 'bg-[#30363D] text-[#4B5563]'}`}>
            {s.is_active !== false ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Admin root ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('alerts')
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: api.getAdminStats })

  const TAB_CONTENT = {
    alerts:    <AlertsTab />,
    news:      <NewsTab />,
    ads:       <AdsTab />,
    directory: <DirectoryTab />,
    users:     <UsersTab />,
    sections:  <SectionsTab />,
  }

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-[#00C2FF]" />
          <div>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-[#8B949E] text-xs mt-0.5">ConectManzanillo · Gestión de la plataforma</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Usuarios',   value: stats.users         },
              { label: 'Reportes',   value: stats.reports       },
              { label: 'Activos',    value: stats.active_reports },
              { label: 'Reacciones', value: stats.reactions     },
            ].map(s => (
              <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00C2FF]">{s.value ?? '—'}</div>
                <div className="text-xs text-[#8B949E] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === id
                  ? 'bg-[#00C2FF] text-black'
                  : 'bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-white'
              }`}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>{TAB_CONTENT[tab]}</div>
      </div>
    </div>
  )
}
