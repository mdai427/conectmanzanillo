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
          ¿CÓMO FUNCIONA?
      ══════════════════════════════════════════════ */}
      <div id="como-funciona" className="bg-white border-t border-slate-100 py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">¿Cómo funciona?</h2>
            <p className="text-slate-500 text-sm">3 pasos simples para estar informado</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                emoji: '👀',
                title: 'Consulta el estado',
                desc: 'Abre la app y ve en tiempo real el estado de cada patio y terminal del puerto: libre, moderado, saturado o cerrado.',
                color: '#3b82f6',
                bg: '#eff6ff',
              },
              {
                step: '02',
                emoji: '📡',
                title: 'Reporta lo que ves',
                desc: 'Si estás en el puerto, reporta el estado real de la zona. Tu reporte ayuda a todos los operadores que vienen detrás de ti.',
                color: '#10b981',
                bg: '#f0fdf4',
              },
              {
                step: '03',
                emoji: '✅',
                title: 'Confirma o corrige',
                desc: 'Otros operadores confirman si el reporte es correcto. Más confirmaciones = más confianza en el dato.',
                color: '#f59e0b',
                bg: '#fffbeb',
              },
            ].map(({ step, emoji, title, desc, color, bg }) => (
              <div key={step} className="relative rounded-2xl p-6 text-center border"
                style={{ background: bg, borderColor: `${color}33` }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md"
                  style={{ background: color }}>
                  {step}
                </div>
                <div className="text-4xl mb-3 mt-2">{emoji}</div>
                <h3 className="font-black text-slate-800 text-base mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ rápido */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { q: '¿Es gratis?', a: 'Sí, 100% gratis para consultar y reportar.' },
              { q: '¿Necesito registrarme para ver el estado?', a: 'No. Solo para reportar necesitas una cuenta.' },
              { q: '¿Quién hace los reportes?', a: 'Los mismos operadores y transportistas del puerto.' },
              { q: '¿Cada cuánto se actualiza?', a: 'Los reportes son en tiempo real, al momento de enviarse.' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="font-bold text-slate-700 text-sm mb-1">❓ {q}</p>
                <p className="text-slate-500 text-xs">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          COMUNIDAD WHATSAPP
      ══════════════════════════════════════════════ */}
      <div id="whatsapp" className="py-14 px-4 border-t border-slate-100 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                 style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ fill: '#16a34a' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#16a34a' }}>Comunidad WhatsApp</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">Únete por WhatsApp</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Información del puerto en tiempo real, directo en tu WhatsApp. Canal oficial + grupos por zona.
            </p>
          </div>

          <div className="space-y-3">
            {/* Canal oficial */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2.5 flex items-center gap-2"
                   style={{ background: '#075E54' }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Canal oficial · Solo lectura</span>
                <span className="ml-auto text-[10px] text-green-200 font-semibold">📢 Avisos oficiales</span>
              </div>
              <div className="bg-white px-4 py-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                     style={{ background: '#25D366' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">Canal ConectManzanillo</p>
                  <p className="text-xs text-slate-500 truncate">Cierres, avisos de aduana, operativos y noticias del puerto</p>
                </div>
              </div>
              <a href="https://wa.me/525566834948"
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#25D366' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                UNIRME AL CANAL
              </a>
            </div>

            {/* Comunidad de grupos */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2.5 flex items-center gap-2"
                   style={{ background: '#128C7E' }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Comunidad · Grupos activos</span>
                <span className="ml-auto text-[10px] text-green-200 font-semibold">💬 Participa</span>
              </div>
              <div className="bg-white px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                       style={{ background: '#128C7E' }}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Grupos ConectManzanillo</p>
                    <p className="text-xs text-slate-500">Chats de operadores, transportistas y empresas del puerto</p>
                  </div>
                </div>
                {/* Mini-lista de grupos */}
                <div className="space-y-1.5">
                  {[
                    { name: 'Grupo Principal · Operadores', icon: '🚛' },
                    { name: 'Grupo Patio Regulador',        icon: '🅿️' },
                    { name: 'Grupo Aduana y Trámites',      icon: '📋' },
                    { name: 'Grupo Terminales y Patios',    icon: '🏗️' },
                  ].map(({ name, icon }) => (
                    <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs text-slate-600 font-medium">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20unirme%20a%20los%20grupos%20de%20ConectManzanillo"
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#128C7E' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                UNIRME A LOS GRUPOS
              </a>
            </div>
          </div>
        </div>
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
            <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20anunciarme%20en%20ConectManzanillo"
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

      {/* ══════════════════════════════════════════════
          SECCIÓN DONATIVOS
      ══════════════════════════════════════════════ */}
      <div id="donativos" className="bg-white border-t border-slate-100 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-4">
              <span className="text-blue-600 text-sm">❤️</span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Apoya el proyecto</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3">
              Donativos
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              ConectManzanillo es un servicio <strong>gratuito</strong> para todos los operadores del puerto.
              Si te ha sido útil, considera apoyarnos para mantener los servidores y seguir mejorando la plataforma.
            </p>
          </div>

          {/* Métodos de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* PayPal */}
            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: '#003087' }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                  <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 1.81.752 3.285C17.081 10.55 14.65 12 11.5 12H9.97l-1.43 9H5.55L7.96 4.5h5.115c2.109 0 3.498.344 4.032 1.388z"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">PayPal</h3>
              <p className="text-xs text-slate-500 mb-4">Pago seguro con tarjeta o cuenta PayPal</p>
              <a href="https://paypal.me/conectmanzanillo" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: '#003087' }}>
                Donar con PayPal
              </a>
            </div>

            {/* Transferencia CLABE */}
            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-green-600">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M4 10h3v7H4zm6.5-7h3v14h-3zm6.5 4h3v10h-3zM2 19h20v2H2z"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Transferencia bancaria</h3>
              <p className="text-xs text-slate-500 mb-3">CLABE interbancaria</p>
              <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 mb-3">
                <p className="text-xs text-slate-400 mb-0.5">CLABE</p>
                <p className="font-mono font-bold text-slate-700 text-sm tracking-wider">000 000 0000 0000 00</p>
                <p className="text-xs text-slate-400 mt-1">Banco · A nombre de: ConectManzanillo</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText('00000000000000000'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
                📋 Copiar CLABE
              </button>
            </div>

            {/* OXXO / Efectivo */}
            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-red-600">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">OXXO Pay</h3>
              <p className="text-xs text-slate-500 mb-4">Paga en efectivo en cualquier OXXO</p>
              <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20hacer%20un%20donativo%20por%20OXXO"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95">
                Solicitar referencia
              </a>
            </div>
          </div>

          {/* Nota motivacional */}
          <div className="text-center py-6 px-6 rounded-2xl bg-blue-50 border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">
              🚛 Cada donativo, por pequeño que sea, ayuda a mantener el servicio activo para todos los transportistas del puerto.
            </p>
            <p className="text-xs text-blue-500 mt-1">¡Gracias por tu apoyo!</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          REDES SOCIALES
      ══════════════════════════════════════════════ */}
      <div id="redes" className="py-14 px-4 border-t border-slate-100"
           style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">Únete a la comunidad</h2>
            <p className="text-slate-500 text-sm">Síguenos para noticias, actualizaciones y avisos del puerto en tiempo real</p>
          </div>

          <div className="space-y-3">
            {/* Grupo Facebook */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2 flex items-center gap-2"
                   style={{ background: '#1877F2' }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Grupo comunitario · Facebook</span>
              </div>
              <div className="bg-white px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                     style={{ background: '#1877F2' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Grupo Conect Manzanillo</p>
                  <p className="text-xs text-slate-500">Comunidad de transportistas, empresas y ciudadanos del puerto</p>
                </div>
              </div>
              <a href="https://www.facebook.com/groups/conectmanzanillo"
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#1877F2' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                UNIRME AL GRUPO
              </a>
            </div>

            {/* Página Facebook */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2 flex items-center gap-2"
                   style={{ background: '#0866FF' }}>
                <span className="text-lg">🏴</span>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Página oficial · Facebook</span>
              </div>
              <div className="bg-white px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                     style={{ background: '#0866FF' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Conect Manzanillo Oficial</p>
                  <p className="text-xs text-slate-500">Síguenos para noticias, actualizaciones y avisos oficiales del puerto</p>
                </div>
              </div>
              <a href="https://www.facebook.com/conectmanzanillo"
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#0866FF' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                SEGUIR PÁGINA
              </a>
            </div>

            {/* Instagram */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2 flex items-center gap-2"
                   style={{ background: 'linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <span className="text-lg">📸</span>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Perfil oficial · Instagram</span>
              </div>
              <div className="bg-white px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">@conectmanzanillo</p>
                  <p className="text-xs text-slate-500">Fotos, videos y noticias del puerto en Instagram</p>
                </div>
              </div>
              <a href="https://www.instagram.com/conectmanzanillo"
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.99]"
                 style={{ background: 'linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                SEGUIR EN INSTAGRAM
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <img src="/logo.png" alt="ConectManzanillo" className="h-12 opacity-80"
            onError={e => { e.target.style.display = 'none' }} />
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <a href="https://wa.me/525566834948" target="_blank" rel="noopener noreferrer"
               className="text-green-400 hover:text-green-300 font-semibold transition-colors">WhatsApp</a>
            <a href="https://www.facebook.com/conectmanzanillo" target="_blank" rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Facebook</a>
            <a href="https://www.instagram.com/conectmanzanillo" target="_blank" rel="noopener noreferrer"
               className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">Instagram</a>
            <a href="mailto:contacto@conectmanzanillo.com"
               className="text-slate-400 hover:text-slate-300 transition-colors">contacto@conectmanzanillo.com</a>
          </div>
          <p className="text-xs text-slate-600">© 2025 ConectManzanillo · Puerto de Manzanillo, Colima</p>
        </div>
      </div>
    </div>
  )
}
