import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, DollarSign, BarChart2,
  CheckCircle2, ArrowRight, Zap, Star,
  Smartphone, PhoneCall,
} from 'lucide-react'
import { api } from '../lib/api.js'

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

/* ─── Calculadora de costos ───────────────────────────────── */
function Calculadora() {
  const [form, setForm] = useState({
    unidades: 10,
    costoPorHora: 500,
    horasEspera: 2.5,
    diasMes: 22,
  })
  const [result, setResult] = useState(null)

  const calcular = () => {
    const { unidades, costoPorHora, horasEspera, diasMes } = form
    const diario = unidades * costoPorHora * horasEspera
    const mensual = diario * diasMes
    const anual = mensual * 12
    const ahorro20 = mensual * 0.20
    const ahorro35 = mensual * 0.35
    setResult({ diario, mensual, anual, ahorro20, ahorro35 })
  }

  const fmt = (n) => `$${Math.round(n).toLocaleString()} MXN`

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100"
           style={{ background: 'linear-gradient(135deg, #1e3a8a08, #3b82f608)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
            <DollarSign size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">Calculadora de costo por espera</p>
            <p className="text-[11px] text-slate-400">¿Cuánto le cuesta esperar al puerto a tu empresa?</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'unidades',     label: 'Unidades en operación',        suffix: 'unidades', min: 1,    max: 500 },
            { key: 'costoPorHora', label: 'Costo por hora detenida',      suffix: 'MXN/hr',  min: 100,  max: 5000 },
            { key: 'horasEspera',  label: 'Horas de espera promedio/día', suffix: 'horas',   min: 0.5,  max: 12, step: 0.5 },
            { key: 'diasMes',      label: 'Días operativos al mes',       suffix: 'días',    min: 1,    max: 31 },
          ].map(({ key, label, suffix, min, max, step = 1 }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={form[key]}
                  min={min} max={max} step={step}
                  onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={calcular}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
          style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
          Calcular costo
        </button>

        {result && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Costo diario', val: result.diario, color: '#f59e0b' },
                { label: 'Costo mensual', val: result.mensual, color: '#dc2626' },
                { label: 'Costo anual', val: result.anual, color: '#7c3aed' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-2xl p-3 text-center border"
                     style={{ background: `${color}0d`, borderColor: `${color}33` }}>
                  <p className="text-xs font-black" style={{ color }}>{fmt(val)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4 border"
                 style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderColor: '#86efac' }}>
              <p className="text-xs font-black text-green-700 mb-3 flex items-center gap-1.5">
                <TrendingDown size={12} /> Ahorro potencial con ConectManzanillo
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                  <p className="text-base font-black text-green-600">{fmt(result.ahorro20)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reduciendo 20% tiempos</p>
                  <p className="text-[9px] text-slate-400">al mes</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                  <p className="text-base font-black text-green-700">{fmt(result.ahorro35)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reduciendo 35% tiempos</p>
                  <p className="text-[9px] text-slate-400">al mes</p>
                </div>
              </div>
              <p className="text-[10px] text-green-600 mt-3 text-center font-medium">
                💡 Operadores con alertas y predicción IA reducen hasta 35% los tiempos muertos
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── WhatsApp Report Mockup ─────────────────────────────── */
function WhatsAppMockup() {
  const now = new Date()
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mazatlan' })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-green-500">
            {WA_ICON && <span className="text-white">{WA_ICON}</span>}
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">Reportes automáticos WhatsApp</p>
            <p className="text-[11px] text-slate-400">Recibe el estado del puerto en tu celular cada mañana</p>
          </div>
        </div>
      </div>

      {/* Mockup WhatsApp */}
      <div className="p-4">
        <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-sm mx-auto"
             style={{ background: '#ECE5DD' }}>
          {/* Header WA */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#075E54' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                 style={{ background: '#25D366' }}>🚢</div>
            <div>
              <p className="text-white text-sm font-bold">ConectManzanillo</p>
              <p className="text-green-200 text-[10px]">Reporte automático · {hora}</p>
            </div>
          </div>

          {/* Mensajes */}
          <div className="p-3 space-y-2.5">
            <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm">
              <p className="text-[11px] font-black text-green-700 mb-1.5">📊 REPORTE MATUTINO — Puerto Manzanillo</p>
              <div className="space-y-1 text-[11px] text-slate-700">
                <p>🟢 <strong>SSA Manzanillo:</strong> Libre · 8 min</p>
                <p>🔴 <strong>ICTSI:</strong> Saturado · evitar 1-2 hr</p>
                <p>🟡 <strong>Aduana:</strong> Moderado · 35 min</p>
                <p>🟢 <strong>Patio TEP:</strong> Libre · sin espera</p>
                <p>🔴 <strong>Puerta Acceso:</strong> Saturado · 60+ min</p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] text-blue-700 font-bold">
                  🤖 IA recomienda: Ingresar antes de las 10:30 AM o esperar hasta 13:00 h
                </p>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 text-right">8:00 ✓✓</p>
            </div>

            <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm">
              <p className="text-[11px] font-black text-red-600 mb-1">⚠️ ALERTA CRÍTICA</p>
              <p className="text-[11px] text-slate-700">
                Puerta de acceso <strong>cerrada temporalmente</strong> por operativo aduanal.
                Retraso estimado: 45-60 min
              </p>
              <p className="text-[9px] text-slate-400 mt-1.5 text-right">9:15 ✓✓</p>
            </div>

            <div className="bg-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm">
              <p className="text-[11px] text-slate-700">
                📋 <strong>Resumen del día:</strong><br />
                Mejor hora de ingreso: 12:00-14:00 🟢<br />
                Zona más eficiente: SSA Terminal<br />
                Hora pico máxima: 07:30-09:30 🔴
              </p>
              <p className="text-[9px] text-slate-400 mt-1.5 text-right">18:00 ✓✓</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20activar%20reportes%20automáticos%20de%20ConectManzanillo"
             target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
             style={{ background: '#25D366' }}>
            {WA_ICON} Activar reporte diario
          </a>
          <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20activar%20alertas%20críticas%20de%20ConectManzanillo"
             target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm transition-all border border-green-200 text-green-700 hover:bg-green-50">
            {WA_ICON} Activar alertas críticas
          </a>
        </div>
      </div>
    </div>
  )
}

/* ─── Paquetes de publicidad ──────────────────────────────── */
const PAQUETES_PUBLICIDAD = [
  {
    nombre: 'Banner en el Portal',
    precio: '$500',
    periodo: '/mes',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    impresiones: '~800 impresiones/mes',
    features: [
      'Banner visible en la página principal',
      'Aparece en desktop y celular',
      'Enlace directo a tu sitio o WhatsApp',
      'Diseño incluido sin costo',
      'Reporte mensual de clics',
    ],
    ideal: 'Talleres, refaccionarias, servicios al transporte',
    cta: 'Solicitar banner',
    wa: 'Hola, quiero cotizar el paquete Banner en el Portal ($500/mes) en ConectManzanillo',
    destacado: false,
  },
  {
    nombre: 'Patrocinador de Zona',
    precio: '$1,500',
    periodo: '/mes',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    impresiones: '~2,500 impresiones/mes',
    features: [
      'Banner exclusivo en una zona del puerto',
      'Mención en el canal de WhatsApp',
      'Tu logo en los reportes de esa zona',
      'Integrado con las alertas de la zona',
      'Reporte quincenal de métricas',
      'Diseño incluido',
    ],
    ideal: 'Agencias aduanales, importadores/exportadores, terminales',
    cta: 'Solicitar patrocinio',
    wa: 'Hola, quiero cotizar el paquete Patrocinador de Zona ($1,500/mes) en ConectManzanillo',
    destacado: true,
  },
  {
    nombre: 'Patrocinador Principal',
    precio: '$3,500',
    periodo: '/mes',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    impresiones: '~10,000 impresiones/mes',
    features: [
      'Banner #1 en todas las páginas del portal',
      'Mención diaria en el canal de WhatsApp',
      'Logo incluido en reportes automáticos WA',
      'Presencia en módulo de noticias',
      'Reporte semanal de alcance y clics',
      'Llamada mensual de resultados',
      'Diseño y copy incluidos',
    ],
    ideal: 'Navieras, grupos logísticos, terminales, empresas con alta presencia en el puerto',
    cta: 'Solicitar patrocinio principal',
    wa: 'Hola, quiero cotizar el paquete Patrocinador Principal ($3,500/mes) en ConectManzanillo',
    destacado: false,
  },
]

/* ─── Página ──────────────────────────────────────────────── */
export default function Empresa() {
  const [tab, setTab] = useState('dashboard')

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: api.getSections,
    staleTime: 60_000,
  })

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'costos',    label: 'Costos',    icon: DollarSign },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: Smartphone },
    { id: 'planes',    label: 'Planes',    icon: Star },
  ]

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero empresarial */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Building2 size={22} className="text-blue-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
                   style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Para Empresas</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">
                Inteligencia operativa<br />
                <span style={{ background: 'linear-gradient(90deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  para tu flota portuaria.
                </span>
              </h1>
              <p className="text-slate-400 text-sm">
                Cada hora detenida cuesta dinero. Convierte reportes de campo en decisiones operativas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Reducción en tiempos', val: '↓35%', color: '#34d399' },
              { label: 'Ahorro promedio mensual', val: '$28K', color: '#60a5fa' },
              { label: 'Operadores en red', val: '+500', color: '#f59e0b' },
              { label: 'Zonas monitoreadas', val: '8 zonas', color: '#a78bfa' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-black" style={{ color }}>{val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto scrollbar-none border-t border-white/10">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── DASHBOARD ───────────────────────────────────── */}
        {tab === 'dashboard' && (
          <>
            {/* Estado actual del puerto */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <BarChart2 size={14} className="text-blue-500" />
                  Estado actual del puerto
                </p>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  En tiempo real
                </span>
              </div>
              <div className="space-y-2">
                {sections.slice(0, 6).map(s => {
                  const colors = { free: '#16a34a', moderate: '#ca8a04', congested: '#dc2626', closed: '#475569', unknown: '#94a3b8' }
                  const labels = { free: '🟢 Libre', moderate: '🟡 Moderado', congested: '🔴 Saturado', closed: '⚫ Cerrado', unknown: '⚪ Sin datos' }
                  const ests = { free: '5-15 min', moderate: '20-45 min', congested: '45+ min', closed: 'Cerrado', unknown: 'N/D' }
                  const c = colors[s.status] || '#94a3b8'
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                      <span className="flex-1 text-sm font-semibold text-slate-700">{s.name}</span>
                      <span className="text-[10px] font-bold" style={{ color: c }}>{labels[s.status] || '⚪'}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{ests[s.status] || 'N/D'}</span>
                      <span className="text-[10px] text-slate-300">{s.active_reports || 0} rep.</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA Activar plan */}
            <div className="rounded-2xl p-5 text-center"
                 style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', border: '1px solid rgba(96,165,250,0.3)' }}>
              <p className="text-white font-black text-base mb-1">Activa el dashboard empresarial real</p>
              <p className="text-blue-200 text-sm mb-4">
                Conecta tu empresa y obtén KPIs reales de tu flota, alertas personalizadas y reportes WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20activar%20el%20dashboard%20empresarial%20de%20ConectManzanillo"
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white"
                   style={{ background: '#25D366' }}>
                  {WA_ICON} Solicitar activación
                </a>
                <button onClick={() => setTab('planes')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-blue-200 border border-blue-400/40 hover:bg-white/10 transition-all">
                  Ver planes <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── COSTOS ──────────────────────────────────────── */}
        {tab === 'costos' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800 mb-1">El costo oculto del tiempo muerto portuario</p>
              <p className="text-xs text-slate-500 mb-4">
                Los tiempos de espera en el puerto no son solo pérdida de tiempo —
                son pérdida directa de dinero operativo. Cada hora detenida cuesta:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { tipo: 'Tractocamión estándar', costo: '$400-600', desc: 'por hora detenida' },
                  { tipo: 'Unidad especializada', costo: '$600-900', desc: 'por hora detenida' },
                  { tipo: 'Flota de 10 unidades', costo: '$4,000+', desc: 'por hora detenida' },
                ].map(({ tipo, costo, desc }) => (
                  <div key={tipo} className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-base font-black text-red-600">{costo}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{tipo}</p>
                  </div>
                ))}
              </div>
            </div>

            <Calculadora />

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-blue-500" />
                Exportar análisis de costos
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Genera un reporte ejecutivo de tus costos por espera para presentar a dirección o clientes.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all opacity-60 cursor-not-allowed">
                  <Download size={14} />
                  Exportar PDF
                  <span className="text-[9px] text-slate-400">(Plan Empresa)</span>
                </button>
                <button
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all opacity-60 cursor-not-allowed">
                  <Download size={14} />
                  Exportar Excel
                  <span className="text-[9px] text-slate-400">(Plan Empresa)</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-300 text-center mt-2">
                Disponible en plan Empresa Pro y superior
              </p>
            </div>
          </div>
        )}

        {/* ── WHATSAPP ────────────────────────────────────── */}
        {tab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-slate-800 mb-1">Alertas inteligentes configurables</p>
              <p className="text-xs text-slate-400 mb-4">Recibe notificaciones exactamente cuando las necesitas</p>
              <div className="space-y-2">
                {[
                  { label: 'Reporte matutino 8:00 AM', desc: 'Estado de todas las zonas al inicio del día', active: true },
                  { label: 'Alertas de saturación crítica', desc: 'Cuando una zona pasa a rojo (>45 min)', active: true },
                  { label: 'Aviso de apertura de zona cerrada', desc: 'Cuando un patio o terminal reabre', active: false },
                  { label: 'Resumen vespertino 6:00 PM', desc: 'Reporte de cierre del día', active: false },
                  { label: 'Alerta de operativo aduanal', desc: 'Cuando se detecta operativo en la comunidad', active: true },
                  { label: 'Predicción del día siguiente', desc: 'Pronóstico de congestión para mañana (7 PM)', active: false },
                ].map(({ label, desc, active }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className={`w-4 h-4 rounded-full shrink-0 border-2 ${active ? 'bg-green-400 border-green-400' : 'bg-white border-slate-300'}`} />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-700">{label}</p>
                      <p className="text-[10px] text-slate-400">{desc}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-300 text-center mt-3">
                La configuración real está disponible con plan activo
              </p>
            </div>

            <WhatsAppMockup />
          </div>
        )}

        {/* ── PLANES / PUBLICIDAD ─────────────────────────── */}
        {tab === 'planes' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Publicidad en el portal</p>
              <h2 className="text-xl font-black text-slate-800 mb-1">Llega a los operadores del puerto</h2>
              <p className="text-xs text-slate-500">El uso del portal es <strong>gratuito</strong> · Solo se cobran espacios publicitarios y publicación de vacantes ($500/mes)</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {PAQUETES_PUBLICIDAD.map(paq => (
                <div key={paq.nombre}
                     className={`rounded-3xl p-5 relative overflow-hidden border ${paq.destacado ? 'shadow-lg' : 'bg-white'}`}
                     style={paq.destacado
                       ? { background: `linear-gradient(135deg, ${paq.color}, ${paq.color}cc)`, borderColor: paq.border }
                       : { borderColor: paq.border, background: paq.bg }}>

                  {paq.destacado && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
                         style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <Star size={9} className="text-yellow-200 fill-yellow-200" />
                      <span className="text-[9px] font-black text-white">MÁS SOLICITADO</span>
                    </div>
                  )}

                  <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                     style={{ color: paq.destacado ? 'rgba(255,255,255,0.7)' : paq.color }}>
                    {paq.nombre}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-black" style={{ color: paq.destacado ? 'white' : paq.color }}>
                      {paq.precio}
                    </span>
                    <span className="text-xs mb-1" style={{ color: paq.destacado ? 'rgba(255,255,255,0.65)' : '#94a3b8' }}>
                      {paq.periodo}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold mb-4" style={{ color: paq.destacado ? 'rgba(255,255,255,0.8)' : paq.color }}>
                    {paq.impresiones}
                  </p>

                  <ul className="space-y-2 mb-4">
                    {paq.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs"
                          style={{ color: paq.destacado ? 'rgba(255,255,255,0.9)' : '#475569' }}>
                        <CheckCircle2 size={12} className="shrink-0 mt-0.5"
                          style={{ color: paq.destacado ? 'rgba(255,255,255,0.8)' : paq.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[10px] italic mb-4" style={{ color: paq.destacado ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
                    Ideal para: {paq.ideal}
                  </p>

                  <a href={`https://wa.me/525566834948?text=${encodeURIComponent(paq.wa)}`}
                     target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl font-bold text-xs transition-all hover:opacity-90 shadow-sm"
                     style={paq.destacado
                       ? { background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.35)' }
                       : { background: '#25D366', color: 'white' }}>
                    {WA_ICON} {paq.cta}
                  </a>
                </div>
              ))}
            </div>

            {/* Nota vacantes */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-lg">📌</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-0.5">¿Buscas publicar vacantes?</p>
                <p className="text-xs text-amber-700">La publicación de ofertas de trabajo tiene un costo de <strong>$500 MXN/mes</strong> por vacante activa. Puedes activarlo desde la sección <strong>Vacantes</strong> del portal.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
