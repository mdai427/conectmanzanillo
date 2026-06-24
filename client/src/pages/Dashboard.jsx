import { useSections } from '../hooks/useSections.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'
import Logo from '../components/ui/Logo.jsx'
import { Anchor } from 'lucide-react'

export default function Dashboard() {
  const { data: sections = [], isLoading } = useSections()

  return (
    <div className="min-h-screen" style={{ background: '#0A1628' }}>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#1E3A6E]/60"
           style={{ background: 'linear-gradient(180deg, #0F2547 0%, #0A1628 100%)' }}>
        {/* Línea decorativa superior */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
             style={{ background: 'linear-gradient(90deg, transparent, #0099E6, #00C2FF, transparent)' }} />

        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          {/* Logo grande */}
          <div className="flex items-center gap-4 mb-6">
            <Logo size="lg" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#00C2FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0099E6]" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#0099E6' }}>
              Transmisión en vivo · Puerto de Manzanillo
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">
            Estado del Puerto
          </h1>
          <p style={{ color: '#8BA4C4' }} className="text-sm md:text-base max-w-xl">
            Reportado por operadores en campo · Se actualiza en tiempo real · Comunidad ConectManzanillo
          </p>

          {/* Stats rápidas */}
          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2">
              <Anchor size={14} style={{ color: '#0099E6' }} />
              <span className="text-xs font-semibold text-white">{sections.length} zonas activas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-white">
                {sections.reduce((a, s) => a + (s.active_reports || 0), 0)} reportes activos
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Grid secciones */}
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3D5A80' }}>
              Zonas del puerto
            </p>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: '#0F1F3D', border: '1px solid #1E3A6E' }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections.map(s => <SectionCard key={s.id} section={s} />)}
              </div>
            )}
          </div>

          {/* Feed lateral */}
          <div className="lg:w-80 xl:w-96">
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3D5A80' }}>
              Actividad reciente
            </p>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
