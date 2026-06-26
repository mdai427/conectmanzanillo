import { NavLink } from 'react-router-dom'
import { Home, User, Newspaper, Briefcase } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

export default function BottomNav() {
  const { user } = useAuthStore()

  const cls = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 flex-1 py-2.5 text-xs font-semibold transition-colors min-h-[56px] justify-center ${
      isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex safe-bottom sm:hidden border-t border-slate-200 bg-white shadow-lg">
      <NavLink to="/" end className={cls}>
        <Home size={20} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
        <span>Puerto</span>
      </NavLink>
      <NavLink to="/noticias" className={cls}>
        <Newspaper size={20} />
        <span>Noticias</span>
      </NavLink>
      <NavLink to="/posturas" className={cls}>
        <Briefcase size={20} />
        <span>Posturas</span>
      </NavLink>
      <NavLink to={user ? '/perfil' : '/login'} className={cls}>
        <User size={20} />
        <span>{user ? 'Perfil' : 'Entrar'}</span>
      </NavLink>
    </nav>
  )
}
