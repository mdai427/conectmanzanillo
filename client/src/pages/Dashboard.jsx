import { useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSections } from '../hooks/useSections.js'
import { supabase } from '../lib/supabase.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'
import Logo from '../components/ui/Logo.jsx'
import NewsCard from '../components/ui/NewsCard.jsx'
import WeatherWidget from '../components/ui/WeatherWidget.jsx'
import AdBanner from '../components/ui/AdBanner.jsx'
import { LayoutGrid, Map, Newspaper, Radio } from 'lucide-react'

const PortMap = lazy(() => import('../components/ui/PortMap.jsx'))

export default function Dashboard() {
  const { data: sections = [], isLoading } = useSections()
  const [view, setView] = useState('grid')
  const navigate = useNavigate()

  const { data: news = [] } = useQuery({
    queryKey: ['news-preview'],
    queryFn: async () => {
      const { data } = await supabase.from('news_items').select('*')
        .eq('is_active', true).gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false }).limit(3)
      return data || []
    },
    staleTime: 60_000,
  })

  const totalReports = sections.reduce((a, s) => a + (s.active_reports || 0), 0)
  const freeCount    = sections.filter(s => s.status === 'free').length
  const busyCount    = sections.filter(s => s.status === 'congested').length

  return (
    <div className="min-h-screen" style={{ background: '#080c18' }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden"
           style={{ background: 'linear-gradient(180deg, #0d1a3a 0%, #080c18 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #60a5fa 50%, #3b82f6 70%, transparent 100%)' }} />

        <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {/* Live badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-blue-400">
                  EN VIVO · Puerto de Manzanillo
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white leading-none mb-2">
                Estado del Puerto
              </h1>
              <p className="text-sm text-slate-500 max-w-md">
                Reportado por operadores en campo · Se actualiza en tiempo real
              </p>
            </div>

            {/* Stats cards */}
            <div className="flex gap-3 shrink-0">
              <div className="px-4 py-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="text-2xl font-black text-green-400">{freeCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">zonas libres</div>
              </div>
              <div className="px-4 py-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-2xl font-black text-red-400">{busyCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">saturadas</div>
              </div>
              <div className="px-4 py-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-2xl font-black text-white">{totalReports}</div>
                <div className="text-xs text-slate-500 mt-0.5">reportes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── View toggle ── */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">
            {view === 'map' ? 'Vista de mapa interactivo' : `${sections.length} zonas activas`}
          </p>
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'grid', icon: LayoutGrid, label: 'Zonas' },
              { id: 'map',  icon: Map,        label: 'Mapa'  },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: view === id ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'transparent',
                  color: view === id ? 'white' : '#64748b',
                }}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {view === 'map' ? (
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 min-w-0">
              <Suspense fallback={
                <div className="rounded-2xl flex items-center justify-center gap-3"
                     style={{ height: 480, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-500">Cargando mapa…</span>
                </div>
              }>
                <PortMap sections={sections} onZoneClick={(slug) => navigate(`/seccion/${slug}`)} />
              </Suspense>

              {/* Mini chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {sections.map(s => {
                  const colors = { free: '#22C55E', moderate: '#F59E0B', congested: '#EF4444', closed: '#6B7280', unknown: '#475569' }
                  const c = colors[s.status] || '#475569'
                  return (
                    <button key={s.id} onClick={() => navigate(`/seccion/${s.slug}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: `${c}14`, border: `1px solid ${c}33`, color: c }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:w-72 space-y-4">
              <WeatherWidget />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={12} className="text-blue-400" />
                  <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Actividad reciente</p>
                </div>
                <ActivityFeed />
              </div>
              <AdBanner position="dashboard" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl h-44 animate-pulse"
                         style={{ background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sections.map(s => <SectionCard key={s.id} section={s} />)}
                </div>
              )}

              {/* News preview */}
              {news.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Newspaper size={13} className="text-blue-400" />
                      <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Noticias del día</span>
                    </div>
                    <Link to="/noticias" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Ver todas →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {news.map(item => <NewsCard key={item.id} item={item} />)}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:w-72 xl:w-80 space-y-4 shrink-0">
              <WeatherWidget />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={12} className="text-blue-400" />
                  <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Actividad reciente</p>
                </div>
                <ActivityFeed />
              </div>
              <AdBanner position="dashboard" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
