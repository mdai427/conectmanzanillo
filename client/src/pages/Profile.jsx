import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { User, Clock, Star, TrendingUp, Radio, CheckCircle2, Award } from 'lucide-react'
import { useAuthStore } from '../stores/authStore.js'
import { api } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import ReputacionBadge, { NIVELES, getNivel, getNextNivel, getProgreso } from '../components/ui/ReputacionBadge.jsx'

export default function Profile() {
  const { user, profile, fetchProfile } = useAuthStore()
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

  // Stats de reputación extendidas
  const { data: repStats } = useQuery({
    queryKey: ['rep-stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('puntos, nivel, total_reportes, reportes_confirmados, racha_dias, ultimo_reporte_at')
        .eq('id', user.id).single()
      return data
    },
    staleTime: 30_000,
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

  const puntos = repStats?.puntos || 0
  const nivelKey = getNivel(puntos)
  const nivelCfg = NIVELES[nivelKey]
  const nextKey = getNextNivel(puntos)
  const nextCfg = nextKey ? NIVELES[nextKey] : null
  const progreso = getProgreso(puntos)
  const puntosParaSig = nextCfg ? nextCfg.min - puntos : 0

  // Logros
  const logros = [
    { id: 'primer_reporte',  label: 'Primer reporte',       icon: '📡', desc: 'Enviaste tu primer reporte',              done: (repStats?.total_reportes || 0) >= 1    },
    { id: 'diez_reportes',   label: '10 reportes',          icon: '🎯', desc: 'Alcanzaste 10 reportes enviados',          done: (repStats?.total_reportes || 0) >= 10   },
    { id: 'colaborador',     label: 'Nivel Colaborador',    icon: '🤝', desc: 'Llegaste a 100 puntos de reputación',      done: puntos >= 100                           },
    { id: 'confirmado',      label: 'Reporte confirmado',   icon: '✅', desc: 'Tu reporte fue confirmado por la comunidad', done: (repStats?.reportes_confirmados || 0) >= 1 },
    { id: 'cincuenta',       label: '50 reportes',          icon: '🚀', desc: 'Alcanzaste 50 reportes enviados',           done: (repStats?.total_reportes || 0) >= 50  },
    { id: 'experto',         label: 'Nivel Experto',        icon: '⭐', desc: 'Llegaste a 500 puntos de reputación',      done: puntos >= 500                           },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header con nivel de reputación */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar con nivel */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white"
                   style={{ background: `linear-gradient(135deg, ${nivelCfg.color}cc, ${nivelCfg.color})` }}>
                {nivelCfg.emoji}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-black text-slate-800">{profile?.username || 'Mi perfil'}</h1>
                <ReputacionBadge puntos={puntos} size="sm" />
              </div>
              <p className="text-slate-500 text-sm">{profile?.full_name || ''}</p>
              {/* Barra de progreso al siguiente nivel */}
              {nextCfg && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{nivelCfg.label}</span>
                    <span>{puntosParaSig} pts para {nextCfg.label} {nextCfg.emoji}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: `${progreso}%`, background: `linear-gradient(90deg, ${nivelCfg.color}, ${nextCfg.color})` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Stats de reputación */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Star,        color: '#f59e0b', val: puntos,                              label: 'Puntos totales'  },
            { icon: Radio,       color: '#3b82f6', val: repStats?.total_reportes || 0,       label: 'Reportes'        },
            { icon: CheckCircle2,color: '#10b981', val: repStats?.reportes_confirmados || 0, label: 'Confirmados'     },
            { icon: TrendingUp,  color: '#8b5cf6', val: `${progreso}%`,                      label: 'Al siguiente nivel' },
          ].map(({ icon: Icon, color, val, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                   style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xl font-black text-slate-800">{val}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Cómo ganar puntos */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp size={12} /> ¿Cómo ganar puntos?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { pts: '+5',  action: 'Enviar un reporte',          color: '#3b82f6' },
              { pts: '+10', action: 'Tu reporte es confirmado',   color: '#10b981' },
              { pts: '+15', action: 'Reporte con alta precisión', color: '#f59e0b' },
            ].map(({ pts, action, color }) => (
              <div key={action} className="bg-white rounded-xl p-2.5 text-center border border-blue-100">
                <p className="text-base font-black" style={{ color }}>{pts} pts</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Todos los niveles */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Award size={12} /> Niveles de reputación
          </p>
          <div className="space-y-2">
            {Object.entries(NIVELES).map(([key, cfg]) => {
              const isCurrentLevel = key === nivelKey
              const isUnlocked = puntos >= cfg.min
              return (
                <div key={key}
                     className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isCurrentLevel ? 'ring-2' : ''}`}
                     style={{
                       background: isCurrentLevel ? cfg.bg : isUnlocked ? `${cfg.bg}60` : '#f8fafc',
                       ringColor: cfg.color,
                       border: `1px solid ${isCurrentLevel ? cfg.border : '#f1f5f9'}`,
                     }}>
                  <span className="text-xl w-8 text-center">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: isUnlocked ? cfg.color : '#94a3b8' }}>{cfg.label}</p>
                      {isCurrentLevel && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>ACTUAL</span>}
                    </div>
                    <p className="text-[10px] text-slate-400">{cfg.min.toLocaleString()} puntos</p>
                  </div>
                  {isUnlocked && !isCurrentLevel && <CheckCircle2 size={14} className="text-green-400 shrink-0" />}
                  {!isUnlocked && <span className="text-xs text-slate-300 shrink-0">🔒</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Logros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Logros</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {logros.map(({ id, label, icon, desc, done }) => (
              <div key={id} className={`rounded-xl p-3 text-center border transition-all ${done ? '' : 'opacity-40 grayscale'}`}
                   style={{ background: done ? '#f0fdf4' : '#f8fafc', borderColor: done ? '#bbf7d0' : '#e2e8f0' }}>
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-xs font-bold text-slate-700">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                {done && <p className="text-[9px] text-green-600 font-black mt-1">✓ Desbloqueado</p>}
              </div>
            ))}
          </div>
        </div>

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

        {/* Historial de reportes */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mis reportes recientes</p>
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
              <p className="text-xs text-slate-400 mt-1">Reporta lo que ves en el puerto y gana puntos de reputación</p>
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
                    {r.confirmations > 0 && <span className="text-blue-500 font-semibold">+{r.confirmations * 10} pts ganados</span>}
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
