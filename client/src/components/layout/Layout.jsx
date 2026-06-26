import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import BottomNav from './BottomNav.jsx'
import EmergencyBanner from '../ui/EmergencyBanner.jsx'
import NewsTicker from '../ui/NewsTicker.jsx'
import ChatIA from '../ui/ChatIA.jsx'

function Footer() {
  return (
    <footer className="hidden sm:block bg-white border-t border-slate-100 py-4 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400 text-center sm:text-left max-w-xl leading-relaxed">
          <strong className="text-slate-500">Aviso:</strong> La información es colaborativa, referencial y puede variar.
          ConectManzanillo no sustituye instrucciones oficiales de autoridades, terminales, patios, aduanas ni dependencias del Puerto de Manzanillo.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/legal" className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors">Privacidad</Link>
          <span className="text-slate-200">·</span>
          <Link to="/legal" className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors">Términos</Link>
          <span className="text-slate-200">·</span>
          <Link to="/anunciate" className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors">Publicidad</Link>
          <span className="text-slate-200">·</span>
          <span className="text-[10px] text-slate-300">© 2025 ConectManzanillo</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
