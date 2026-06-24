import { NavLink } from 'react-router-dom'
import { Home, User, Radio } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'

export default function BottomNav() {
  const { user } = useAuthStore()

  const cls = ({ isActive }) =>
    `flex flex-col items-center gap-1 flex-1 py-3 text-xs font-medium transition-colors min-h-[56px] justify-center ${
      isActive ? 'text-[#00C2FF]' : 'text-[#3D5A80] hover:text-[#8BA4C4]'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex safe-bottom sm:hidden border-t border-[#1E3A6E]"
         style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(12px)' }}>
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
