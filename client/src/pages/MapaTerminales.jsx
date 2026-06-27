import { useState } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow, OverlayView } from '@react-google-maps/api'
import { MapPin, Navigation, Truck, Building2, Info, X } from 'lucide-react'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const LIBRARIES = []
const CENTER = { lat: 19.0955, lng: -104.3162 }

// ── Terminales con polígonos ──────────────────────────────────────────────────
const TERMINALES = [
  {
    id: 'tep',
    nombre: 'Patio TEP',
    tipo: 'patio',
    color: '#3b82f6',
    descripcion: 'Terminal de contenedores TEP. Acceso por Boulevard Costero.',
    coords: [
      { lat: 19.0958, lng: -104.3175 }, { lat: 19.0965, lng: -104.3158 },
      { lat: 19.0948, lng: -104.3145 }, { lat: 19.0938, lng: -104.3162 },
      { lat: 19.0945, lng: -104.3178 },
    ],
    center: { lat: 19.0951, lng: -104.3161 },
  },
  {
    id: 'impala',
    nombre: 'Impala Terminals',
    tipo: 'terminal',
    color: '#8b5cf6',
    descripcion: 'Terminal de graneles líquidos. Acceso controlado, requiere cita.',
    coords: [
      { lat: 19.0960, lng: -104.3152 }, { lat: 19.0968, lng: -104.3135 },
      { lat: 19.0950, lng: -104.3125 }, { lat: 19.0940, lng: -104.3142 },
      { lat: 19.0950, lng: -104.3155 },
    ],
    center: { lat: 19.0954, lng: -104.3140 },
  },
  {
    id: 'alcam',
    nombre: 'Patio ALCAM',
    tipo: 'patio',
    color: '#10b981',
    descripcion: 'Patio de contenedores ALCAM. Operaciones 24/7.',
    coords: [
      { lat: 19.0972, lng: -104.3128 }, { lat: 19.0980, lng: -104.3112 },
      { lat: 19.0962, lng: -104.3105 }, { lat: 19.0952, lng: -104.3120 },
      { lat: 19.0962, lng: -104.3130 },
    ],
    center: { lat: 19.0966, lng: -104.3117 },
  },
  {
    id: 'ssa-vacios',
    nombre: 'Patios Vacíos SSA',
    tipo: 'patio',
    color: '#f59e0b',
    descripcion: 'Patio de contenedores vacíos SSA. Retiro y entrega de vacíos.',
    coords: [
      { lat: 19.0945, lng: -104.3155 }, { lat: 19.0952, lng: -104.3138 },
      { lat: 19.0935, lng: -104.3128 }, { lat: 19.0925, lng: -104.3145 },
      { lat: 19.0935, lng: -104.3158 },
    ],
    center: { lat: 19.0938, lng: -104.3143 },
  },
  {
    id: 'ssa-llenos',
    nombre: 'Patios Llenos SSA',
    tipo: 'patio',
    color: '#ef4444',
    descripcion: 'Patio de contenedores llenos SSA. Importación y exportación.',
    coords: [
      { lat: 19.0930, lng: -104.3150 }, { lat: 19.0938, lng: -104.3133 },
      { lat: 19.0920, lng: -104.3125 }, { lat: 19.0910, lng: -104.3142 },
      { lat: 19.0920, lng: -104.3153 },
    ],
    center: { lat: 19.0923, lng: -104.3140 },
  },
  {
    id: 'fertinal',
    nombre: 'Fertinal',
    tipo: 'terminal',
    color: '#06b6d4',
    descripcion: 'Terminal de fertilizantes. Carga especializada a granel.',
    coords: [
      { lat: 19.0985, lng: -104.3108 }, { lat: 19.0992, lng: -104.3092 },
      { lat: 19.0975, lng: -104.3085 }, { lat: 19.0965, lng: -104.3100 },
      { lat: 19.0975, lng: -104.3112 },
    ],
    center: { lat: 19.0978, lng: -104.3098 },
  },
]

// ── Accesos / puntos de interés ───────────────────────────────────────────────
const ACCESOS = [
  {
    id: 'acc-principal',
    nombre: 'Acceso Principal',
    tipo: 'acceso',
    descripcion: 'Caseta de entrada principal. Documentación y registro.',
    pos: { lat: 19.0940, lng: -104.3185 },
    icon: '🚧',
  },
  {
    id: 'acc-norte',
    nombre: 'Acceso Norte',
    tipo: 'acceso',
    descripcion: 'Entrada para carga internacional. Requiere permiso especial.',
    pos: { lat: 19.0988, lng: -104.3155 },
    icon: '🚧',
  },
  {
    id: 'gasolinera',
    nombre: 'Gasolinera Puerto',
    tipo: 'servicio',
    descripcion: 'Gasolinera dentro del recinto portuario. Diésel y gasolina.',
    pos: { lat: 19.0925, lng: -104.3170 },
    icon: '⛽',
  },
  {
    id: 'aduana',
    nombre: 'Aduana Manzanillo',
    tipo: 'aduana',
    descripcion: 'Instalaciones de la Aduana Nacional. Trámites de importación/exportación.',
    pos: { lat: 19.0960, lng: -104.3190 },
    icon: '🏛️',
  },
  {
    id: 'basculas',
    nombre: 'Básculas',
    tipo: 'servicio',
    descripcion: 'Punto de pesaje oficial para vehículos de carga.',
    pos: { lat: 19.0935, lng: -104.3175 },
    icon: '⚖️',
  },
]

const TIPO_COLORS = {
  patio:    '#f59e0b',
  terminal: '#3b82f6',
  acceso:   '#ef4444',
  servicio: '#10b981',
  aduana:   '#8b5cf6',
}

const TIPO_LABELS = {
  patio:    'Patio',
  terminal: 'Terminal',
  acceso:   'Acceso',
  servicio: 'Servicio',
  aduana:   'Aduana',
}

const MAP_OPTIONS = {
  mapTypeId: 'satellite',
  tilt: 0,
  mapTypeControl: true,
  mapTypeControlOptions: { position: 3 },
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
}

export default function MapaTerminales() {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES, id: 'mapa-terminales' })
  const [selected, setSelected] = useState(null)  // terminal o acceso seleccionado
  const [filtro, setFiltro] = useState('todos')

  const terminalesFiltradas = filtro === 'todos' ? TERMINALES
    : TERMINALES.filter(t => t.tipo === filtro)

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Navigation size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mapa de Terminales</h1>
            <p className="text-gray-500 text-sm">Puerto de Manzanillo — zonas, accesos y servicios</p>
          </div>
        </div>

        {/* Leyenda / Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          {[['todos','Todos'],['terminal','Terminales'],['patio','Patios']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filtro === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 520 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={CENTER}
          zoom={16}
          options={MAP_OPTIONS}
          onClick={() => setSelected(null)}
        >
          {/* Polígonos de terminales */}
          {terminalesFiltradas.map(t => (
            <Polygon
              key={t.id}
              paths={t.coords}
              options={{
                fillColor:   t.color,
                fillOpacity: selected?.id === t.id ? 0.45 : 0.25,
                strokeColor: t.color,
                strokeWeight: selected?.id === t.id ? 3 : 2,
                clickable: true,
              }}
              onClick={() => setSelected(t)}
            />
          ))}

          {/* Labels de terminales */}
          {terminalesFiltradas.map(t => (
            <OverlayView key={`label-${t.id}`} position={t.center} mapPaneName="overlayLayer">
              <div
                onClick={() => setSelected(t)}
                className="cursor-pointer select-none"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className="px-2 py-1 rounded-lg text-white text-[10px] font-bold shadow-lg whitespace-nowrap"
                     style={{ background: t.color, border: '1.5px solid rgba(255,255,255,0.4)' }}>
                  {t.nombre}
                </div>
              </div>
            </OverlayView>
          ))}

          {/* Marcadores de accesos y servicios */}
          {ACCESOS.map(a => (
            <OverlayView key={a.id} position={a.pos} mapPaneName="overlayLayer">
              <div
                onClick={e => { e.stopPropagation(); setSelected(a) }}
                className="cursor-pointer select-none"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white transition-transform ${
                  selected?.id === a.id ? 'scale-125' : 'hover:scale-110'
                }`}
                style={{ background: TIPO_COLORS[a.tipo] }}>
                  {a.icon}
                </div>
              </div>
            </OverlayView>
          ))}

          {/* InfoWindow del elemento seleccionado */}
          {selected && (selected.center || selected.pos) && (
            <InfoWindow
              position={selected.center || selected.pos}
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-1 min-w-[180px] max-w-[220px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: selected.color || TIPO_COLORS[selected.tipo] }}>
                    {TIPO_LABELS[selected.tipo]}
                  </span>
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">{selected.nombre}</p>
                <p className="text-gray-600 text-xs leading-relaxed">{selected.descripcion}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Cards de terminales */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Terminales y Patios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {terminalesFiltradas.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selected?.id === t.id
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.tipo}</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">{t.nombre}</p>
              <p className="text-gray-500 text-xs mt-1 leading-snug line-clamp-2">{t.descripcion}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accesos y servicios */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Accesos y Servicios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCESOS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                selected?.id === a.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                   style={{ background: `${TIPO_COLORS[a.tipo]}20` }}>
                {a.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 text-sm">{a.nombre}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${TIPO_COLORS[a.tipo]}20`, color: TIPO_COLORS[a.tipo] }}>
                    {TIPO_LABELS[a.tipo]}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5 leading-snug">{a.descripcion}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nota para choferes */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <Truck size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Para operadores y choferes</p>
          <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
            Haz clic en cualquier terminal o acceso del mapa para ver detalles. Consulta el estado en tiempo real de cada zona en la sección de Reportes.
          </p>
        </div>
      </div>
    </div>
  )
}
