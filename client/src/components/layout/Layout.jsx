import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import BottomNav from './BottomNav.jsx'
import EmergencyBanner from '../ui/EmergencyBanner.jsx'
import NewsTicker from '../ui/NewsTicker.jsx'
import ChatIA from '../ui/ChatIA.jsx'

const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/conectmanzanillooficial/', label: 'FB Oficial' },
  { href: 'https://www.facebook.com/groups/conectmanzanillo/', label: 'Grupo FB' },
  { href: 'https://whatsapp.com/channel/0029VbBN73rId7nJ3RTSsq3s', label: 'Canal WA' },
  { href: 'https://chat.whatsapp.com/HbR3pQLSjrkFHjINylqDjW', label: 'Comunidad WA' },
  { href: 'https://www.instagram.com/conectmanzanillo/', label: 'Instagram' },
  { href: 'https://www.tiktok.com/@conectmanzanilloo/', label: 'TikTok' },
]

function Footer() {
  return (
    <footer className="hidden sm:block bg-white border-t border-slate-100 py-4 px-4 mt-auto">
      <div className="max-w-7xl mx-auto space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
          <p className="text-[10px] text-slate-400 max-w-xl leading-relaxed">
            <strong className="text-slate-500">Aviso:</strong> La información es colaborativa, referencial y puede variar.
            ConectManzanillo no sustituye instrucciones oficiales de autoridades, terminales, patios, aduanas ni dependencias del Puerto de Manzanillo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {SOCIAL_LINKS.map(({ href, label }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                 className="text-[10px] text-slate-400 hover:text-blue-500 font-medium transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-300">
          <Link to="/legal" className="hover:text-blue-500 transition-colors text-slate-400">Privacidad</Link>
          <span>·</span>
          <Link to="/legal" className="hover:text-blue-500 transition-colors text-slate-400">Términos</Link>
          <span>·</span>
          <Link to="/anunciate" className="hover:text-blue-500 transition-colors text-slate-400">Publicidad</Link>
          <span>·</span>
          <span>© 2025 ConectManzanillo</span>
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
