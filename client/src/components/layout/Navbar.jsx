import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, User, Shield, Map, Newspaper, BookOpen } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import Logo from '../ui/Logo.jsx'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/',           label: 'Puerto',     icon: Map      },
  { to: '/noticias',   label: 'Noticias',   icon: Newspaper },
  { to: '/directorio', label: 'Directorio', icon: BookOpen  },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <header className="sticky top-0 z-40" style={{ background: 'rgba(8,12,24,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        <Link to="/" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: isActive(to) ? '#60a5fa' : '#64748b',
                background: isActive(to) ? 'rgba(59,130,246,0.12)' : 'transparent',
              }}>
              <Icon size={12} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <nav className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-amber-400 hover:bg-amber-400/10">
                  <Shield size={12} />
                  Admin
                </Link>
              )}
              <Link to="/perfil"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/05 transition-all">
                <User size={12} />
                <span className="hidden sm:inline">{profile?.username || 'Perfil'}</span>
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/08 transition-all">
                <LogOut size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all">
                <LogIn size={12} />
                Entrar
              </Link>
              <Link to="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
