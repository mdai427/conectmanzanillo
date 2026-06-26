import { useCallback, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, InfoWindow, DrawingManager } from '@react-google-maps/api'
import { STATUS_CONFIG } from '../../lib/constants.js'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const LIBRARIES = ['drawing']

const CENTER = { lat: 19.0935, lng: -104.3148 }

// Coordenadas reales del Puerto de Manzanillo
const ZONE_POLYGONS = {
  'patio-tep': {
    coords: [
      { lat: 19.0958, lng: -104.3175 },
      { lat: 19.0965, lng: -104.3158 },
      { lat: 19.0948, lng: -104.3145 },
      { lat: 19.0938, lng: -104.3162 },
      { lat: 19.0945, lng: -104.3178 },
    ],
    label: 'Patio TEP',
    zoneColor: '#A855F7',
  },
  'impala-terminals': {
    coords: [
      { lat: 19.0960, lng: -104.3152 },
      { lat: 19.0968, lng: -104.3135 },
      { lat: 19.0950, lng: -104.3125 },
      { lat: 19.0940, lng: -104.3142 },
      { lat: 19.0950, lng: -104.3155 },
    ],
    label: 'Impala Terminals',
    zoneColor: '#06B6D4',
  },
  'patio-alcam': {
    coords: [
      { lat: 19.0972, lng: -104.3128 },
      { lat: 19.0980, lng: -104.3112 },
      { lat: 19.0962, lng: -104.3105 },
      { lat: 19.0952, lng: -104.3120 },
      { lat: 19.0962, lng: -104.3130 },
    ],
    label: 'Patio ALCAM',
    zoneColor: '#06B6D4',
  },
  'patios-vacios-ssa': {
    coords: [
      { lat: 19.0945, lng: -104.3155 },
      { lat: 19.0952, lng: -104.3138 },
      { lat: 19.0935, lng: -104.3128 },
      { lat: 19.0925, lng: -104.3145 },
      { lat: 19.0935, lng: -104.3158 },
    ],
    label: 'Patio Vacíos SSA',
    zoneColor: '#EAB308',
  },
  'patios-llenos-ssa': {
    coords: [
      { lat: 19.0930, lng: -104.3150 },
      { lat: 19.0938, lng: -104.3133 },
      { lat: 19.0920, lng: -104.3125 },
      { lat: 19.0910, lng: -104.3142 },
      { lat: 19.0920, lng: -104.3152 },
    ],
    label: 'Patio Llenos SSA',
    zoneColor: '#E2E8F0',
  },
  'patio-acoman': {
    coords: [
      { lat: 19.0928, lng: -104.3163 },
      { lat: 19.0935, lng: -104.3150 },
      { lat: 19.0918, lng: -104.3142 },
      { lat: 19.0908, lng: -104.3155 },
      { lat: 19.0918, lng: -104.3165 },
    ],
    label: 'Patio Acoman',
    zoneColor: '#E2E8F0',
  },
  'impala': {
    coords: [
      { lat: 19.0900, lng: -104.3148 },
      { lat: 19.0910, lng: -104.3130 },
      { lat: 19.0892, lng: -104.3122 },
      { lat: 19.0880, lng: -104.3138 },
      { lat: 19.0888, lng: -104.3150 },
    ],
    label: 'Impala',
    zoneColor: '#06B6D4',
  },
  'libramiento': {
    coords: [
      { lat: 19.1020, lng: -104.3210 },
      { lat: 19.1030, lng: -104.3180 },
      { lat: 19.1010, lng: -104.3170 },
      { lat: 19.1000, lng: -104.3200 },
    ],
    label: 'Libramiento',
    zoneColor: '#F97316',
  },
}

const STATUS_COLORS = {
  free:      '#22C55E',
  moderate:  '#F59E0B',
  congested: '#EF4444',
  closed:    '#6B7280',
  unknown:   null,
}

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8BA4C4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061020' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E3A6E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0a1628' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1E3A6E' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0F1F3D' }] },
]

export default function PortMap({ sections = [], onZoneClick }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  })

  const mapRef = useRef(null)
  const [selected, setSelected] = useState(null) // { slug, position }
  const [mapType, setMapType] = useState('roadmap') // roadmap | satellite
  const [drawMode, setDrawMode] = useState(false)
  const [drawnPolygons, setDrawnPolygons] = useState([])

  const sectionsBySlug = {}
  sections.forEach(s => { sectionsBySlug[s.slug] = s })

  const onLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  const onPolygonComplete = useCallback((polygon) => {
    const coords = polygon.getPath().getArray().map(latlng => ({
      lat: latlng.lat(),
      lng: latlng.lng(),
    }))
    setDrawnPolygons(prev => [...prev, { coords, id: Date.now() }])
    polygon.setMap(null) // removemos el temporal, lo controlamos nosotros
    setDrawMode(false)
  }, [])

  if (!isLoaded) {
    return (
      <div className="w-full rounded-2xl flex items-center justify-center"
           style={{ height: 420, background: '#0F1F3D', border: '1px solid #1E3A6E' }}>
        <div className="w-8 h-8 border-2 border-[#0099E6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: '460px', border: '1px solid #1E3A6E' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5"
           style={{ background: 'rgba(10,22,40,0.92)', borderBottom: '1px solid #1E3A6E' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">🗺️ Mapa Terminales</span>
          <span className="text-xs font-mono" style={{ color: '#0099E6' }}>· estado en tiempo real</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle satélite */}
          <button
            onClick={() => setMapType(t => t === 'roadmap' ? 'satellite' : 'roadmap')}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: mapType === 'satellite' ? '#0099E6' : '#0F1F3D',
              color: 'white',
              border: '1px solid #1E3A6E',
            }}
          >
            {mapType === 'satellite' ? '🗺 Mapa' : '🛰 Satélite'}
          </button>
          {/* Dibujar patio */}
          <button
            onClick={() => setDrawMode(d => !d)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: drawMode ? '#22C55E' : '#0F1F3D',
              color: 'white',
              border: `1px solid ${drawMode ? '#22C55E' : '#1E3A6E'}`,
            }}
          >
            ✏️ {drawMode ? 'Dibujando...' : 'Trazar patio'}
          </button>
          {drawnPolygons.length > 0 && (
            <button
              onClick={() => setDrawnPolygons([])}
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{ background: '#1E3A6E', color: '#8BA4C4', border: '1px solid #1E3A6E' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {drawMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl text-xs text-white"
             style={{ background: 'rgba(34,197,94,0.9)', backdropFilter: 'blur(4px)' }}>
          Haz clic en el mapa para trazar los vértices de tu patio. Doble clic para cerrar el polígono.
        </div>
      )}

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-col gap-1 px-3 py-2 rounded-xl text-xs"
           style={{ background: 'rgba(10,22,40,0.85)', border: '1px solid #1E3A6E' }}>
        {[['#22C55E','Libre'],['#F59E0B','Moderado'],['#EF4444','Saturado'],['#6B7280','Cerrado']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5" style={{ color: '#8BA4C4' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={CENTER}
        zoom={15}
        mapTypeId={mapType}
        onLoad={onLoad}
        options={{
          styles: mapType === 'roadmap' ? MAP_STYLES : [],
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: 9 }, // BOTTOM_RIGHT
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Zonas del puerto */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const statusColor = STATUS_COLORS[status]
          const color = statusColor || zone.zoneColor

          return (
            <Polygon
              key={slug}
              paths={zone.coords}
              options={{
                fillColor: color,
                fillOpacity: 0.35,
                strokeColor: color,
                strokeOpacity: 1,
                strokeWeight: 2.5,
              }}
              onClick={(e) => {
                setSelected({
                  slug,
                  position: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                  zone,
                  section,
                  color,
                  status,
                })
              }}
            />
          )
        })}

        {/* Polígonos dibujados por usuarios */}
        {drawnPolygons.map(p => (
          <Polygon
            key={p.id}
            paths={p.coords}
            options={{
              fillColor: '#F97316',
              fillOpacity: 0.3,
              strokeColor: '#F97316',
              strokeWeight: 2,
              strokeDashArray: '5,5',
            }}
          />
        ))}

        {/* Herramienta de dibujo */}
        {drawMode && (
          <DrawingManager
            drawingMode="polygon"
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: '#F97316',
                fillOpacity: 0.3,
                strokeColor: '#F97316',
                strokeWeight: 2,
                editable: true,
              },
            }}
            onPolygonComplete={onPolygonComplete}
          />
        )}

        {/* InfoWindow al hacer click en zona */}
        {selected && (
          <InfoWindow
            position={selected.position}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{
              background: '#0F1F3D',
              color: 'white',
              borderRadius: '10px',
              padding: '10px 14px',
              minWidth: '160px',
              fontFamily: 'system-ui, sans-serif',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                {selected.zone.label}
              </div>
              {(() => {
                const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.unknown
                return (
                  <div style={{ color: selected.color, fontSize: '12px' }}>
                    {cfg.emoji} {cfg.label}
                  </div>
                )
              })()}
              {selected.section?.active_reports > 0 && (
                <div style={{ color: '#8BA4C4', fontSize: '11px', marginTop: '4px' }}>
                  {selected.section.active_reports} reportes activos
                </div>
              )}
              <button
                onClick={() => { onZoneClick && onZoneClick(selected.slug); setSelected(null) }}
                style={{
                  marginTop: '8px',
                  background: '#0099E6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Ver detalle →
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
