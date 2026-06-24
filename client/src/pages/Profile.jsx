import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
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
    <div className="min-h-screen bg-[#0D1117]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
          <p className="text-[#8B949E] text-sm mt-1">
            Reputación: <span className="text-[#00C2FF] font-semibold">{profile?.reputation?.toFixed(2)}</span>
            {' · '}
            Rol: <span className="text-[#8B949E]">{profile?.role}</span>
          </p>
        </div>

        {/* Editar datos */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Datos personales</h2>
          <div>
            <label className="block text-sm text-[#8B949E] mb-2">Nombre de usuario</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.slice(0, 30))}
              placeholder="tu_usuario"
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8B949E] mb-2">Nombre completo</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value.slice(0, 60))}
              placeholder="Tu nombre"
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#00C2FF] transition-colors"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#00C2FF] text-[#0D1117] font-bold text-sm rounded-xl disabled:opacity-40 hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {/* Historial */}
        <div>
          <p className="text-xs font-mono text-[#4B5563] uppercase tracking-widest mb-4">
            mis reportes recientes
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          ) : myReports.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-center">
              <p className="text-sm text-[#8B949E]">Aún no has enviado reportes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myReports.map(r => (
                <div key={r.id} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} size="sm" />
                      <span className="text-sm text-[#8B949E]">{r.sections?.name}</span>
                    </div>
                    <span className="text-xs text-[#4B5563]">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs text-[#4B5563] mt-2">{r.comment}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-[#4B5563]">
                    <span>👍 {r.confirmations}</span>
                    <span>👎 {r.contradictions}</span>
                    <span className={r.is_active ? 'text-green-500' : 'text-[#4B5563]'}>
                      {r.is_active ? 'Activo' : 'Expirado'}
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
