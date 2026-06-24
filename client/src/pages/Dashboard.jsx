import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSections } from '../hooks/useSections.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'
import Logo from '../components/ui/Logo.jsx'
import { Anchor, Map, LayoutGrid } from 'lucide-react'

// Lazy load del mapa para no bloquear el render inicial
const PortMap = lazy(() => import('../components/ui/PortMap.jsx'))

export default function Dashboard() {
  const { data: sections = [], isLoading } = useSections()
  const [view, setView] = useState('grid') // 'grid' | 'map'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#0A1628' }}>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#1E3A6E]/60"
           style={{ background: 'linear-gradient(180deg, #0F2547 0%, #0A1628 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5"
             style={{ background: 'linear-gradient(90deg, transparent, #0099E6, #00C2FF, transparent)' }} />

        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center gap-4 mb-6">
            <Logo size="lg" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
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
          <p className="text-sm md:text-base max-w-xl" style={{ color: '#8BA4C4' }}>
            Reportado por operadores en campo · Se actualiza en tiempo real
          </p>

          <div className="flex gap-6 mt-5">
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
        {/* Toggle vista */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5A80' }}>
            {view === 'map' ? 'Mapa interactivo' : `Zonas del puerto — ${sections.length} activas`}
          </p>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #1E3A6E' }}>
            <button
              onClick={() => setView('grid')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: view === 'grid' ? 'linear-gradient(135deg,#0099E6,#00C2FF)' : '#0F1F3D',
                color: view === 'grid' ? 'white' : '#8BA4C4',
              }}
            >
              <LayoutGrid size={13} />
              Zonas
            </button>
            <button
              onClick={() => setView('map')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: view === 'map' ? 'linear-gradient(135deg,#0099E6,#00C2FF)' : '#0F1F3D',
                color: view === 'map' ? 'white' : '#8BA4C4',
              }}
            >
              <Map size={13} />
              Mapa
            </button>
          </div>
        </div>

        {view === 'map' ? (
          /* Vista mapa */
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <Suspense fallback={
                <div className="rounded-2xl flex items-center justify-center" style={{ height: 400, background: '#0F1F3D', border: '1px solid #1E3A6E' }}>
                  <div className="w-8 h-8 border-2 border-[#0099E6] border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <PortMap
                  sections={sections}
                  onZoneClick={(slug) => navigate(`/seccion/${slug}`)}
                />
              </Suspense>

              {/* Leyenda de zonas */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sections.map(s => {
                  const colors = { free: '#22C55E', moderate: '#F59E0B', congested: '#EF4444', closed: '#6B7280', unknown: '#3D5A80' }
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/seccion/${s.slug}`)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:opacity-80"
                      style={{ background: '#0F1F3D', border: `1px solid ${colors[s.status] || '#1E3A6E'}` }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[s.status] || '#3D5A80' }} />
                      <span className="text-white font-medium truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:w-72">
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#3D5A80' }}>
                Actividad reciente
              </p>
              <ActivityFeed />
            </div>
          </div>
        ) : (
          /* Vista grid */
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl h-48 animate-pulse"
                         style={{ background: '#0F1F3D', border: '1px solid #1E3A6E' }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sections.map(s => <SectionCard key={s.id} section={s} />)}
                </div>
              )}
            </div>

            <div className="lg:w-80 xl:w-96">
              <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3D5A80' }}>
                Actividad reciente
              </p>
              <ActivityFeed />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
