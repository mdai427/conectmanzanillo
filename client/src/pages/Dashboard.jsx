import { useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSections } from '../hooks/useSections.js'
import { supabase } from '../lib/supabase.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'
import NewsCard from '../components/ui/NewsCard.jsx'
import WeatherWidget from '../components/ui/WeatherWidget.jsx'
import AdBanner from '../components/ui/AdBanner.jsx'
import { LayoutGrid, Map, Newspaper, Radio, PhoneCall, Megaphone } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50">

      {/* ══════════════════════════════════════════════
          HERO  — foto difuminada del puerto
      ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
        {/* Foto de fondo del Puerto de Manzanillo */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Puerto_de_Manzanillo%2C_Colima.jpg/1280px-Puerto_de_Manzanillo%2C_Colima.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 60%',
            filter: 'blur(3px) brightness(0.45)',
            transform: 'scale(1.05)',
          }} />

        {/* Gradiente sobre la foto */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(14,70,150,0.55) 0%, rgba(10,30,80,0.75) 60%, rgba(248,250,252,1) 100%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-14">
          {/* Logo grande */}
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="ConectManzanillo" className="h-28 md:h-36 drop-shadow-2xl"
              onError={e => { e.target.style.display = 'none' }} />
          </div>

          {/* Live badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-200">
              EN VIVO · Puerto de Manzanillo, Colima
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white text-center leading-tight drop-shadow-lg mb-2">
            Estado del Puerto
          </h1>
          <p className="text-center text-blue-100/80 text-sm max-w-md mx-auto mb-8">
            Reportado por operadores en campo · Actualización en tiempo real
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}>
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-bold text-white">{freeCount} zonas libres</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-bold text-white">{busyCount} saturadas</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Radio size={12} className="text-white" />
              <span className="text-sm font-bold text-white">{totalReports} reportes activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* View toggle */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {view === 'map' ? 'Mapa interactivo' : `${sections.length} zonas activas`}
          </p>
          <div className="flex p-1 rounded-xl gap-1 bg-white shadow-sm border border-slate-200">
            {[
              { id: 'grid', icon: LayoutGrid, label: 'Zonas' },
              { id: 'map',  icon: Map,        label: 'Mapa'  },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: view === id ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'transparent',
                  color: view === id ? 'white' : '#64748b',
                }}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid / Map */}
        {view === 'map' ? (
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 min-w-0">
              <Suspense fallback={
                <div className="rounded-2xl flex items-center justify-center gap-3 bg-white shadow"
                     style={{ height: 480, border: '1px solid #e2e8f0' }}>
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">Cargando mapa…</span>
                </div>
              }>
                <PortMap sections={sections} onZoneClick={(slug) => navigate(`/seccion/${slug}`)} />
              </Suspense>

              <div className="mt-3 flex flex-wrap gap-2">
                {sections.map(s => {
                  const colors = { free:'#16a34a', moderate:'#d97706', congested:'#dc2626', closed:'#6b7280', unknown:'#94a3b8' }
                  const c = colors[s.status] || '#94a3b8'
                  return (
                    <button key={s.id} onClick={() => navigate(`/seccion/${s.slug}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white shadow-sm hover:shadow transition-all border"
                      style={{ borderColor: `${c}44`, color: c }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:w-72 space-y-4">
              <WeatherWidget />
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={13} className="text-blue-500" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Actividad reciente</p>
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
                    <div key={i} className="rounded-2xl h-44 animate-pulse bg-slate-200" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sections.map(s => <SectionCard key={s.id} section={s} />)}
                </div>
              )}

              {news.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Newspaper size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-700">Noticias del día</span>
                    </div>
                    <Link to="/noticias" className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={13} className="text-blue-500" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Actividad reciente</p>
                </div>
                <ActivityFeed />
              </div>
              <AdBanner position="dashboard" />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          BANNER ANÚNCIATE AQUÍ
      ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden mt-12">
        {/* Fondo foto difuminada */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Puerto_de_Manzanillo%2C_Colima.jpg/1280px-Puerto_de_Manzanillo%2C_Colima.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            filter: 'blur(4px) brightness(0.3)',
            transform: 'scale(1.05)',
          }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.85) 0%, rgba(37,99,235,0.9) 100%)' }} />

        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Megaphone size={13} className="text-blue-200" />
            <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">Publicidad</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">
            ¡ANÚNCIATE AQUÍ!
          </h2>
          <p className="text-lg md:text-xl text-blue-100 mb-2 font-medium">
            Llega a cientos de transportistas del Puerto de Manzanillo
          </p>
          <p className="text-sm text-blue-200/70 mb-10 max-w-lg mx-auto">
            Tu empresa frente a los operadores que mueven la carga del puerto cada día.
            Planes desde $500 MXN/mes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/523141234567?text=Hola%2C%20quiero%20anunciarme%20en%20ConectManzanillo"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: '#25D366' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a href="mailto:contacto@conectmanzanillo.com?subject=Quiero%20anunciarme"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', color: 'white', backdropFilter: 'blur(8px)' }}>
              <PhoneCall size={18} />
              Contáctanos
            </a>
          </div>

          {/* Feature bullets */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-blue-100/80">
            {['✅ Banner en el dashboard','✅ Ticker de noticias','✅ Directorio destacado','✅ Métricas de alcance'].map(f => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer minimal */}
      <div className="bg-slate-900 text-center py-6 px-4">
        <p className="text-xs text-slate-500">
          © 2025 ConectManzanillo · Puerto de Manzanillo, Colima ·{' '}
          <a href="mailto:contacto@conectmanzanillo.com" className="text-blue-400 hover:underline">
            contacto@conectmanzanillo.com
          </a>
        </p>
      </div>
    </div>
  )
}
