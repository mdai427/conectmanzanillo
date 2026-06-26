import { BarChart2, Users, Megaphone, CheckCircle2, Star, Zap, Eye, Phone } from 'lucide-react'

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const PAQUETES = [
  {
    nombre: 'Banner Básico',
    precio: '$500',
    periodo: '/mes',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    features: [
      'Banner en página principal',
      'Visible en desktop y mobile',
      'Hasta 500 impresiones estimadas/mes',
      'Enlace a tu sitio web',
      'Diseño incluido',
    ],
    desc: 'Ideal para talleres mecánicos, refaccionarias y servicios relacionados al transporte.',
    cta: 'Solicitar banner básico',
  },
  {
    nombre: 'Patrocinador de Zona',
    precio: '$1,500',
    periodo: '/mes',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    features: [
      'Banner exclusivo en una zona del puerto',
      'Mención en el canal de WhatsApp',
      'Hasta 2,000 impresiones estimadas/mes',
      'Logo en reportes de la zona',
      'Integración con alertas de la zona',
      'Reporte de métricas mensual',
    ],
    desc: 'Para agencias aduanales, importadores/exportadores y transportistas especializados en una terminal.',
    cta: 'Solicitar patrocinio de zona',
    destacado: true,
  },
  {
    nombre: 'Patrocinador Principal',
    precio: '$3,500',
    periodo: '/mes',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    features: [
      'Banner premium en posición #1',
      'Logo en TODAS las páginas',
      'Mención diaria en canal WhatsApp',
      'Hasta 8,000 impresiones estimadas/mes',
      'Banner en reportes automáticos WA',
      'Reporte semanal de métricas',
      'Llamada mensual de resultados',
    ],
    desc: 'Para navieras, terminales, grupos logísticos y empresas con presencia fuerte en el puerto.',
    cta: 'Solicitar patrocinio principal',
  },
  {
    nombre: 'Reporte WA Patrocinado',
    precio: '$5,000',
    periodo: '/mes',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    features: [
      'Tu empresa al inicio del reporte matutino',
      'Mensaje patrocinado cada reporte WA',
      'Exposición directa a todos los suscriptores',
      '10,000+ impresiones estimadas/mes',
      'Creatividad y copy incluidos',
      'Reportes quincenales de alcance',
      'Posicionamiento premium de marca',
    ],
    desc: 'Máxima visibilidad. Tu marca en el reporte diario que cientos de operadores leen cada mañana.',
    cta: 'Solicitar reporte patrocinado',
  },
]

const UBICACIONES = [
  { nombre: 'Dashboard principal', donde: 'Arriba del mapa del puerto', impresiones: '~1,200/mes', tipo: 'Banner horizontal' },
  { nombre: 'Sidebar desktop', donde: 'Columna derecha de la vista principal', impresiones: '~900/mes', tipo: 'Banner cuadrado' },
  { nombre: 'Reporte WhatsApp', donde: 'Canal de WhatsApp ConectManzanillo', impresiones: '~5,000/mes', tipo: 'Mensaje patrocinado' },
  { nombre: 'Sección de noticias', donde: 'Entre las noticias del puerto', impresiones: '~600/mes', tipo: 'Banner nativo' },
  { nombre: 'Directorio empresarial', donde: 'Listado destacado en directorio', impresiones: '~400/mes', tipo: 'Listado premium' },
  { nombre: 'Zona específica del puerto', donde: 'Página de la terminal o patio', impresiones: '~300/mes', tipo: 'Banner contextual' },
]

export default function Anunciate() {
  return (
    <div className="min-h-screen bg-slate-50">

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

          <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20anunciarme%20en%20ConectManzanillo"
             target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
             style={{ background: '#25D366' }}>
            {WA_ICON} Solicitar información
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Por qué anunciarse */}
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Por qué elegir ConectManzanillo</p>
          <h2 className="text-xl font-black text-slate-800 text-center mb-5">Audiencia 100% portuaria</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Users,    color: '#3b82f6', title: 'Audiencia específica', desc: 'Solo personas del ecosistema portuario de Manzanillo. Sin ruido.' },
              { icon: Eye,      color: '#10b981', title: 'Alta frecuencia',      desc: 'Los operadores consultan la plataforma varias veces al día.' },
              { icon: Zap,      color: '#f59e0b', title: 'Contexto relevante',   desc: 'Tu anuncio aparece cuando el usuario está pensando en el puerto.' },
              { icon: Phone,    color: '#8b5cf6', title: 'Canal WhatsApp',       desc: 'Mención en el canal que cientos de operadores leen cada mañana.' },
              { icon: BarChart2,color: '#dc2626', title: 'Métricas reales',      desc: 'Reportes de impresiones, clics y alcance mensual.' },
              { icon: Star,     color: '#d97706', title: 'Formatos flexibles',   desc: 'Banners, mensajes patrocinados, listados premium y más.' },
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
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Paquetes de publicidad</p>
          <h2 className="text-xl font-black text-slate-800 text-center mb-5">Elige tu nivel de visibilidad</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PAQUETES.map(paq => (
              <div key={paq.nombre}
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
                    <p className="text-xl font-black text-slate-800">{paq.precio}</p>
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
                <a href={`https://wa.me/525566834948?text=${encodeURIComponent(`Hola, quiero cotizar el paquete "${paq.nombre}" de publicidad en ConectManzanillo`)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl font-bold text-xs text-white transition-all hover:opacity-90 mt-auto"
                   style={{ background: paq.color }}>
                  {WA_ICON} {paq.cta}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Ubicaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-black text-slate-800">Ubicaciones disponibles</p>
            <p className="text-xs text-slate-400">Dónde puede aparecer tu anuncio</p>
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
              { paso: '01', label: 'Contáctanos por WhatsApp', desc: 'Dinos tu empresa, objetivo y presupuesto disponible.' },
              { paso: '02', label: 'Elegimos el paquete',      desc: 'Te asesoramos para elegir el formato y ubicación más efectivos.' },
              { paso: '03', label: 'Diseño y activación',      desc: 'Diseño incluido. Tu anuncio queda activo en 48 horas.' },
              { paso: '04', label: 'Reportes mensuales',       desc: 'Recibes métricas de alcance, impresiones y clics cada mes.' },
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
            Contáctanos ahora y ten tu anuncio activo antes de 48 horas.
          </p>
          <a href="https://wa.me/525566834948?text=Hola%2C%20quiero%20anunciarme%20en%20ConectManzanillo"
             target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-white shadow-xl hover:scale-105 transition-all"
             style={{ background: '#25D366' }}>
            {WA_ICON} Solicitar por WhatsApp
          </a>
          <p className="text-[11px] text-blue-300 mt-3">Sin compromisos · Respuesta en menos de 24 horas</p>
        </div>
      </div>
    </div>
  )
}
