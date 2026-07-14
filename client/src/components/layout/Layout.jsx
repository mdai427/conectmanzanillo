import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import BottomNav from './BottomNav.jsx'
import EmergencyBanner from '../ui/EmergencyBanner.jsx'
import NewsTicker from '../ui/NewsTicker.jsx'
import ChatIA from '../ui/ChatIA.jsx'
import { isDemoMode } from '../../lib/supabase.js'

function Footer() {
  return (
    <footer className="hidden sm:block bg-white border-t border-slate-100 py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
          <p className="text-[10px] text-slate-400 max-w-xl leading-relaxed">
            <strong className="text-slate-500">Aviso:</strong> Las vacantes, perfiles y contenidos son publicados por la comunidad y las empresas participantes.
            Verifica siempre las condiciones de una oportunidad antes de compartir documentos o aceptar una oferta.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-teal-700">
            Ecosistema · Empresas · Operaciones · Comunidad
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-300">
          <Link to="/legal" className="hover:text-blue-500 transition-colors text-slate-400">Privacidad</Link>
          <span>·</span>
          <Link to="/legal" className="hover:text-blue-500 transition-colors text-slate-400">Términos</Link>
          <span>·</span>
          <Link to="/anunciate" className="hover:text-blue-500 transition-colors text-slate-400">Publicidad</Link>
          <span>·</span>
          <span>© 2026 Faro Portuario</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {isDemoMode && (
        <div className="bg-white border-b border-slate-100 px-4 py-2 text-center text-[10px] font-semibold text-slate-500">
          Vista de producto · Los módulos que requieren datos muestran su estado de conexión
        </div>
      )}
      <EmergencyBanner />
      <Navbar />
      <NewsTicker />
      <main className="flex-1 pb-20 sm:pb-6">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <ChatIA />
    </div>
  )
}
