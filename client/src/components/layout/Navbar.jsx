import { Link, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, User, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import Logo from '../ui/Logo.jsx'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#1E3A6E]/80"
            style={{ background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link to="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8BA4C4] hover:text-white rounded-lg hover:bg-[#162B52] transition-colors">
                  <Shield size={14} />
                  Admin
                </Link>
              )}
              <Link to="/perfil"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8BA4C4] hover:text-white rounded-lg hover:bg-[#162B52] transition-colors">
                <User size={14} />
                {profile?.username || 'Perfil'}
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8BA4C4] hover:text-red-400 rounded-lg hover:bg-[#162B52] transition-colors">
                <LogOut size={14} />
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8BA4C4] hover:text-white rounded-lg hover:bg-[#162B52] transition-colors">
                <LogIn size={14} />
                Iniciar sesión
              </Link>
              <Link to="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors text-white"
                style={{ background: 'linear-gradient(135deg, #0099E6, #00C2FF)' }}>
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
