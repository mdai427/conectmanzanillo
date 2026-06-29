import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import {
  AlertTriangle, Newspaper, Megaphone, List, Users, Map,
  Plus, Trash2, X, Shield, CreditCard, CheckCircle2, XCircle,
  Clock, ExternalLink, Ban, AlertOctagon, Eye, ChevronDown,
  FileWarning, Search, Truck, Building2, HelpCircle,
  MessageSquare, ThumbsUp, ThumbsDown, Timer, Gavel,
} from 'lucide-react'

const ROLES = ['operator_free', 'operator_premium', 'company', 'moderador', 'admin']
const ROLE_LABELS = {
  operator_free:    { label: 'Operador',    color: '#3b82f6', bg: '#eff6ff' },
  operator_premium: { label: 'Op. Premium', color: '#8b5cf6', bg: '#f5f3ff' },
  company:          { label: 'Empresa',     color: '#10b981', bg: '#f0fdf4' },
  moderador:        { label: 'Moderador',   color: '#f59e0b', bg: '#fffbeb' },
  admin:            { label: 'Admin',       color: '#ef4444', bg: '#fef2f2' },
}
const TIPO_ICONS = { operador: Truck, empresa: Building2, otro: HelpCircle }

const INPUT = 'bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00C2FF] w-full'

// ── Alertas ───────────────────────────────────────────────────────────────────
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
      <div className="bg-white border border-red-500/30 rounded-xl p-4 space-y-3">
        <p className="text-xs text-gray-500">Alerta de emergencia visible para todos los usuarios</p>
        <input value={msg} onChange={e => setMsg(e.target.value)}
          placeholder="Mensaje de emergencia…"
          className={INPUT} />
        <button onClick={createAlert} disabled={!msg.trim() || sending}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
          <AlertTriangle size={14} /> Activar alerta
        </button>
      </div>
      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            a.is_active ? 'border-red-500/40 bg-red-50' : 'border-gray-200 bg-white opacity-60'
          }`}>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm truncate">{a.message}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {a.is_active ? '🔴 Activa' : '⚫ Resuelta'} · {new Date(a.created_at).toLocaleString('es-MX')}
              </p>
            </div>
            {a.is_active && (
              <button onClick={() => deactivate(a.id)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none">
            {NEWS_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={priority} onChange={e => setPriority(e.target.value)}
            placeholder="Prioridad"
            className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none" />
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Contenido de la noticia (máx 200 caracteres)…"
          maxLength={200} rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00C2FF]/50 resize-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{content.length}/200</span>
          <button onClick={create} disabled={!content.trim() || sending}
            className="flex items-center gap-2 bg-[#00C2FF] hover:bg-[#00AADD] text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            <Plus size={14} /> Publicar
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {news.map(n => (
          <div key={n.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            n.is_active ? 'border-gray-200 bg-white' : 'border-gray-200/30 bg-white opacity-50'
          }`}>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-xs truncate">{n.content}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">
                {n.category} · prioridad {n.priority} · {n.is_active ? '✅ Activa' : '⛔ Inactiva'}
              </p>
            </div>
            {n.is_active && (
              <button onClick={() => deactivate(n.id)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['company_name','Nombre empresa *'],['tagline','Tagline'],['cta_url','URL destino'],['cta_text','Texto botón'],['phone','Teléfono'],['whatsapp','WhatsApp (sin +52)']].map(([key, label]) => (
            <input key={key} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={label} className={INPUT} />
          ))}
        </div>
        <div className="flex gap-2">
          <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none">
            {['basic','premium','featured'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none">
            {['dashboard','sidebar','ticker','all'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button onClick={create} disabled={!form.company_name.trim() || sending}
          className="flex items-center gap-2 bg-[#00C2FF] text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00AADD] transition-colors disabled:opacity-40">
          <Plus size={14} /> Crear anuncio
        </button>
      </div>
      <div className="space-y-2">
        {ads.map(ad => (
          <div key={ad.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 ${ad.is_active ? 'bg-white' : 'bg-white opacity-50'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold truncate">{ad.company_name}</p>
              <p className="text-gray-400 text-xs">{ad.plan} · {ad.position} · {ad.clicks} clicks · {ad.is_active ? '✅' : '⛔'}</p>
            </div>
            <button onClick={() => toggleAd(ad.id, ad.is_active)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
              {ad.is_active ? 'Pausar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Directorio ────────────────────────────────────────────────────────────────
const DIR_CATS = ['taller','grua','gasolinera','restaurante','hotel','agencia_aduanal','refaccionaria','lavado','otro']

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
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del negocio *" className={INPUT} />
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 focus:outline-none">
            {DIR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción" className={`${INPUT} sm:col-span-2`} />
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Teléfono" className={INPUT} />
          <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp (sin +52)" className={INPUT} />
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Dirección" className={INPUT} />
          <input value={form.maps_url} onChange={e => setForm(p => ({ ...p, maps_url: e.target.value }))} placeholder="URL Google Maps" className={INPUT} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} className="w-4 h-4 accent-[#00C2FF]" />
          Destacado (de pago)
        </label>
        <button onClick={create} disabled={!form.name.trim() || sending}
          className="flex items-center gap-2 bg-[#00C2FF] text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00AADD] transition-colors disabled:opacity-40">
          <Plus size={14} /> Agregar al directorio
        </button>
      </div>
      <div className="space-y-2">
        {listings.map(l => (
          <div key={l.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 ${l.is_active ? 'bg-white' : 'opacity-50 bg-white'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold truncate">{l.name} {l.is_featured ? '⭐' : ''}</p>
              <p className="text-gray-400 text-xs">{l.category} · {l.phone || l.whatsapp || 'Sin contacto'}</p>
            </div>
            {l.is_active && (
              <button onClick={() => remove(l.id)} className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reportes (moderación) ─────────────────────────────────────────────────────
function WarnModal({ user, onClose, onSent }) {
  const [motivo, setMotivo] = useState('')
  const [tipo, setTipo] = useState('publicacion_falsa')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!motivo.trim()) return toast.error('Escribe el motivo del warning')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ motivo, tipo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.auto_banned) toast.error(`⚠️ Usuario baneado automáticamente (${data.warning_count} warnings)`)
      else toast.success(`Warning enviado (${data.warning_count}/3)`)
      onSent()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <AlertOctagon size={20} className="text-amber-400" />
          <div>
            <p className="text-gray-900 font-bold text-sm">Enviar warning</p>
            <p className="text-gray-500 text-xs">{user.username || user.full_name}</p>
          </div>
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 w-full focus:outline-none">
          <option value="publicacion_falsa">Publicación falsa</option>
          <option value="spam">Spam</option>
          <option value="ofensivo">Contenido ofensivo</option>
          <option value="otro">Otro</option>
        </select>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Motivo detallado del warning…"
          rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500/50 resize-none" />
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-500/30">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700">Con 3 warnings el usuario es baneado automáticamente.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:text-gray-900 transition-colors">
            Cancelar
          </button>
          <button onClick={send} disabled={loading || !motivo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors disabled:opacity-40">
            {loading ? 'Enviando…' : 'Enviar warning'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportsTab() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('active')
  const [warnTarget, setWarnTarget] = useState(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports', filtro],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/admin/reports?status=${filtro}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const deleteReport = useMutation({
    mutationFn: (id) => api.deleteReport(id),
    onSuccess: () => { toast.success('Reporte eliminado'); qc.invalidateQueries({ queryKey: ['admin-reports'] }) },
    onError: (e) => toast.error(e.message),
  })

  const banUser = useMutation({
    mutationFn: async ({ userId, motivo }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ motivo }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
    },
    onSuccess: () => { toast.success('Usuario baneado'); qc.invalidateQueries({ queryKey: ['admin-reports'] }) },
    onError: (e) => toast.error(e.message),
  })

  const STATUS_COLOR = { free: '#22c55e', moderate: '#f59e0b', congested: '#ef4444', closed: '#6b7280' }
  const STATUS_LABEL = { free: 'Libre', moderate: 'Moderado', congested: 'Saturado', closed: 'Cerrado' }

  return (
    <>
      {warnTarget && (
        <WarnModal
          user={warnTarget}
          onClose={() => setWarnTarget(null)}
          onSent={() => qc.invalidateQueries({ queryKey: ['admin-reports', 'admin-users'] })}
        />
      )}

      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-2">
          {[['active','Activos'],['inactive','Eliminados'],['all','Todos']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtro === v ? 'bg-[#00C2FF] text-black' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'
              }`}>
              {l}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-20 animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No hay reportes {filtro === 'active' ? 'activos' : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(r => {
              const user = r.profiles
              const isBanned = user?.is_banned
              return (
                <div key={r.id} className={`bg-white border rounded-xl p-4 space-y-3 ${
                  isBanned ? 'border-red-200' : 'border-gray-200'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Estado del reporte */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{ background: `${STATUS_COLOR[r.status]}22`, color: STATUS_COLOR[r.status] }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                      {/* Zona */}
                      <span className="text-gray-500 text-xs">{r.sections?.name || '—'}</span>
                      {/* Fecha */}
                      <span className="text-gray-400 text-[10px]">
                        {new Date(r.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    {/* Confirmaciones */}
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-500">✅ {r.confirmations || 0} · ❌ {r.contradictions || 0}</p>
                    </div>
                  </div>

                  {/* Comentario */}
                  {r.comment && (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 italic">
                      "{r.comment}"
                    </p>
                  )}

                  {/* Usuario */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-700 font-bold">
                        {(user?.username || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-500">{user?.username || user?.full_name || 'Anónimo'}</span>
                      {user?.warning_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-900/30 text-amber-400">
                          {user.warning_count} warn
                        </span>
                      )}
                      {isBanned && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-900/30 text-red-400">
                          BANEADO
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1">
                      {/* Warn */}
                      {user && !isBanned && (
                        <button
                          onClick={() => setWarnTarget(user)}
                          title="Enviar warning"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all">
                          <AlertOctagon size={11} /> Warn
                        </button>
                      )}
                      {/* Ban directo */}
                      {user && !isBanned && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Banear a ${user.username}? Sus reportes activos serán eliminados.`)) {
                              banUser.mutate({ userId: user.id, motivo: 'Ban manual desde moderación de reportes' })
                            }
                          }}
                          title="Banear usuario"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
                          <Ban size={11} /> Ban
                        </button>
                      )}
                      {/* Eliminar reporte */}
                      {r.is_active && (
                        <button
                          onClick={() => deleteReport.mutate(r.id)}
                          title="Eliminar reporte"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-200 hover:border-red-200 transition-all">
                          <Trash2 size={11} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [warnTarget, setWarnTarget] = useState(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const url = `/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
    staleTime: 30_000,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.setUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Rol actualizado') },
    onError: (e) => toast.error(e.message),
  })

  const banMutation = useMutation({
    mutationFn: async ({ id, unban }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const url = `/api/admin/users/${id}/${unban ? 'unban' : 'ban'}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ motivo: 'Ban manual desde panel de usuarios' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.unban ? 'Usuario desbaneado' : 'Usuario baneado')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const TIPO_COLOR = { operador: '#3b82f6', empresa: '#8b5cf6', otro: '#10b981' }

  return (
    <>
      {warnTarget && (
        <WarnModal
          user={warnTarget}
          onClose={() => setWarnTarget(null)}
          onSent={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}

      <div className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario o nombre…"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00C2FF]"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const roleConfig = ROLE_LABELS[u.role] || ROLE_LABELS.operator_free
              const TipoIcon = TIPO_ICONS[u.tipo_usuario] || HelpCircle
              return (
                <div key={u.id} className={`bg-white border rounded-xl p-4 ${u.is_banned ? 'border-red-200 opacity-75' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(u.username || u.full_name || '?')[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-900 text-sm font-bold">{u.username || u.full_name || 'Sin nombre'}</span>
                        {/* Tipo */}
                        {u.tipo_usuario && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: `${TIPO_COLOR[u.tipo_usuario]}22`, color: TIPO_COLOR[u.tipo_usuario] }}>
                            <TipoIcon size={9} /> {u.tipo_usuario}
                          </span>
                        )}
                        {/* Rol */}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: roleConfig.bg, color: roleConfig.color }}>
                          {roleConfig.label}
                        </span>
                        {/* Badges */}
                        {u.warning_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-900/30 text-amber-400">
                            ⚠️ {u.warning_count} warn
                          </span>
                        )}
                        {u.is_banned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-900/30 text-red-400">
                            🚫 BANEADO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {u.total_reportes || 0} reportes · {u.puntos || 0} pts · rep {u.reputation}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Cambiar rol */}
                      <select
                        value={u.role}
                        onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-500 focus:outline-none focus:border-[#00C2FF]">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {/* Warning */}
                      {!u.is_banned && (
                        <button onClick={() => setWarnTarget(u)}
                          title="Enviar warning"
                          className="p-1.5 rounded-lg text-amber-400 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all">
                          <AlertOctagon size={13} />
                        </button>
                      )}
                      {/* Ban / Unban */}
                      <button
                        onClick={() => {
                          if (u.is_banned) {
                            banMutation.mutate({ id: u.id, unban: true })
                          } else {
                            if (confirm(`¿Banear a ${u.username || u.full_name}?`)) {
                              banMutation.mutate({ id: u.id, unban: false })
                            }
                          }
                        }}
                        title={u.is_banned ? 'Desbanear' : 'Banear'}
                        className={`p-1.5 rounded-lg border transition-all ${
                          u.is_banned
                            ? 'text-green-400 bg-green-50 hover:bg-green-100 border-green-200'
                            : 'text-red-400 bg-red-50 hover:bg-red-100 border-red-200'
                        }`}>
                        {u.is_banned ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
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
        <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white">
          <div>
            <p className="text-gray-900 text-sm font-semibold">{s.name}</p>
            <p className="text-gray-400 text-xs">{s.slug}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${s.is_active !== false ? 'bg-green-100 text-green-400' : 'bg-[#30363D] text-gray-400'}`}>
            {s.is_active !== false ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Suscripciones ─────────────────────────────────────────────────────────────
function SuscripcionesTab() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('pendiente')

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['admin-suscripciones', filtro],
    queryFn: async () => {
      const q = supabase.from('subscriptions')
        .select('*, profiles:user_id(username, email)')
        .order('created_at', { ascending: false })
      if (filtro !== 'todos') q.eq('estatus', filtro)
      const { data, error } = await q.limit(50)
      if (error) throw error
      return data || []
    },
    refetchInterval: 30_000,
  })

  const activar = useMutation({
    mutationFn: async ({ id }) => {
      const now = new Date()
      const expires = new Date(now)
      expires.setDate(expires.getDate() + 30)
      const { error } = await supabase.from('subscriptions').update({
        estatus: 'activa', starts_at: now.toISOString(),
        expires_at: expires.toISOString(), activado_at: now.toISOString(),
      }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { toast.success('Suscripción activada ✅'); qc.invalidateQueries({ queryKey: ['admin-suscripciones'] }) },
    onError: (e) => toast.error(e.message),
  })

  const rechazar = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('subscriptions').update({ estatus: 'cancelada' }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { toast.success('Suscripción rechazada'); qc.invalidateQueries({ queryKey: ['admin-suscripciones'] }) },
    onError: (e) => toast.error(e.message),
  })

  const ESTATUS_CFG = {
    pendiente: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Pendiente', icon: Clock },
    activa:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Activa',    icon: CheckCircle2 },
    vencida:   { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Vencida',   icon: XCircle },
    cancelada: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Rechazada', icon: XCircle },
  }

  const pendientesCount = subs.filter(s => s.estatus === 'pendiente').length

  return (
    <div className="space-y-4">
      {filtro === 'pendiente' && pendientesCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-500/40">
          <Clock size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 font-bold">{pendientesCount} pago{pendientesCount !== 1 ? 's' : ''} esperando verificación</p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {['pendiente','activa','vencida','cancelada','todos'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro === f ? 'bg-[#00C2FF] text-black' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pendiente' && pendientesCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black rounded-full px-1.5 py-0.5 text-[9px] font-black">{pendientesCount}</span>
            )}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-28 animate-pulse" />)}</div>
      ) : subs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No hay suscripciones {filtro !== 'todos' ? `"${filtro}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => {
            const cfg = ESTATUS_CFG[sub.estatus] || ESTATUS_CFG.pendiente
            const EstatusIcon = cfg.icon
            return (
              <div key={sub.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900 font-bold text-sm">{sub.profiles?.username || sub.profiles?.email || 'Usuario desconocido'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <EstatusIcon size={9} /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">{sub.profiles?.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-green-400 font-black text-base">${Number(sub.monto).toLocaleString()} {sub.moneda}</p>
                    <p className="text-gray-500 text-[10px]">{sub.metodo_pago || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500 mb-0.5">Referencia de pago</p>
                    <p className="text-gray-900 font-mono truncate">{sub.referencia_pago || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-gray-500 mb-0.5">Solicitado</p>
                    <p className="text-gray-900">{new Date(sub.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</p>
                  </div>
                </div>
                {sub.comprobante_url && (
                  <a href={sub.comprobante_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1.5 text-[#00C2FF] text-xs font-semibold hover:underline">
                    <ExternalLink size={11} /> Ver comprobante
                  </a>
                )}
                {sub.estatus === 'activa' && sub.expires_at && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <Clock size={10} /> Vence: {new Date(sub.expires_at).toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })}
                  </div>
                )}
                {sub.estatus === 'pendiente' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => activar.mutate({ id: sub.id })} disabled={activar.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black text-black bg-green-400 hover:bg-green-300 transition-all disabled:opacity-40">
                      <CheckCircle2 size={13} /> Activar
                    </button>
                    <button onClick={() => rechazar.mutate({ id: sub.id })} disabled={rechazar.isPending}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-50 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-40">
                      <XCircle size={13} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Comunicados (moderación) ──────────────────────────────────────────────────
function ComunicadosTab() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('pendiente')
  const [noteTarget, setNoteTarget] = useState(null)
  const [note, setNote] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-comunicados', filtro],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/comunicados/admin/all?status=${filtro}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const review = useMutation({
    mutationFn: async ({ id, status, review_note }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/comunicados/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, review_note }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      return res.json()
    },
    onSuccess: (_, v) => {
      toast.success(v.status === 'aprobado' ? '✅ Comunicado aprobado' : '❌ Comunicado rechazado')
      setNoteTarget(null); setNote('')
      qc.invalidateQueries({ queryKey: ['admin-comunicados'] })
    },
    onError: e => toast.error(e.message),
  })

  const pendienteCount = filtro === 'pendiente' ? items.length : 0

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[['pendiente','Pendientes'],['aprobado','Aprobados'],['rechazado','Rechazados'],['todos','Todos']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtro === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'
            }`}>
            {l}
            {v === 'pendiente' && pendienteCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black">{pendienteCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-32 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay comunicados {filtro !== 'todos' ? `"${filtro}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(c => {
            const statusCfg = {
              pendiente: { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pendiente' },
              aprobado:  { color: '#16a34a', bg: 'bg-green-50',  border: 'border-green-200',  label: 'Aprobado'  },
              rechazado: { color: '#dc2626', bg: 'bg-red-50',    border: 'border-red-200',    label: 'Rechazado' },
            }[c.status] || {}
            return (
              <div key={c.id} className={`bg-white border rounded-xl p-4 space-y-3 ${statusCfg.border || 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{c.titulo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} border ${statusCfg.border}`}
                            style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed line-clamp-3">{c.contenido}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <span>{c.profiles?.full_name || c.profiles?.username || 'Anónimo'} · {new Date(c.created_at).toLocaleDateString('es-MX')}</span>
                  {c.status === 'pendiente' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setNoteTarget({ ...c, action: 'rechazado' }) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                        <XCircle size={12} /> Rechazar
                      </button>
                      <button
                        onClick={() => review.mutate({ id: c.id, status: 'aprobado' })}
                        disabled={review.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all disabled:opacity-40">
                        <CheckCircle2 size={12} /> Aprobar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de rechazo con nota */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNoteTarget(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-gray-900">Rechazar comunicado</p>
            <p className="text-gray-600 text-sm">"{noteTarget.titulo}"</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Motivo del rechazo (opcional)…"
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setNoteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">Cancelar</button>
              <button
                onClick={() => review.mutate({ id: noteTarget.id, status: 'rechazado', review_note: note })}
                disabled={review.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-40">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Historial de Votos ────────────────────────────────────────────────────────
function VotesTab() {
  const qc = useQueryClient()
  const [sancionTarget, setSancionTarget] = useState(null)
  const [sancionType, setSancionType] = useState('warn')
  const [motivo, setMotivo] = useState('')
  const [dias, setDias] = useState(7)

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['admin-votes'],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/admin/vote-history', { headers: { Authorization: `Bearer ${token}` } })
      return res.json()
    },
    refetchInterval: 60_000,
  })

  async function sancionar() {
    if (!motivo.trim()) return toast.error('Escribe el motivo')
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const userId = sancionTarget.profiles?.id
    let url, body

    if (sancionType === 'warn') {
      url = `/api/admin/users/${userId}/warn`
      body = { motivo, tipo: 'publicacion_falsa' }
      // Anular el voto específico
      await fetch(`/api/admin/reports/${sancionTarget.reports?.id}/annul`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ motivo }),
      })
    } else if (sancionType === 'annul-all') {
      url = `/api/admin/users/${userId}/annul-votes`
      body = { motivo }
    } else if (sancionType === 'temp-ban') {
      url = `/api/admin/users/${userId}/temp-ban`
      body = { motivo, dias }
    } else {
      url = `/api/admin/users/${userId}/ban`
      body = { motivo }
    }

    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)

    toast.success('Sanción aplicada')
    setSancionTarget(null); setMotivo('')
    qc.invalidateQueries({ queryKey: ['admin-votes', 'admin-users'] })
  }

  const REACTION_LABEL = { confirm: '✅ Confirma', contradict: '❌ Contradice' }

  return (
    <>
      {/* Modal de sanción */}
      {sancionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSancionTarget(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Gavel size={18} className="text-red-500" />
              <p className="font-bold text-gray-900">Sancionar usuario</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
              <p><span className="font-semibold">Usuario:</span> {sancionTarget.profiles?.username || sancionTarget.profiles?.full_name}</p>
              <p><span className="font-semibold">Voto:</span> {REACTION_LABEL[sancionTarget.reaction]}</p>
              <p><span className="font-semibold">Reporte:</span> {sancionTarget.reports?.sections?.name}</p>
            </div>

            {/* Tipo de sanción */}
            <div className="space-y-2">
              {[
                { v: 'warn',      l: '⚠️ Advertencia',         sub: 'Warning + anula este voto' },
                { v: 'annul-all', l: '🚫 Anular todos los votos', sub: 'Borra historial de votos' },
                { v: 'temp-ban',  l: '⏳ Ban temporal',         sub: 'Suspender por N días' },
                { v: 'ban',       l: '🔴 Ban indefinido',        sub: 'Baneado permanentemente' },
              ].map(({ v, l, sub }) => (
                <button key={v} onClick={() => setSancionType(v)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    sancionType === v ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-semibold text-gray-900">{l}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </button>
              ))}
            </div>

            {sancionType === 'temp-ban' && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 shrink-0">Días:</label>
                <input type="number" min={1} max={365} value={dias} onChange={e => setDias(Number(e.target.value))}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-400" />
              </div>
            )}

            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo de la sanción…" rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 resize-none" />

            <div className="flex gap-2">
              <button onClick={() => setSancionTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">Cancelar</button>
              <button onClick={sancionar} disabled={!motivo.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-40">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-16 animate-pulse" />)}</div>
        ) : votes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <ThumbsUp size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No hay historial de votos</p>
          </div>
        ) : (
          votes.map(v => (
            <div key={v.id} className={`bg-white border rounded-xl p-3 flex items-center gap-3 ${v.is_annulled ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
              {/* Reacción */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                v.reaction === 'confirm' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {v.reaction === 'confirm'
                  ? <ThumbsUp size={14} className="text-green-600" />
                  : <ThumbsDown size={14} className="text-red-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {v.profiles?.username || v.profiles?.full_name || 'Anónimo'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {v.reaction === 'confirm' ? 'confirmó' : 'contradijo'} en
                  </span>
                  <span className="text-xs text-gray-700 font-medium truncate max-w-[140px]">
                    {v.reports?.sections?.name || '—'}
                  </span>
                  {v.is_annulled && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-red-100 text-red-600">ANULADO</span>
                  )}
                  {v.profiles?.warning_count > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-100 text-amber-600">⚠️ {v.profiles.warning_count} warn</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Acción */}
              {!v.is_annulled && v.profiles && (
                <button
                  onClick={() => { setSancionTarget(v); setSancionType('warn'); setMotivo('') }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all shrink-0">
                  <Gavel size={11} /> Sancionar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}

// ── Empresas ─────────────────────────────────────────────────────────────────
function EmpresasTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre_comercial: '', categoria_slug: '', descripcion: '', whatsapp: '', telefono: '', email: '', sitio_web: '', direccion: '', es_premium: false, es_destacado: false, es_verificado: false })
  const [editId, setEditId] = useState(null)
  const [filtro, setFiltro] = useState('')

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['admin-empresas', filtro],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams({ limit: 50 })
      if (filtro) params.set('tier', filtro)
      const res = await fetch(`/api/directorio?${params}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const json = await res.json()
      return json.data || []
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const url = editId ? `/api/directorio/${editId}` : '/api/directorio'
      const method = editId ? 'PATCH' : 'POST'
      const slug = form.nombre_comercial.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...form, slug: editId ? undefined : slug }) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      return res.json()
    },
    onSuccess: () => {
      toast.success(editId ? 'Empresa actualizada' : 'Empresa creada')
      setShowForm(false); setEditId(null)
      setForm({ nombre_comercial: '', categoria_slug: '', descripcion: '', whatsapp: '', telefono: '', email: '', sitio_web: '', direccion: '', es_premium: false, es_destacado: false, es_verificado: false })
      qc.invalidateQueries({ queryKey: ['admin-empresas'] })
    },
    onError: e => toast.error(e.message),
  })

  const toggleTier = useMutation({
    mutationFn: async ({ id, campo, val }) => {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/directorio/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ [campo]: val }) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-empresas'] }),
  })

  const desactivar = useMutation({
    mutationFn: async (id) => {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/directorio/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` } })
    },
    onSuccess: () => { toast.success('Empresa desactivada'); qc.invalidateQueries({ queryKey: ['admin-empresas'] }) },
  })

  const CATEGORIAS = ['transportistas','agencias-aduanales','terminales','patios','forwarders','navieras','almacenadoras','llanteras','gruas','montacargas','gasolineras','refacciones','talleres','hoteles','restaurantes','seguridad','gps','seguros','consultoria','tecnologia','capacitacion','servicios-portuarios']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {[['','Todas'],['premium','Premium'],['destacado','Destacadas'],['verificado','Verificadas']].map(([v,l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filtro===v?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={13}/> Nueva empresa
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">{editId ? 'Editar empresa' : 'Nueva empresa'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.nombre_comercial} onChange={e=>setForm(f=>({...f,nombre_comercial:e.target.value}))} placeholder="Nombre comercial *" className={INPUT}/>
            <select value={form.categoria_slug} onChange={e=>setForm(f=>({...f,categoria_slug:e.target.value}))} className={INPUT}>
              <option value="">Categoría</option>
              {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="WhatsApp" className={INPUT}/>
            <input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="Teléfono" className={INPUT}/>
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" className={INPUT}/>
            <input value={form.sitio_web} onChange={e=>setForm(f=>({...f,sitio_web:e.target.value}))} placeholder="Sitio web" className={INPUT}/>
            <input value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} placeholder="Dirección" className={`${INPUT} sm:col-span-2`}/>
            <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción" rows={2} className={`${INPUT} sm:col-span-2 resize-none`}/>
          </div>
          <div className="flex gap-4">
            {[['es_premium','Premium'],['es_destacado','Destacada'],['es_verificado','Verificada']].map(([k,l])=>(
              <label key={k} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.checked}))} className="rounded"/>
                {l}
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>{setShowForm(false);setEditId(null)}} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
            <button onClick={()=>submit.mutate()} disabled={!form.nombre_comercial||submit.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">
              {submit.isPending?'Guardando…':'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="h-32 bg-gray-100 rounded-xl animate-pulse"/> : (
        <div className="space-y-2">
          {empresas.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No hay empresas registradas</p>}
          {empresas.map(e => (
            <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {e.logo_url ? <img src={e.logo_url} alt="" className="w-full h-full object-cover"/> : <Building2 size={16} className="text-gray-400"/>}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 text-sm font-semibold truncate">{e.nombre_comercial}</p>
                  <p className="text-gray-400 text-xs">{e.categoria_slug || 'Sin categoría'}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {e.es_premium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Premium</span>}
                  {e.es_destacado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Dest.</span>}
                  {e.es_verificado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap">
                <button onClick={()=>toggleTier.mutate({id:e.id,campo:'es_premium',val:!e.es_premium})}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${e.es_premium?'bg-amber-100 text-amber-700 border-amber-200':'border-gray-200 text-gray-500 hover:bg-amber-50'}`}>
                  Premium
                </button>
                <button onClick={()=>toggleTier.mutate({id:e.id,campo:'es_destacado',val:!e.es_destacado})}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${e.es_destacado?'bg-blue-100 text-blue-700 border-blue-200':'border-gray-200 text-gray-500 hover:bg-blue-50'}`}>
                  Destacar
                </button>
                <button onClick={()=>toggleTier.mutate({id:e.id,campo:'es_verificado',val:!e.es_verificado})}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${e.es_verificado?'bg-green-100 text-green-700 border-green-200':'border-gray-200 text-gray-500 hover:bg-green-50'}`}>
                  Verificar
                </button>
                <button onClick={()=>{setEditId(e.id);setForm({nombre_comercial:e.nombre_comercial,categoria_slug:e.categoria_slug||'',descripcion:e.descripcion||'',whatsapp:e.whatsapp||'',telefono:e.telefono||'',email:e.email||'',sitio_web:e.sitio_web||'',direccion:e.direccion||'',es_premium:e.es_premium,es_destacado:e.es_destacado,es_verificado:e.es_verificado});setShowForm(true)}}
                  className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Editar
                </button>
                <button onClick={()=>{ if(confirm('¿Desactivar esta empresa?')) desactivar.mutate(e.id) }}
                  className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Publicidad ────────────────────────────────────────────────────────────────
function PublicidadTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', imagen_url: '', link_url: '', whatsapp: '', zona: 'global', prioridad: 0, fecha_inicio: '', fecha_fin: '', is_active: true })
  const [editId, setEditId] = useState(null)

  const { data: campanas = [], isLoading } = useQuery({
    queryKey: ['admin-publicidad'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/publicidad/admin/all', { headers: { Authorization: `Bearer ${session?.access_token}` } })
      return res.ok ? res.json() : []
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const url = editId ? `/api/publicidad/admin/${editId}` : '/api/publicidad/admin'
      const method = editId ? 'PATCH' : 'POST'
      const body = { ...form, prioridad: parseInt(form.prioridad) || 0 }
      if (!body.fecha_inicio) delete body.fecha_inicio
      if (!body.fecha_fin)    delete body.fecha_fin
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
    },
    onSuccess: () => {
      toast.success(editId ? 'Campaña actualizada' : 'Campaña creada')
      setShowForm(false); setEditId(null)
      setForm({ titulo:'',imagen_url:'',link_url:'',whatsapp:'',zona:'global',prioridad:0,fecha_inicio:'',fecha_fin:'',is_active:true })
      qc.invalidateQueries({ queryKey: ['admin-publicidad'] })
    },
    onError: e => toast.error(e.message),
  })

  const eliminar = useMutation({
    mutationFn: async (id) => {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/publicidad/admin/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` } })
    },
    onSuccess: () => { toast.success('Campaña eliminada'); qc.invalidateQueries({ queryKey: ['admin-publicidad'] }) },
  })

  const toggleActiva = useMutation({
    mutationFn: async ({ id, val }) => {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/publicidad/admin/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ is_active: val }) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-publicidad'] }),
  })

  const ZONAS = ['global','principal','directorio','noticias','vacantes','empresa']

  const ctr = (c) => c.impresiones > 0 ? ((c.clics / c.impresiones) * 100).toFixed(1) + '%' : '—'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={13}/> Nueva campaña
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">{editId ? 'Editar campaña' : 'Nueva campaña'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Título *" className={INPUT}/>
            <select value={form.zona} onChange={e=>setForm(f=>({...f,zona:e.target.value}))} className={INPUT}>
              {ZONAS.map(z=><option key={z} value={z}>{z}</option>)}
            </select>
            <input value={form.imagen_url} onChange={e=>setForm(f=>({...f,imagen_url:e.target.value}))} placeholder="URL imagen" className={INPUT}/>
            <input value={form.link_url} onChange={e=>setForm(f=>({...f,link_url:e.target.value}))} placeholder="URL destino" className={INPUT}/>
            <input value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="WhatsApp (alternativo)" className={INPUT}/>
            <input type="number" value={form.prioridad} onChange={e=>setForm(f=>({...f,prioridad:e.target.value}))} placeholder="Prioridad (0-10)" className={INPUT}/>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e=>setForm(f=>({...f,fecha_inicio:e.target.value}))} className={INPUT}/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e=>setForm(f=>({...f,fecha_fin:e.target.value}))} className={INPUT}/>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="rounded"/>
            Campaña activa
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>{setShowForm(false);setEditId(null)}} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
            <button onClick={()=>submit.mutate()} disabled={!form.titulo||submit.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40">
              {submit.isPending?'Guardando…':'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="h-32 bg-gray-100 rounded-xl animate-pulse"/> : (
        <div className="space-y-2">
          {campanas.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No hay campañas creadas</p>}
          {campanas.map(c => (
            <div key={c.id} className={`bg-white border rounded-xl p-4 space-y-2 ${c.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {c.imagen_url && <img src={c.imagen_url} alt="" className="w-12 h-8 object-cover rounded-lg shrink-0"/>}
                  <div className="min-w-0">
                    <p className="text-gray-900 text-sm font-semibold truncate">{c.titulo}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{c.zona}</span>
                      {c.fecha_inicio && <span className="text-[10px] text-gray-400">{c.fecha_inicio} → {c.fecha_fin || '∞'}</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Imp. <span className="font-bold text-gray-700">{(c.impresiones||0).toLocaleString()}</span></p>
                    <p className="text-xs text-gray-400">Clics <span className="font-bold text-gray-700">{(c.clics||0).toLocaleString()}</span> · CTR {ctr(c)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>toggleActiva.mutate({id:c.id,val:!c.is_active})}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${c.is_active?'border-red-200 text-red-500 hover:bg-red-50':'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {c.is_active?'Pausar':'Activar'}
                    </button>
                    <button onClick={()=>{setEditId(c.id);setForm({titulo:c.titulo,imagen_url:c.imagen_url||'',link_url:c.link_url||'',whatsapp:c.whatsapp||'',zona:c.zona,prioridad:c.prioridad||0,fecha_inicio:c.fecha_inicio||'',fecha_fin:c.fecha_fin||'',is_active:c.is_active});setShowForm(true)}}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                      Editar
                    </button>
                    <button onClick={()=>{ if(confirm('¿Eliminar campaña?')) eliminar.mutate(c.id) }}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin root ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'reports',       label: 'Reportes',      icon: FileWarning  },
  { id: 'users',         label: 'Usuarios',       icon: Users        },
  { id: 'alerts',        label: 'Alertas',        icon: AlertTriangle},
  { id: 'news',          label: 'Noticias',       icon: Newspaper    },
  { id: 'ads',           label: 'Anuncios',       icon: Megaphone    },
  { id: 'directory',     label: 'Directorio',     icon: List         },
  { id: 'sections',      label: 'Zonas',          icon: Map          },
  { id: 'suscripciones', label: 'Suscripciones',  icon: CreditCard   },
  { id: 'comunicados',   label: 'Comunicados',    icon: MessageSquare },
  { id: 'votes',         label: 'Votos',          icon: ThumbsUp     },
  { id: 'empresas',      label: 'Empresas',       icon: Building2    },
  { id: 'publicidad',    label: 'Publicidad',     icon: Megaphone    },
]

export default function Admin() {
  const [tab, setTab] = useState('reports')
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: api.getAdminStats, refetchInterval: 60_000 })

  const TAB_CONTENT = {
    reports:       <ReportsTab />,
    users:         <UsersTab />,
    alerts:        <AlertsTab />,
    news:          <NewsTab />,
    ads:           <AdsTab />,
    directory:     <DirectoryTab />,
    sections:      <SectionsTab />,
    suscripciones: <SuscripcionesTab />,
    comunicados:   <ComunicadosTab />,
    votes:         <VotesTab />,
    empresas:      <EmpresasTab />,
    publicidad:    <PublicidadTab />,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-[#00C2FF]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-500 text-xs mt-0.5">ConectManzanillo · Control total de la plataforma</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Usuarios',   value: stats.users,          color: '#00C2FF' },
              { label: 'Reportes',   value: stats.reports,        color: '#8b5cf6' },
              { label: 'Activos',    value: stats.active_reports, color: '#22c55e' },
              { label: 'Reacciones', value: stats.reactions,      color: '#f59e0b' },
              { label: 'Warnings',   value: stats.warnings,       color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value ?? '—'}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === id ? 'bg-[#00C2FF] text-black' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'
              }`}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>{TAB_CONTENT[tab]}</div>
      </div>
    </div>
  )
}
