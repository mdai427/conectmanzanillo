import { Link, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, User, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
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
    <header className="sticky top-0 z-40 bg-[#0D1117]/95 backdrop-blur border-b border-[#30363D]/60">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
          <span className="font-bold text-white tracking-tight">ConectManzanillo</span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8B949E] hover:text-white rounded-lg hover:bg-[#161B22] transition-colors"
                >
                  <Shield size={14} />
                  Admin
                </Link>
              )}
              <Link
                to="/perfil"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8B949E] hover:text-white rounded-lg hover:bg-[#161B22] transition-colors"
              >
                <User size={14} />
                {profile?.username || 'Perfil'}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8B949E] hover:text-red-400 rounded-lg hover:bg-[#161B22] transition-colors"
              >
                <LogOut size={14} />
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8B949E] hover:text-white rounded-lg hover:bg-[#161B22] transition-colors"
              >
                <LogIn size={14} />
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-[#00C2FF] text-[#0D1117] font-bold rounded-lg hover:bg-[#33CFFF] transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
