import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, User, Shield, Map, Newspaper, BookOpen } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/',           label: 'Puerto',     icon: Map       },
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
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src="/logo.png" alt="ConectManzanillo" className="h-9 w-auto"
            onError={e => { e.target.style.display = 'none' }} />
          <span className="font-black text-slate-800 text-sm tracking-tight hidden sm:inline">
            CONECT<span className="text-blue-600">MANZANILLO</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                color:      isActive(to) ? '#1d4ed8' : '#64748b',
                background: isActive(to) ? '#eff6ff'  : 'transparent',
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all">
                  <Shield size={12} />
                  Admin
                </Link>
              )}
              <Link to="/perfil"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all">
                <User size={12} />
                <span className="hidden sm:inline">{profile?.username || 'Perfil'}</span>
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <LogOut size={12} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">
                <LogIn size={12} />
                Entrar
              </Link>
              <Link to="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
