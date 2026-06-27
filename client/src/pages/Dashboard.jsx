import { useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSections } from '../hooks/useSections.js'
import { supabase } from '../lib/supabase.js'
import SectionCard from '../components/ui/SectionCard.jsx'
import EstadoInteligente from '../components/ui/EstadoInteligente.jsx'
import ActivityFeed from '../components/ui/ActivityFeed.jsx'
import NewsCard from '../components/ui/NewsCard.jsx'
import WeatherWidget from '../components/ui/WeatherWidget.jsx'
import AdBanner from '../components/ui/AdBanner.jsx'
import {
  LayoutGrid, Map, Newspaper, Radio, PhoneCall, Megaphone,
  ArrowRight, CheckCircle2, Zap, Users, TrendingUp, Shield,
  BarChart3, Bell, Smartphone, ChevronRight, Star,
} from 'lucide-react'

const PortMap = lazy(() => import('../components/ui/PortMap.jsx'))

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

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
  const modCount     = sections.filter(s => s.status === 'moderate').length

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════════════════════
          HERO PRINCIPAL
      ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 620 }}>

        {/* Fondo: imagen satelital del puerto */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `url('/puerto-hero.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 45%',
            filter: 'brightness(0.28) saturate(1.3)',
            transform: 'scale(1.03)',
          }} />

        {/* Overlay gradiente */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, rgba(2,10,30,0.85) 0%, rgba(5,20,60,0.75) 40%, rgba(10,30,80,0.65) 70%, rgba(248,250,252,1) 100%)'
        }} />

        {/* Partículas decorativas — líneas de luz */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-0 right-0 h-px opacity-10"
               style={{ background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)' }} />
          <div className="absolute top-2/3 left-0 right-0 h-px opacity-10"
               style={{ background: 'linear-gradient(90deg, transparent, #60a5fa, transparent)' }} />
        </div>

        {/* Resplandor azul detrás del logo */}
        <div className="absolute pointer-events-none"
             style={{ top: '6%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500,
               background: 'radial-gradient(ellipse at center, rgba(56,140,255,0.3) 0%, rgba(30,80,200,0.1) 45%, transparent 72%)',
               filter: 'blur(24px)', borderRadius: '50%' }} />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-28 md:pt-16 md:pb-32">

          {/* LIVE badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                 style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-green-300">
                En vivo · Puerto de Manzanillo, Colima
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="ConectManzanillo"
              className="h-32 md:h-40 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 32px rgba(96,165,250,0.8)) drop-shadow(0 6px 20px rgba(0,0,0,0.7))' }}
              onError={e => { e.target.style.display='none' }} />
          </div>

          {/* Headline */}
          <h1 className="text-center font-black text-white leading-tight mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            La información del Puerto de Manzanillo{' '}
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              en tiempo real.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-center text-blue-100/75 max-w-2xl mx-auto mb-10 leading-relaxed"
             style={{ fontSize: 'clamp(0.95rem, 2vw, 1.15rem)' }}>
            Conecta operadores, transportistas, empresas y agentes aduanales
            mediante información colaborativa e inteligencia en tiempo real.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link to="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
              Entrar al portal
              <ArrowRight size={16} />
            </Link>
            <Link to="/register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(12px)' }}>
              Registrar empresa
            </Link>
            <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20una%20demo%20de%20ConectManzanillo"
               target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: '#25D366' }}>
              {WA_ICON}
              Solicitar Demo
            </a>
          </div>

          {/* Stat pills en tiempo real */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { dot: '#22c55e', val: `${freeCount} libres`,         label: 'zonas libres'     },
              { dot: '#f59e0b', val: `${modCount} moderadas`,       label: 'tráfico medio'    },
              { dot: '#ef4444', val: `${busyCount} saturadas`,      label: 'congestión alta'  },
              { dot: '#60a5fa', val: `${totalReports} reportes`,    label: 'en tiempo real'   },
            ].map(({ dot, val, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full"
                   style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                <span className="text-sm font-bold text-white">{val}</span>
                <span className="text-xs text-white/50 hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DASHBOARD OPERATIVO
      ══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10 pb-10">

        {/* Toggle vista */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-blue-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {view === 'map' ? 'Mapa interactivo' : `${sections.length} zonas monitoreadas`}
            </p>
          </div>
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

        {/* Estado inteligente del puerto */}
        <div className="mb-5">
          <EstadoInteligente sections={sections} />
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
                    <div key={i} className="rounded-2xl h-44 animate-pulse bg-slate-100" />
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

      {/* ══════════════════════════════════════════════════════════
          NÚMEROS / SOCIAL PROOF
      ══════════════════════════════════════════════════════════ */}
      <div className="border-y border-slate-100 bg-slate-50 py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: `${sections.length || '—'}`,  label: 'Zonas monitoreadas',      icon: Map,   sub: 'Puerto Manzanillo'   },
            { num: `${totalReports || '0'}`,   label: 'Reportes activos ahora',  icon: Radio, sub: 'datos de la comunidad'},
            { num: `${freeCount}/${sections.length || '—'}`, label: 'Zonas libres ahora', icon: Zap, sub: 'en tiempo real' },
            { num: '24/7',                     label: 'Monitoreo continuo',      icon: Users, sub: 'siempre activo'      },
          ].map(({ num, label, icon: Icon, sub }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
                  <Icon size={16} className="text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-800 mb-0.5">{num}</p>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CÓMO FUNCIONA
      ══════════════════════════════════════════════════════════ */}
      <div id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">La plataforma</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">¿Cómo funciona?</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Información colaborativa que se convierte en inteligencia operativa para todo el puerto</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01', color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                icon: Map, title: 'Consulta el estado en tiempo real',
                desc: 'Abre la app y ve al instante el estado de cada patio y terminal: libre, moderado, saturado o cerrado. Sin registro necesario.',
              },
              {
                step: '02', color: '#10b981', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                icon: Radio, title: 'Reporta lo que ves en campo',
                desc: 'Los operadores en campo reportan el estado real. Filas, accidentes, operativos, inspecciones — todo en segundos desde el celular.',
              },
              {
                step: '03', color: '#f59e0b', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                icon: TrendingUp, title: 'La comunidad confirma y mejora',
                desc: 'Otros operadores confirman o corrigen. Más confirmaciones = mayor confianza. El sistema aprende y mejora con cada reporte.',
              },
            ].map(({ step, color, bg, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl p-6 border"
                   style={{ background: bg, borderColor: `${color}22` }}>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                       style={{ background: color }}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="text-5xl font-black opacity-10" style={{ color }}>{step}</span>
                </div>
                <h3 className="font-black text-slate-800 text-base mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PARA EMPRESAS — SECCIÓN COMERCIAL
      ══════════════════════════════════════════════════════════ */}
      <div className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
                 style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <BarChart3 size={12} className="text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Para empresas</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
              Inteligencia operativa
              <br />
              <span style={{ background: 'linear-gradient(90deg,#60a5fa,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                para tu flota.
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Reduce tiempos muertos, optimiza rutas y toma decisiones basadas en datos reales del puerto —
              no en suposiciones.
            </p>
          </div>

          {/* Beneficios grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {[
              { icon: TrendingUp, color: '#34d399', title: 'Reduce tiempos muertos', desc: 'Tus operadores saben antes de llegar cuál zona está libre. Menos tiempo esperando = más viajes por día.' },
              { icon: BarChart3,  color: '#60a5fa', title: 'Dashboard empresarial',  desc: 'Monitorea el desempeño de tu flota en tiempo real. KPIs, historial y comparativos mensuales.' },
              { icon: Bell,       color: '#f59e0b', title: 'Alertas inteligentes',   desc: 'Recibe alertas automáticas por WhatsApp cuando hay congestión, cierres u operativos en las zonas que te interesan.' },
              { icon: Users,      color: '#a78bfa', title: 'Bolsa de trabajo',       desc: 'Publica vacantes y conecta con operadores calificados del puerto. Matching automático por perfil.' },
              { icon: Shield,     color: '#f87171', title: 'Información verificada', desc: 'Cada reporte es confirmado por la comunidad. Sistema de reputación que filtra información falsa.' },
              { icon: Smartphone, color: '#38bdf8', title: 'Funciona en móvil',      desc: 'Diseñada para el celular. Tus operadores la usan desde la cabina, sin apps adicionales.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="rounded-2xl p-5 transition-all hover:translate-y-[-2px]"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                     style={{ background: `${color}20` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Plan Gratuito */}
            <div className="rounded-3xl p-7"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Operadores</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-slate-400 text-sm mb-2">/ siempre</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Para operadores y transportistas individuales</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Ver estado de todas las zonas',
                  'Reportar en tiempo real',
                  'Acceso al mapa interactivo',
                  'Noticias y alertas del puerto',
                  'Directorio de empresas',
                  'Posturas de operadores',
                  'Ver vacantes disponibles',
                ].map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-white/10"
                style={{ border: '1.5px solid rgba(255,255,255,0.2)', color: 'white' }}>
                Registrarse gratis
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Plan Empresa */}
            <div className="rounded-3xl p-7 relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', border: '1px solid rgba(96,165,250,0.4)' }}>
              {/* Badge popular */}
              <div className="absolute top-5 right-5 flex items-center gap-1 px-3 py-1 rounded-full"
                   style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Star size={10} className="text-yellow-300 fill-yellow-300" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Más popular</span>
              </div>
              {/* Glow */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
                   style={{ background: '#60a5fa' }} />

              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Empresas</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$500</span>
                <span className="text-blue-200 text-sm mb-2">MXN / mes</span>
              </div>
              <p className="text-blue-200 text-sm mb-6">Para empresas transportistas, navieras y agencias</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Todo lo del plan gratuito',
                  'Publicar vacantes ilimitadas',
                  'Alertas por WhatsApp automáticas',
                  'Dashboard de tu flota',
                  'Historial de reportes por zona',
                  'Estadísticas de productividad',
                  'Soporte prioritario',
                ].map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-blue-100">
                    <CheckCircle2 size={14} className="text-green-300 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20el%20plan%20empresa%20de%20ConectManzanillo"
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 shadow-lg"
                   style={{ background: '#25D366' }}>
                  {WA_ICON}
                  Solicitar plan empresa
                </a>
                <Link to="/vacantes"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-xs text-blue-200 hover:text-white transition-all">
                  Ir al módulo de vacantes
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* CTA demo */}
          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm mb-4">¿Tienes dudas? Platícanos tu caso y te mostramos la plataforma en acción.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20agendar%20una%20demo%20de%20ConectManzanillo%20para%20mi%20empresa"
                 target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105"
                 style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {WA_ICON}
                Solicitar demo gratuita
              </a>
              <Link to="/empresa"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-blue-200 transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(96,165,250,0.3)' }}>
                Ver planes completos →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIOS / CASOS
      ══════════════════════════════════════════════════════════ */}
      <div className="py-20 px-4 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">Comunidad</p>
            <h2 className="text-3xl font-black text-slate-900">La comunidad portuaria ya está aquí</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: '"Antes llegaba al patio sin saber si había fila o no. Ahora veo en el celular antes de salir y ahorro hasta 2 horas por viaje."',
                name: 'Operador de camión', zone: 'Patio TEP · Manzanillo', avatar: '🚛',
              },
              {
                quote: '"Mis choferes reportan desde el camión. Ya no necesito llamarles para saber cómo está Contecon. La información llega sola."',
                name: 'Gerente de flota', zone: 'Empresa transportista', avatar: '🏢',
              },
              {
                quote: '"El canal de WhatsApp es lo primero que reviso en la mañana. Me avisa si hay operativos o cierres antes de que salga el camión."',
                name: 'Despachador logístico', zone: 'Terminal SSA · Manzanillo', avatar: '📋',
              },
            ].map(({ quote, name, zone, avatar }) => (
              <div key={name} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">{quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                       style={{ background: '#eff6ff' }}>
                    {avatar}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{name}</p>
                    <p className="text-slate-400 text-[10px]">{zone}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          COMUNIDAD WHATSAPP
      ══════════════════════════════════════════════════════════ */}
      <div id="whatsapp" className="py-16 px-4 bg-white border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                 style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
              {WA_ICON && <span style={{ color: '#16a34a' }}>{WA_ICON}</span>}
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
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#075E54' }}>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Canal oficial · Solo lectura</span>
                <span className="ml-auto text-[10px] text-green-200 font-semibold">📢 Avisos oficiales</span>
              </div>
              <div className="bg-white px-4 py-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-xl"
                     style={{ background: '#25D366' }}>📢</div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Canal ConectManzanillo</p>
                  <p className="text-xs text-slate-500">Cierres, avisos de aduana, operativos y noticias del puerto</p>
                </div>
              </div>
              <a href="https://wa.me/525566834948" target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#25D366' }}>
                {WA_ICON} UNIRME AL CANAL
              </a>
            </div>

            {/* Grupos */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#128C7E' }}>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Comunidad · Grupos activos</span>
                <span className="ml-auto text-[10px] text-green-200 font-semibold">💬 Participa</span>
              </div>
              <div className="bg-white px-4 py-3">
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
                 className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white hover:opacity-90 active:scale-[0.99]"
                 style={{ background: '#128C7E' }}>
                {WA_ICON} UNIRME A LOS GRUPOS
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BANNER ANÚNCIATE
      ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `url('/puerto-hero.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(4px) brightness(0.25)', transform: 'scale(1.05)',
          }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.9) 0%, rgba(37,99,235,0.92) 100%)' }} />

        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Megaphone size={12} className="text-blue-200" />
            <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">Publicidad</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-3 leading-tight">¡ANÚNCIATE AQUÍ!</h2>
          <p className="text-lg text-blue-100 mb-2 font-medium">Llega a cientos de transportistas del Puerto de Manzanillo</p>
          <p className="text-sm text-blue-200/70 mb-10 max-w-lg mx-auto">
            Tu empresa frente a los operadores que mueven la carga del puerto cada día. Planes desde $500 MXN/mes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20anunciarme%20en%20ConectManzanillo"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
              style={{ background: '#25D366' }}>
              {WA_ICON} WhatsApp
            </a>
            <a href="mailto:contacto@conectmanzanillo.com?subject=Quiero%20anunciarme"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-white hover:scale-105 active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}>
              <PhoneCall size={17} /> Contáctanos
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DONATIVOS
      ══════════════════════════════════════════════════════════ */}
      <div id="donativos" className="bg-white border-t border-slate-100 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-4">
              <span className="text-blue-600 text-sm">❤️</span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Apoya el proyecto</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3">Donativos</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              ConectManzanillo es un servicio <strong>gratuito</strong> para todos los operadores del puerto.
              Si te ha sido útil, considera apoyarnos para mantener los servidores y seguir mejorando la plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#003087' }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 1.81.752 3.285C17.081 10.55 14.65 12 11.5 12H9.97l-1.43 9H5.55L7.96 4.5h5.115c2.109 0 3.498.344 4.032 1.388z"/></svg>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">PayPal</h3>
              <p className="text-xs text-slate-500 mb-4">Pago seguro con tarjeta o cuenta PayPal</p>
              <a href="https://paypal.me/conectmanzanillo" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all"
                style={{ background: '#003087' }}>Donar con PayPal</a>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-green-600">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M4 10h3v7H4zm6.5-7h3v14h-3zm6.5 4h3v10h-3zM2 19h20v2H2z"/></svg>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Transferencia bancaria</h3>
              <p className="text-xs text-slate-500 mb-3">CLABE interbancaria</p>
              <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 mb-3">
                <p className="text-xs text-slate-400 mb-0.5">CLABE</p>
                <p className="font-mono font-bold text-slate-700 text-sm tracking-wider">000 000 0000 0000 00</p>
                <p className="text-xs text-slate-400 mt-1">A nombre de: ConectManzanillo</p>
              </div>
              <button onClick={() => navigator.clipboard.writeText('00000000000000000')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
                📋 Copiar CLABE
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 text-center hover:shadow-md transition-shadow bg-slate-50">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-red-600">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
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

          <div className="text-center py-6 px-6 rounded-2xl bg-blue-50 border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">
              🚛 Cada donativo ayuda a mantener el servicio activo para todos los transportistas del puerto.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          REDES SOCIALES
      ══════════════════════════════════════════════════════════ */}
      <div id="redes" className="py-14 px-4 border-t border-slate-100 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-1">Únete a la comunidad</h2>
            <p className="text-slate-500 text-sm">Síguenos para noticias, actualizaciones y avisos del puerto</p>
          </div>

          <div className="space-y-3">
            {[
              {
                header: '#1877F2', label: 'Grupo comunitario · Facebook', badge: '👥 Comunidad',
                title: 'Grupo Conect Manzanillo', desc: 'Comunidad de transportistas, empresas y ciudadanos del puerto',
                href: 'https://www.facebook.com/groups/conectmanzanillo', btnLabel: 'UNIRME AL GRUPO', btnBg: '#1877F2',
              },
              {
                header: '#0866FF', label: 'Página oficial · Facebook', badge: '🏴 Oficial',
                title: 'Conect Manzanillo Oficial', desc: 'Síguenos para noticias, actualizaciones y avisos oficiales',
                href: 'https://www.facebook.com/conectmanzanillo', btnLabel: 'SEGUIR PÁGINA', btnBg: '#0866FF',
              },
              {
                header: 'linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                label: 'Perfil oficial · Instagram', badge: '📸 Instagram',
                title: '@conectmanzanillo', desc: 'Fotos, videos y noticias del puerto en Instagram',
                href: 'https://www.instagram.com/conectmanzanillo', btnLabel: 'SEGUIR EN INSTAGRAM',
                btnBg: 'linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
              },
            ].map(({ header, label, badge, title, desc, href, btnLabel, btnBg }) => (
              <div key={title} className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex items-center gap-2" style={{ background: header }}>
                  <span className="text-white text-xs font-bold uppercase tracking-widest">{label}</span>
                  <span className="ml-auto text-[10px] font-semibold text-white/70">{badge}</span>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="font-bold text-slate-800 text-sm">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black text-white hover:opacity-90 active:scale-[0.99] transition-all"
                   style={{ background: btnBg }}>
                  {btnLabel}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
            <div>
              <img src="/logo.png" alt="ConectManzanillo" className="h-14 mb-3 opacity-90"
                   onError={e => { e.target.style.display='none' }} />
              <p className="text-slate-500 text-sm max-w-xs">
                La plataforma de inteligencia operativa del Puerto de Manzanillo, Colima.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              <Link to="/" className="text-slate-400 hover:text-white transition-colors">Puerto</Link>
              <Link to="/noticias" className="text-slate-400 hover:text-white transition-colors">Noticias</Link>
              <Link to="/directorio" className="text-slate-400 hover:text-white transition-colors">Directorio</Link>
              <Link to="/posturas" className="text-slate-400 hover:text-white transition-colors">Posturas</Link>
              <Link to="/vacantes" className="text-slate-400 hover:text-white transition-colors">Vacantes</Link>
              <Link to="/register" className="text-slate-400 hover:text-white transition-colors">Registrarse</Link>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2025 ConectManzanillo · Puerto de Manzanillo, Colima</p>
            <div className="flex gap-4">
              <a href="https://wa.me/525566834948" target="_blank" rel="noopener noreferrer"
                 className="text-green-500 hover:text-green-400 text-xs font-semibold transition-colors">WhatsApp</a>
              <a href="https://www.facebook.com/conectmanzanillo" target="_blank" rel="noopener noreferrer"
                 className="text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors">Facebook</a>
              <a href="https://www.instagram.com/conectmanzanillo" target="_blank" rel="noopener noreferrer"
                 className="text-pink-400 hover:text-pink-300 text-xs font-semibold transition-colors">Instagram</a>
              <a href="mailto:contacto@conectmanzanillo.com"
                 className="text-slate-400 hover:text-slate-300 text-xs transition-colors">Email</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
