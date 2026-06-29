import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart2, Users, Megaphone, CheckCircle2, Star, Zap, Eye,
  ShoppingCart, Shield, CreditCard, X, CheckCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

const PAQUETES = [
  {
    id: 'basico',
    nombre: 'Banner Básico',
    precio: 500,
    periodo: '/mes',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    features: [
      'Banner en página principal',
      'Visible en desktop y mobile',
      '~500 impresiones estimadas/mes',
      'Enlace a tu sitio web o WhatsApp',
      'Diseño incluido',
    ],
    desc: 'Ideal para talleres, refaccionarias y servicios al transporte.',
  },
  {
    id: 'zona',
    nombre: 'Patrocinador de Zona',
    precio: 1500,
    periodo: '/mes',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    features: [
      'Banner exclusivo en Directorio Empresarial',
      'Mención en el canal de WhatsApp',
      '~2,000 impresiones estimadas/mes',
      'Logo en reportes de la zona',
      'Reporte de métricas mensual',
    ],
    desc: 'Para agencias aduanales, importadores y transportistas especializados.',
    destacado: true,
  },
  {
    id: 'principal',
    nombre: 'Patrocinador Principal',
    precio: 3500,
    periodo: '/mes',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    features: [
      'Banner premium en posición #1',
      'Presencia en TODAS las páginas',
      'Mención diaria en canal WhatsApp',
      '~8,000 impresiones estimadas/mes',
      'Reporte semanal de métricas',
    ],
    desc: 'Para navieras, terminales, grupos logísticos y empresas con presencia fuerte en el puerto.',
  },
  {
    id: 'reporte',
    nombre: 'Reporte WA Patrocinado',
    precio: 5000,
    periodo: '/mes',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    features: [
      'Tu empresa al inicio del reporte matutino',
      'Mensaje patrocinado en cada reporte WA',
      'Exposición directa a todos los suscriptores',
      '10,000+ impresiones estimadas/mes',
      'Creatividad y copy incluidos',
      'Reportes quincenales de alcance',
    ],
    desc: 'Máxima visibilidad. Tu marca en el reporte que cientos de operadores leen cada mañana.',
  },
]

const UBICACIONES = [
  { nombre: 'Dashboard principal',       donde: 'Arriba del mapa del puerto',              impresiones: '~1,200/mes', tipo: 'Banner horizontal' },
  { nombre: 'Directorio Empresarial',    donde: 'Listado de empresas del puerto',           impresiones: '~800/mes',   tipo: 'Banner rotativo' },
  { nombre: 'Sección de noticias',       donde: 'Entre las noticias del puerto',            impresiones: '~600/mes',   tipo: 'Banner nativo' },
  { nombre: 'Bolsa de trabajo',          donde: 'Página de vacantes activas',               impresiones: '~400/mes',   tipo: 'Banner contextual' },
  { nombre: 'Reporte WhatsApp',          donde: 'Canal de WhatsApp ConectManzanillo',       impresiones: '~5,000/mes', tipo: 'Mensaje patrocinado' },
  { nombre: 'Global (todas las páginas)',donde: 'Aparece en todas las secciones',           impresiones: '~3,000/mes', tipo: 'Banner global' },
]

function ModalCheckout({ paquete, onClose }) {
  const [empresa, setEmpresa] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleComprar = async () => {
    if (!empresa.trim()) { setError('Escribe el nombre de tu empresa'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/pagos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquete: paquete.id, empresa_nombre: empresa, empresa_whatsapp: whatsapp }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Error al iniciar el pago')
        setLoading(false)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100"
             style={{ background: paquete.bg }}>
          <div>
            <p className="text-xs font-semibold text-gray-500">Comprando</p>
            <p className="font-black text-gray-900">{paquete.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xl font-black" style={{ color: paquete.color }}>
              ${paquete.precio.toLocaleString()}<span className="text-sm font-semibold text-gray-400">/mes</span>
            </p>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre de tu empresa *</label>
            <input
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Ej. Transportes del Puerto S.A."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp de contacto <span className="font-normal text-gray-400">(opcional)</span></label>
            <input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="5231400000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            onClick={handleComprar}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: loading ? '#9ca3af' : paquete.color }}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirigiendo a Stripe...
              </>
            ) : (
              <>
                <CreditCard size={15} />
                Pagar ${paquete.precio.toLocaleString()}/mes
              </>
            )}
          </button>

          {/* Stripe badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield size={11} />
            <span>Pago seguro con</span>
            <span className="font-black text-gray-600">Stripe</span>
            <span>· Cancela cuando quieras</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Anunciate() {
  const [searchParams] = useSearchParams()
  const [modalPaquete, setModalPaquete] = useState(null)

  const success  = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast de éxito */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold">
          <CheckCircle size={18} /> ¡Pago exitoso! Tu campaña será activada en breve.
        </div>
      )}
      {canceled && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-700 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold">
          <X size={16} /> Pago cancelado. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Megaphone size={12} className="text-blue-200" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Publicidad</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
            Llega a quienes<br />
            <span style={{ background: 'linear-gradient(90deg, #fde047, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              mueven el puerto.
            </span>
          </h1>
          <p className="text-blue-200 text-base mb-8 max-w-lg mx-auto">
            Tu empresa frente a cientos de operadores, transportistas, importadores y agentes aduanales
            que usan ConectManzanillo cada día.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
            {[
              { val: '+500', label: 'Operadores activos' },
              { val: 'Diario', label: 'Alcance canal WA' },
              { val: '100%', label: 'Puerto Manzanillo' },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                   style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-lg font-black text-white">{val}</p>
                <p className="text-[10px] text-blue-200">{label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => document.getElementById('paquetes').scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm bg-white text-blue-700 shadow-xl hover:scale-105 active:scale-95 transition-all">
            <ShoppingCart size={16} /> Ver paquetes y precios
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Por qué anunciarse */}
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Por qué elegir ConectManzanillo</p>
          <h2 className="text-xl font-black text-slate-800 text-center mb-5">Audiencia 100% portuaria</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Users,    color: '#3b82f6', title: 'Audiencia específica',  desc: 'Solo personas del ecosistema portuario de Manzanillo. Sin ruido.' },
              { icon: Eye,      color: '#10b981', title: 'Alta frecuencia',       desc: 'Los operadores consultan la plataforma varias veces al día.' },
              { icon: Zap,      color: '#f59e0b', title: 'Contexto relevante',    desc: 'Tu anuncio aparece cuando el usuario está pensando en el puerto.' },
              { icon: Megaphone,color: '#8b5cf6', title: 'Canal WhatsApp',        desc: 'Mención en el canal que cientos de operadores leen cada mañana.' },
              { icon: BarChart2,color: '#dc2626', title: 'Métricas reales',       desc: 'Dashboard con impresiones, clics y estadísticas en tiempo real.' },
              { icon: Star,     color: '#d97706', title: 'Activación inmediata',  desc: 'Tu campaña queda activa al instante después del pago.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                     style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <p className="text-xs font-black text-slate-800 mb-1">{title}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Paquetes */}
        <div id="paquetes">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Paquetes de publicidad</p>
          <h2 className="text-xl font-black text-slate-800 text-center mb-2">Elige tu nivel de visibilidad</h2>
          <p className="text-center text-sm text-slate-500 mb-5">Suscripción mensual · Cancela cuando quieras · Pago seguro con Stripe</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PAQUETES.map(paq => (
              <div key={paq.id}
                   className={`rounded-2xl p-5 border-2 flex flex-col ${paq.destacado ? 'ring-2 ring-purple-300 shadow-lg' : ''}`}
                   style={{ background: paq.bg, borderColor: paq.border }}>
                {paq.destacado && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={10} className="text-purple-500 fill-purple-500" />
                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Más vendido</span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: paq.color }}>{paq.nombre}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{paq.desc}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xl font-black text-slate-800">${paq.precio.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{paq.periodo}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {paq.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <CheckCircle2 size={11} className="shrink-0 mt-0.5" style={{ color: paq.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setModalPaquete(paq)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-xs text-white transition-all hover:opacity-90 active:scale-95 mt-auto"
                  style={{ background: paq.color }}>
                  <ShoppingCart size={13} /> Comprar ahora
                </button>
              </div>
            ))}
          </div>
          {/* Stripe trust badge */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <Shield size={12} />
            <span>Pago seguro y encriptado con</span>
            <span className="font-black text-slate-600">Stripe</span>
            <span>· No guardamos datos de tarjeta</span>
          </div>
        </div>

        {/* Ubicaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-black text-slate-800">Dónde aparece tu anuncio</p>
            <p className="text-xs text-slate-400">Zonas disponibles en la plataforma</p>
          </div>
          <div className="divide-y divide-slate-50">
            {UBICACIONES.map(u => (
              <div key={u.nombre} className="px-5 py-3.5 flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{u.nombre}</p>
                  <p className="text-[11px] text-slate-500">{u.donde}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs font-black text-slate-700">{u.impresiones}</p>
                  <p className="text-[9px] text-slate-400">{u.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proceso */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-black text-slate-800 mb-4">¿Cómo funciona?</p>
          <div className="space-y-3">
            {[
              { paso: '01', label: 'Elige tu paquete',         desc: 'Selecciona el plan que mejor se adapte a tu presupuesto y objetivo.' },
              { paso: '02', label: 'Pago seguro con Stripe',   desc: 'Ingresa los datos de tu tarjeta en la plataforma segura de Stripe.' },
              { paso: '03', label: 'Campaña activa al instante',desc: 'Tu banner queda visible en la plataforma inmediatamente.' },
              { paso: '04', label: 'Métricas en tiempo real',  desc: 'Seguimiento de impresiones, clics y estadísticas de tu campaña.' },
            ].map(({ paso, label, desc }) => (
              <div key={paso} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black text-white"
                     style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  {paso}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="rounded-2xl p-6 text-center"
             style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', border: '1px solid rgba(96,165,250,0.3)' }}>
          <p className="text-white font-black text-lg mb-1">¿Listo para anunciarte?</p>
          <p className="text-blue-200 text-sm mb-5">
            Elige tu paquete y ten tu anuncio activo al instante.
          </p>
          <button
            onClick={() => document.getElementById('paquetes').scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm bg-white text-blue-700 shadow-xl hover:scale-105 active:scale-95 transition-all">
            <ShoppingCart size={16} /> Elegir paquete
          </button>
          <p className="text-[11px] text-blue-300 mt-3">Suscripción mensual · Cancela cuando quieras</p>
        </div>
      </div>

      {/* Modal checkout */}
      {modalPaquete && (
        <ModalCheckout
          paquete={modalPaquete}
          onClose={() => setModalPaquete(null)}
        />
      )}
    </div>
  )
}
