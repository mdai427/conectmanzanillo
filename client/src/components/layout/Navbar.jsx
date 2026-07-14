import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Briefcase, Building2, Calculator, ChevronDown, GraduationCap, Home,
  LogIn, LogOut, Menu, MessageSquareText, Newspaper, PackageSearch, Shield,
  Store, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore.js'
import Logo from '../ui/Logo.jsx'

const PRIMARY = [
  ['/', 'Inicio', Home], ['/directorio-empresarial', 'Directorio', Building2], ['/fletes', 'Fletes', PackageSearch],
  ['/vacantes', 'Empleos', Briefcase], ['/marketplace', 'Marketplace', Store], ['/noticias', 'Actualidad', Newspaper],
]
const MORE = [
  ['/comunidad', 'Comunidad', MessageSquareText], ['/capacitacion', 'Capacitación', GraduationCap],
  ['/documentos', 'Biblioteca', BookOpen], ['/calculadoras', 'Herramientas', Calculator],
]

export default function Navbar() {
  const { user, profile, signOut, hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => setMobileOpen(false), [location.pathname])

  const active = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const signOutNow = async () => { await signOut(); toast.success('Sesión cerrada'); navigate('/') }
  const isAdmin = profile?.role === 'admin' || hasPermission('admin.analytics') || hasPermission('moderation.manage')

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0" aria-label="Faro Portuario, ir al inicio"><Logo size="sm" /></Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-0.5 lg:flex">
          {PRIMARY.map(([path, label, Icon]) => <NavItem key={path} path={path} label={label} icon={Icon} active={active(path)} />)}
          <div className="group relative">
            <button className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition ${MORE.some(([path]) => active(path)) ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50'}`}>Más <ChevronDown size={12} /></button>
            <div className="invisible absolute right-0 top-full w-52 translate-y-1 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {MORE.map(([path, label, Icon]) => <Link key={path} to={path} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-800"><Icon size={15} />{label}</Link>)}
            </div>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/empresa" className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-teal-700 md:inline-flex">Para empresas</Link>
          {user ? <><Link to="/perfil" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:flex"><User size={14} />{profile?.username || 'Mi cuenta'}</Link>{isAdmin && <Link to="/admin" aria-label="Administración" className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><Shield size={15} /></Link>}<button onClick={signOutNow} aria-label="Cerrar sesión" className="hidden h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 sm:grid"><LogOut size={15} /></button></> : <><Link to="/login" className="hidden items-center gap-1.5 px-2 py-2 text-xs font-bold text-slate-600 sm:flex"><LogIn size={14} />Entrar</Link><Link to="/register" className="hidden rounded-lg bg-[#0d4f4b] px-3.5 py-2 text-xs font-extrabold text-white sm:inline-flex">Registrar empresa</Link></>}
          <button onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 lg:hidden">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>

      {mobileOpen && <nav aria-label="Menú móvil" className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl lg:hidden"><div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">{[...PRIMARY, ...MORE].map(([path, label, Icon]) => <Link key={path} to={path} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold ${active(path) ? 'bg-teal-50 text-teal-800' : 'text-slate-600'}`}><Icon size={17} />{label}</Link>)}</div><div className="mx-auto mt-4 flex max-w-7xl flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">{user ? <><Link to="/perfil" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold">Mi cuenta</Link><button onClick={signOutNow} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-red-600">Cerrar sesión</button></> : <><Link to="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold">Entrar</Link><Link to="/register" className="rounded-xl bg-[#0d4f4b] px-4 py-3 text-center text-sm font-extrabold text-white">Registrar empresa</Link></>}<Link to="/empresa" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold">Para empresas</Link></div></nav>}
    </header>
  )
}

function NavItem({ path, label, icon: Icon, active }) { return <Link to={path} className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${active ? 'bg-teal-50 text-teal-800 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={13} />{label}</Link> }
