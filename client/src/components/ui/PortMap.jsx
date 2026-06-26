import { useCallback, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, InfoWindow, DrawingManager } from '@react-google-maps/api'
import { STATUS_CONFIG } from '../../lib/constants.js'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const LIBRARIES = ['drawing']
const CENTER = { lat: 19.0955, lng: -104.3162 }

const ZONE_POLYGONS = {
  'patio-tep': {
    coords: [
      { lat: 19.0958, lng: -104.3175 }, { lat: 19.0965, lng: -104.3158 },
      { lat: 19.0948, lng: -104.3145 }, { lat: 19.0938, lng: -104.3162 },
      { lat: 19.0945, lng: -104.3178 },
    ],
    label: 'Patio TEP', zoneColor: '#A855F7',
  },
  'impala-terminals': {
    coords: [
      { lat: 19.0960, lng: -104.3152 }, { lat: 19.0968, lng: -104.3135 },
      { lat: 19.0950, lng: -104.3125 }, { lat: 19.0940, lng: -104.3142 },
      { lat: 19.0950, lng: -104.3155 },
    ],
    label: 'Impala Terminals', zoneColor: '#06B6D4',
  },
  'patio-alcam': {
    coords: [
      { lat: 19.0972, lng: -104.3128 }, { lat: 19.0980, lng: -104.3112 },
      { lat: 19.0962, lng: -104.3105 }, { lat: 19.0952, lng: -104.3120 },
      { lat: 19.0962, lng: -104.3130 },
    ],
    label: 'Patio ALCAM', zoneColor: '#06B6D4',
  },
  'patios-vacios-ssa': {
    coords: [
      { lat: 19.0945, lng: -104.3155 }, { lat: 19.0952, lng: -104.3138 },
      { lat: 19.0935, lng: -104.3128 }, { lat: 19.0925, lng: -104.3145 },
      { lat: 19.0935, lng: -104.3158 },
    ],
    label: 'Patio Vacíos SSA', zoneColor: '#EAB308',
  },
  'patios-llenos-ssa': {
    coords: [
      { lat: 19.0930, lng: -104.3150 }, { lat: 19.0938, lng: -104.3133 },
      { lat: 19.0920, lng: -104.3125 }, { lat: 19.0910, lng: -104.3142 },
      { lat: 19.0920, lng: -104.3152 },
    ],
    label: 'Patio Llenos SSA', zoneColor: '#E2E8F0',
  },
  'patio-acoman': {
    coords: [
      { lat: 19.0928, lng: -104.3163 }, { lat: 19.0935, lng: -104.3150 },
      { lat: 19.0918, lng: -104.3142 }, { lat: 19.0908, lng: -104.3155 },
      { lat: 19.0918, lng: -104.3165 },
    ],
    label: 'Patio Acoman', zoneColor: '#E2E8F0',
  },
  'impala': {
    coords: [
      { lat: 19.0900, lng: -104.3148 }, { lat: 19.0910, lng: -104.3130 },
      { lat: 19.0892, lng: -104.3122 }, { lat: 19.0880, lng: -104.3138 },
      { lat: 19.0888, lng: -104.3150 },
    ],
    label: 'Impala', zoneColor: '#06B6D4',
  },
  'libramiento': {
    coords: [
      { lat: 19.1020, lng: -104.3210 }, { lat: 19.1030, lng: -104.3180 },
      { lat: 19.1010, lng: -104.3170 }, { lat: 19.1000, lng: -104.3200 },
    ],
    label: 'Libramiento', zoneColor: '#F97316',
  },
}

const STATUS_COLORS = {
  free: '#22C55E', moderate: '#F59E0B', congested: '#EF4444',
  closed: '#6B7280', unknown: null,
}

const MAP_STYLES_CLEAN = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

const LEGEND = [
  { color: '#22C55E', label: 'Libre' },
  { color: '#F59E0B', label: 'Moderado' },
  { color: '#EF4444', label: 'Saturado' },
  { color: '#6B7280', label: 'Cerrado' },
]

export default function PortMap({ sections = [], onZoneClick }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  })

  const mapRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [mapType, setMapType] = useState('satellite')
  const [drawMode, setDrawMode] = useState(false)
  const [drawnPolygons, setDrawnPolygons] = useState([])
  const [hoveredSlug, setHoveredSlug] = useState(null)

  const sectionsBySlug = {}
  sections.forEach(s => { sectionsBySlug[s.slug] = s })

  const onLoad = useCallback((map) => { mapRef.current = map }, [])

  const onPolygonComplete = useCallback((polygon) => {
    const coords = polygon.getPath().getArray().map(ll => ({ lat: ll.lat(), lng: ll.lng() }))
    setDrawnPolygons(prev => [...prev, { coords, id: Date.now() }])
    polygon.setMap(null)
    setDrawMode(false)
  }, [])

  if (!isLoaded) {
    return (
      <div className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-100"
           style={{ height: 480, border: '1px solid #e2e8f0' }}>
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Cargando mapa…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
         style={{ height: 480, border: '1px solid #334155' }}>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
           style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-800">Puerto de Manzanillo</span>
          <span className="text-xs text-slate-400 hidden sm:inline">· tiempo real</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Satellite toggle */}
          <button onClick={() => setMapType(t => t === 'roadmap' ? 'satellite' : 'roadmap')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mapType === 'satellite' ? '#eff6ff' : '#f1f5f9',
              color: mapType === 'satellite' ? '#1d4ed8' : '#475569',
              border: `1px solid ${mapType === 'satellite' ? '#bfdbfe' : '#e2e8f0'}`,
            }}>
            {mapType === 'satellite' ? '🗺' : '🛰'} {mapType === 'satellite' ? 'Mapa' : 'Satélite'}
          </button>
          {/* Draw mode */}
          <button onClick={() => { const next = !drawMode; setDrawMode(next); if (next) setMapType('satellite') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: drawMode ? '#fff7ed' : '#f1f5f9',
              color: drawMode ? '#c2410c' : '#475569',
              border: `1px solid ${drawMode ? '#fed7aa' : '#e2e8f0'}`,
            }}>
            ✏️ {drawMode ? 'Cancelar' : 'Mi patio'}
          </button>
          {drawnPolygons.length > 0 && (
            <button onClick={() => setDrawnPolygons([])}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-500 transition-all bg-slate-100 border border-slate-200">
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Draw instructions banner ── */}
      {drawMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 px-5 py-2.5 rounded-xl text-xs font-medium text-white shadow-xl text-center"
             style={{ background: 'rgba(249,115,22,0.92)', backdropFilter: 'blur(8px)', maxWidth: '90%' }}>
          ✏️ Haz clic para marcar los vértices de tu patio — doble clic para terminar
        </div>
      )}

      {/* ── Legend ── */}
      <div className="absolute bottom-10 left-3 z-10 px-3 py-2.5 rounded-xl hidden sm:flex flex-col gap-1.5"
           style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}88` }} />
            {label}
          </div>
        ))}
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={CENTER}
        zoom={16}
        mapTypeId={mapType}
        onLoad={onLoad}
        options={{
          styles: mapType === 'roadmap' ? MAP_STYLES_CLEAN : [],
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        }}
      >
        {/* Zonas del puerto */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const color = STATUS_COLORS[status] || zone.zoneColor
          const isHovered = hoveredSlug === slug

          return (
            <Polygon
              key={slug}
              paths={zone.coords}
              options={{
                fillColor: color,
                fillOpacity: isHovered ? 0.6 : 0.35,
                strokeColor: color,
                strokeOpacity: 1,
                strokeWeight: isHovered ? 3 : 2,
              }}
              onClick={(e) => setSelected({ slug, position: { lat: e.latLng.lat(), lng: e.latLng.lng() }, zone, section, color, status })}
              onMouseOver={() => setHoveredSlug(slug)}
              onMouseOut={() => setHoveredSlug(null)}
            />
          )
        })}

        {/* Patios dibujados */}
        {drawnPolygons.map(p => (
          <Polygon key={p.id} paths={p.coords}
            options={{ fillColor: '#f97316', fillOpacity: 0.25, strokeColor: '#f97316', strokeWeight: 2 }} />
        ))}

        {/* Herramienta de dibujo */}
        {drawMode && (
          <DrawingManager
            drawingMode="polygon"
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: '#f97316', fillOpacity: 0.25,
                strokeColor: '#f97316', strokeWeight: 2, editable: false,
              },
            }}
            onPolygonComplete={onPolygonComplete}
          />
        )}

        {/* InfoWindow */}
        {selected && (
          <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
            <div style={{ background: '#0f172a', color: 'white', borderRadius: 12, padding: '12px 16px', minWidth: 170, fontFamily: 'system-ui,sans-serif' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f8fafc' }}>{selected.zone.label}</div>
              {(() => {
                const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.unknown
                return <div style={{ color: selected.color, fontSize: 12, marginBottom: 4 }}>{cfg.emoji} {cfg.label}</div>
              })()}
              {selected.section?.active_reports > 0 && (
                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>
                  {selected.section.active_reports} reportes activos
                </div>
              )}
              <button onClick={() => { onZoneClick?.(selected.slug); setSelected(null) }}
                style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', width: '100%', fontWeight: 600 }}>
                Ver detalle →
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
