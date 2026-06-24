import { NavLink } from 'react-router-dom'
import { Home, User, Radio } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

export default function BottomNav() {
  const { user } = useAuthStore()

  const cls = ({ isActive }) =>
    `flex flex-col items-center gap-1 flex-1 py-3 text-xs font-medium transition-colors min-h-[56px] justify-center ${
      isActive ? 'text-[#00C2FF]' : 'text-[#4B5563] hover:text-[#8B949E]'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0D1117]/95 backdrop-blur border-t border-[#30363D]/60 flex safe-bottom sm:hidden">
      <NavLink to="/" end className={cls}>
        <Home size={20} />
        <span>Inicio</span>
      </NavLink>
      <NavLink to={user ? '/perfil' : '/login'} className={cls}>
        <User size={20} />
        <span>{user ? 'Perfil' : 'Entrar'}</span>
      </NavLink>
      <NavLink to="/register" className={cls}>
        <Radio size={20} />
        <span>Reportar</span>
      </NavLink>
    </nav>
  )
}
