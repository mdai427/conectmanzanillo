import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Zap, CheckCircle2, AlertTriangle, Clock, Navigation, ChevronRight } from 'lucide-react'

const PATRON = {
  0:'free',1:'free',2:'free',3:'free',4:'moderate',5:'moderate',
  6:'congested',7:'congested',8:'congested',9:'moderate',10:'moderate',11:'moderate',
  12:'free',13:'free',14:'moderate',15:'moderate',16:'congested',17:'congested',
  18:'moderate',19:'moderate',20:'free',21:'free',22:'free',23:'free',
}

const STATUS_LABEL = { free:'Libre', moderate:'Moderado', congested:'Saturado', closed:'Cerrado', unknown:'Sin datos' }

function getRecomendacion(sections, hora) {
  const total = sections.length || 1
  const libres    = sections.filter(s => s.status === 'free').length
  const moderados = sections.filter(s => s.status === 'moderate').length
  const saturados = sections.filter(s => s.status === 'congested').length
  const librePct  = Math.round((libres / total) * 100)
  const satPct    = Math.round((saturados / total) * 100)

  // Estado general
  let estadoGeneral, estadoColor, estadoIcon
  if (satPct >= 60) {
    estadoGeneral = 'Puerto con alta congestión'
    estadoColor = '#dc2626'
    estadoIcon = '🔴'
  } else if (satPct >= 30 || moderados >= total * 0.5) {
    estadoGeneral = 'Puerto con tráfico moderado'
    estadoColor = '#d97706'
    estadoIcon = '🟡'
  } else if (librePct >= 60) {
    estadoGeneral = 'Puerto con buenas condiciones'
    estadoColor = '#16a34a'
    estadoIcon = '🟢'
  } else {
    estadoGeneral = 'Puerto con tráfico variable'
    estadoColor = '#2563eb'
    estadoIcon = '🔵'
  }

  // Recomendación por hora del día
  let recomendacion, mejorHora
  if (hora >= 6 && hora < 10) {
    recomendacion = 'Hora pico matutina. Si no es urgente, considera esperar hasta las 10:30 AM o ingresar antes de las 6:30 AM.'
    mejorHora = '12:00–14:00 (mejor opción hoy)'
  } else if (hora >= 10 && hora < 12) {
    recomendacion = 'Congestión disminuyendo. Buen momento para ingresar, especialmente a SSA y ICTSI.'
    mejorHora = 'Ahora o 12:00–14:00'
  } else if (hora >= 12 && hora < 14) {
    recomendacion = 'Horario óptimo. Menor congestión del día. Excelente momento para ingresar.'
    mejorHora = '✓ Ahora (mejor horario)'
  } else if (hora >= 14 && hora < 16) {
    recomendacion = 'Congestión moderada creciente. Ingresa pronto o espera hasta después de las 18:00.'
    mejorHora = 'Antes de 15:30 o después de 18:30'
  } else if (hora >= 16 && hora < 19) {
    recomendacion = 'Hora pico vespertina. Alta saturación esperada. Se recomienda esperar hasta después de las 18:30.'
    mejorHora = 'Después de 18:30'
  } else if (hora >= 19 && hora < 22) {
    recomendacion = 'Tráfico disminuyendo. Buen momento para ingresar con menos espera.'
    mejorHora = 'Ahora o mañana 12:00–14:00'
  } else {
    recomendacion = 'Operación nocturna. Menor congestión pero verifica disponibilidad de cada terminal.'
    mejorHora = 'Ahora (madrugada tranquila)'
  }

  // Zona más libre
  const zonaLibre = sections.find(s => s.status === 'free')
  const zonaCrit  = sections.find(s => s.status === 'congested')

  return {
    estadoGeneral, estadoColor, estadoIcon,
    recomendacion, mejorHora,
    librePct, satPct,
    zonaLibre, zonaCrit,
    libres, moderados, saturados, total,
    hasData: sections.some(s => s.active_reports > 0),
  }
}

export default function EstadoInteligente({ sections = [] }) {
  const hora = new Date().getHours()
  const info = useMemo(() => getRecomendacion(sections, hora), [sections, hora])

  const { estadoGeneral, estadoColor, estadoIcon, recomendacion, mejorHora,
          librePct, satPct, zonaLibre, zonaCrit, libres, moderados, saturados,
          total, hasData } = info

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100"
           style={{ background: 'linear-gradient(135deg, #f8fafc, #eff6ff)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
          <Zap size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-800">Estado inteligente del puerto</p>
          <p className="text-[10px] text-slate-400">
            {hasData ? 'Datos de la comunidad + IA' : 'Estimación por patrón horario'}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-white"
              style={{ background: estadoColor }}>
          {estadoIcon} {hasData ? 'EN VIVO' : 'ESTIMADO'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Estado general */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{estadoIcon}</span>
          <div>
            <p className="text-base font-black" style={{ color: estadoColor }}>{estadoGeneral}</p>
            <p className="text-[10px] text-slate-400">
              {libres} zona{libres !== 1 ? 's' : ''} libre{libres !== 1 ? 's' : ''} · {moderados} moderada{moderados !== 1 ? 's' : ''} · {saturados} saturada{saturados !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Barra distribución */}
        <div className="h-2.5 rounded-full overflow-hidden flex gap-px">
          {libres > 0 && (
            <div className="h-full rounded-l-full transition-all"
                 style={{ width: `${Math.round((libres/total)*100)}%`, background: '#22c55e' }} />
          )}
          {moderados > 0 && (
            <div className="h-full transition-all"
                 style={{ width: `${Math.round((moderados/total)*100)}%`, background: '#f59e0b' }} />
          )}
          {saturados > 0 && (
            <div className="h-full rounded-r-full transition-all"
                 style={{ width: `${Math.round((saturados/total)*100)}%`, background: '#ef4444' }} />
          )}
        </div>

        {/* Zonas destacadas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2 border"
               style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
            <p className="text-[9px] text-green-600 font-black uppercase tracking-wide mb-0.5">Mejor opción ahora</p>
            {zonaLibre ? (
              <p className="text-xs font-bold text-slate-800 truncate">{zonaLibre.name}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">Consulta el mapa</p>
            )}
            <p className="text-[10px] text-green-600">🟢 Libre · 5-15 min</p>
          </div>
          <div className="rounded-xl px-3 py-2 border"
               style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <p className="text-[9px] text-red-600 font-black uppercase tracking-wide mb-0.5">Zona a monitorear</p>
            {zonaCrit ? (
              <p className="text-xs font-bold text-slate-800 truncate">{zonaCrit.name}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">Sin saturación</p>
            )}
            <p className="text-[10px] text-red-600">{zonaCrit ? '🔴 Saturado · 45+ min' : '✓ Todo estable'}</p>
          </div>
        </div>

        {/* Recomendación */}
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
             style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Navigation size={12} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-0.5">Recomendación del sistema</p>
            <p className="text-xs text-slate-700 leading-snug">{recomendacion}</p>
            <p className="text-[10px] text-blue-500 mt-1 font-semibold">
              ⏱ Mejor horario: {mejorHora}
            </p>
          </div>
        </div>

        {/* Link a analítica */}
        <Link to="/analitica"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all border border-blue-100">
          <span>Ver predicciones IA por zona</span>
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
