import { useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { STATUS_CONFIG } from '../../lib/constants.js'

// Coordenadas reales de las zonas del Puerto de Manzanillo, Colima
// Extraídas del mapa satelital de referencia
const ZONE_POLYGONS = {
  'patio-tep': {
    coords: [
      [19.0958, -104.3175],
      [19.0965, -104.3158],
      [19.0948, -104.3145],
      [19.0938, -104.3162],
      [19.0945, -104.3178],
    ],
    label: 'Patio TEP',
    color: '#A855F7', // morado como en la imagen
  },
  'impala-terminals': {
    coords: [
      [19.0960, -104.3152],
      [19.0968, -104.3135],
      [19.0950, -104.3125],
      [19.0940, -104.3142],
      [19.0950, -104.3155],
    ],
    label: 'Impala Terminals',
    color: '#06B6D4', // cyan
  },
  'patio-alcam': {
    coords: [
      [19.0972, -104.3128],
      [19.0980, -104.3112],
      [19.0962, -104.3105],
      [19.0952, -104.3120],
      [19.0962, -104.3130],
    ],
    label: 'Patio ALCAM',
    color: '#06B6D4', // cyan
  },
  'patios-vacios-ssa': {
    coords: [
      [19.0945, -104.3155],
      [19.0952, -104.3138],
      [19.0935, -104.3128],
      [19.0925, -104.3145],
      [19.0935, -104.3158],
    ],
    label: 'Patio Vacíos SSA',
    color: '#EAB308', // amarillo/dorado
  },
  'patios-llenos-ssa': {
    coords: [
      [19.0930, -104.3150],
      [19.0938, -104.3133],
      [19.0920, -104.3125],
      [19.0910, -104.3142],
      [19.0920, -104.3152],
    ],
    label: 'Patio Llenos SSA',
    color: '#E2E8F0', // blanco/claro
  },
  'patio-acoman': {
    coords: [
      [19.0928, -104.3163],
      [19.0935, -104.3150],
      [19.0918, -104.3142],
      [19.0908, -104.3155],
      [19.0918, -104.3165],
    ],
    label: 'Patio Acoman',
    color: '#E2E8F0', // blanco/claro
  },
  'impala': {
    coords: [
      [19.0900, -104.3148],
      [19.0910, -104.3130],
      [19.0892, -104.3122],
      [19.0880, -104.3138],
      [19.0888, -104.3150],
    ],
    label: 'Impala',
    color: '#06B6D4', // cyan
  },
  'libramiento': {
    coords: [
      [19.1020, -104.3210],
      [19.1030, -104.3180],
      [19.1010, -104.3170],
      [19.1000, -104.3200],
    ],
    label: 'Libramiento',
    color: '#F97316', // naranja
  },
}

const STATUS_COLORS = {
  free:      '#22C55E',
  moderate:  '#F59E0B',
  congested: '#EF4444',
  closed:    '#6B7280',
  unknown:   null, // usa color de zona
}

function SetView() {
  const map = useMap()
  useEffect(() => {
    map.setView([19.0935, -104.3148], 15)
  }, [map])
  return null
}

export default function PortMap({ sections = [], onZoneClick }) {
  const sectionsBySlug = {}
  sections.forEach(s => { sectionsBySlug[s.slug] = s })

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: '420px', border: '1px solid #1E3A6E' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2.5"
           style={{ background: 'rgba(10,22,40,0.92)', borderBottom: '1px solid #1E3A6E' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">🗺️ Mapa Terminales</span>
          <span className="text-xs font-mono" style={{ color: '#0099E6' }}>· estado en tiempo real</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: '#8BA4C4' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Moderado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Saturado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-500" /> Cerrado</span>
        </div>
      </div>

      <MapContainer
        center={[19.0935, -104.3148]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <SetView />
        <ZoomControl position="bottomright" />

        {/* Tiles satelitales oscuros */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
          maxZoom={19}
        />
        {/* Labels encima del satélite */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution=""
          opacity={0.7}
        />

        {/* Zonas del puerto */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const statusColor = STATUS_COLORS[status]
          const fillColor = statusColor || zone.color
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown

          return (
            <Polygon
              key={slug}
              positions={zone.coords}
              pathOptions={{
                color: fillColor,
                fillColor: fillColor,
                fillOpacity: 0.35,
                weight: 2.5,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => onZoneClick && onZoneClick(slug),
                mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.55, weight: 3.5 }) },
                mouseout: (e) => { e.target.setStyle({ fillOpacity: 0.35, weight: 2.5 }) },
              }}
            >
              <Tooltip direction="top" opacity={1}>
                <div style={{
                  background: '#0F1F3D',
                  border: `1px solid ${fillColor}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                  <div className="font-bold text-sm mb-1">{zone.label}</div>
                  <div style={{ color: fillColor, fontSize: '11px' }}>{cfg.emoji} {cfg.label}</div>
                  {section?.active_reports > 0 && (
                    <div style={{ color: '#8BA4C4', fontSize: '10px', marginTop: '2px' }}>
                      {section.active_reports} reporte{section.active_reports !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div style={{ color: '#3D5A80', fontSize: '10px', marginTop: '2px' }}>
                    Click para ver detalle →
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          )
        })}
      </MapContainer>
    </div>
  )
}
