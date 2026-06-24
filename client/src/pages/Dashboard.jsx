import { useSections } from '../hooks/useSections.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'

export default function Dashboard() {
  const { data: sections = [], isLoading } = useSections()

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#00C2FF]/6 to-transparent border-b border-[#30363D]/50">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse" />
            <span className="text-xs font-mono text-[#00C2FF] uppercase tracking-widest">
              en vivo · puerto de manzanillo
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            Estado del Puerto
          </h1>
          <p className="text-[#8B949E] mt-2 text-sm md:text-base">
            Reportado por operadores en campo · Se actualiza en tiempo real
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Grid secciones */}
          <div className="flex-1">
            <p className="text-xs font-mono text-[#4B5563] uppercase tracking-widest mb-4">
              zonas del puerto — {sections.length} activas
            </p>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-2xl h-48 animate-pulse" />
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
            <p className="text-xs font-mono text-[#4B5563] uppercase tracking-widest mb-4">
              actividad reciente
            </p>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
