import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../lib/api.js'

const ROLES = ['operator_free', 'operator_premium', 'company', 'admin']

export default function Admin() {
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: api.getAdminStats })
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.getAdminUsers })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.setUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Rol actualizado')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-[#8B949E] text-sm mt-1">ConectManzanillo · Gestión de la plataforma</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Usuarios', value: stats.users },
              { label: 'Reportes', value: stats.reports },
              { label: 'Activos', value: stats.active_reports },
              { label: 'Reacciones', value: stats.reactions },
            ].map(s => (
              <div key={s.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#00C2FF]">{s.value ?? '—'}</div>
                <div className="text-xs text-[#8B949E] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Usuarios */}
        <div>
          <p className="text-xs font-mono text-[#4B5563] uppercase tracking-widest mb-4">
            usuarios registrados
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl h-14 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363D] text-left">
                      <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Usuario</th>
                      <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Email</th>
                      <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Rol</th>
                      <th className="px-4 py-3 text-xs text-[#4B5563] font-medium">Rep.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-[#30363D]/50 hover:bg-[#0D1117]/50 ${i === users.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-3 text-white">{u.username || u.full_name || 'Sin nombre'}</td>
                        <td className="px-4 py-3 text-[#8B949E]">{u.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                            className="bg-[#0D1117] border border-[#30363D] rounded-lg px-2 py-1 text-xs text-[#8B949E] focus:outline-none focus:border-[#00C2FF]"
                          >
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
          )}
        </div>
      </div>
    </div>
  )
}
