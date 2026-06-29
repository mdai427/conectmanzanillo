import { NavLink } from 'react-router-dom'
import { Home, User, BarChart2, Briefcase, Building2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

export default function BottomNav() {
  const { user } = useAuthStore()

  const cls = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-colors min-h-[52px] justify-center ${
      isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex safe-bottom sm:hidden border-t border-slate-200 bg-white shadow-lg">
      <NavLink to="/" end className={cls}>
        <Home size={18} />
        <span>Puerto</span>
      </NavLink>
      <NavLink to="/analitica" className={cls}>
        <BarChart2 size={18} />
        <span>Analítica</span>
      </NavLink>
      <NavLink to="/directorio-empresarial" className={cls}>
        <Building2 size={18} />
        <span>Directorio</span>
      </NavLink>
      <NavLink to="/posturas" className={cls}>
        <Briefcase size={18} />
        <span>Operadores</span>
      </NavLink>
      <NavLink to="/vacantes" className={cls}>
        <Building2 size={18} />
        <span>Vacantes</span>
      </NavLink>
      <NavLink to={user ? '/perfil' : '/login'} className={cls}>
        <User size={18} />
        <span>{user ? 'Perfil' : 'Entrar'}</span>
      </NavLink>
    </nav>
  )
}
