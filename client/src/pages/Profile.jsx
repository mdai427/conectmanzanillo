import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { User, Clock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore.js'
import { api } from '../lib/api.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'

export default function Profile() {
  const { profile, fetchProfile } = useAuthStore()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setFullName(profile.full_name || '')
    }
  }, [profile])

  const { data: myReports = [], isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: api.getMyReports,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateMe({ username, full_name: fullName })
      await fetchProfile()
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <User size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Mi perfil</h1>
              <p className="text-slate-500 text-sm">
                Reputación: <span className="text-blue-600 font-bold">{profile?.reputation?.toFixed(2)}</span>
                {' · '}Rol: <span className="text-slate-600">{profile?.role}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Datos personales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-black text-slate-800">Datos personales</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nombre de usuario</label>
            <input value={username} onChange={e => setUsername(e.target.value.slice(0, 30))}
              placeholder="tu_usuario"
              className="w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nombre completo</label>
            <input value={fullName} onChange={e => setFullName(e.target.value.slice(0, 60))}
              placeholder="Tu nombre"
              className="w-full rounded-xl px-4 py-3 text-slate-800 text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {/* Historial */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Mis reportes recientes
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : myReports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">📡</p>
              <p className="text-sm text-slate-500 font-medium">Aún no has enviado reportes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myReports.map(r => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} size="sm" />
                      <span className="text-sm text-slate-600 font-medium">{r.sections?.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs text-slate-500 mt-2 pl-1">{r.comment}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span>👍 {r.confirmations}</span>
                    <span>👎 {r.contradictions}</span>
                    <span className={r.is_active ? 'text-green-600 font-semibold' : 'text-slate-400'}>
                      {r.is_active ? '● Activo' : '○ Expirado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
