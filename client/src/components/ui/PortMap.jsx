import { useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { STATUS_CONFIG } from '../../lib/constants.js'

// Coordenadas aproximadas de las zonas del Puerto de Manzanillo, Colima
const ZONE_POLYGONS = {
  'acceso-principal': {
    coords: [
      [19.0752, -104.3285],
      [19.0758, -104.3268],
      [19.0743, -104.3261],
      [19.0737, -104.3278],
    ],
    label: 'Acceso Principal',
  },
  'segundo-acceso': {
    coords: [
      [19.0765, -104.3310],
      [19.0772, -104.3292],
      [19.0755, -104.3285],
      [19.0748, -104.3303],
    ],
    label: 'Segundo Acceso',
  },
  'terminal-ictsi': {
    coords: [
      [19.0720, -104.3340],
      [19.0735, -104.3310],
      [19.0715, -104.3298],
      [19.0700, -104.3328],
    ],
    label: 'Terminal ICTSI',
  },
  'terminal-tmm': {
    coords: [
      [19.0700, -104.3370],
      [19.0715, -104.3342],
      [19.0695, -104.3330],
      [19.0680, -104.3358],
    ],
    label: 'Terminal TMM',
  },
  'patio-fiscal': {
    coords: [
      [19.0740, -104.3255],
      [19.0748, -104.3238],
      [19.0728, -104.3230],
      [19.0720, -104.3247],
    ],
    label: 'Patio Fiscal',
  },
  'confinada': {
    coords: [
      [19.0730, -104.3295],
      [19.0738, -104.3278],
      [19.0720, -104.3268],
      [19.0712, -104.3285],
    ],
    label: 'Zona Confinada',
  },
  'libramiento': {
    coords: [
      [19.0810, -104.3350],
      [19.0820, -104.3290],
      [19.0800, -104.3285],
      [19.0790, -104.3345],
    ],
    label: 'Libramiento',
  },
  'vialidad-interna': {
    coords: [
      [19.0745, -104.3330],
      [19.0755, -104.3308],
      [19.0738, -104.3298],
      [19.0728, -104.3320],
    ],
    label: 'Vialidad Interna',
  },
}

const STATUS_COLORS = {
  free:      { color: '#22C55E', fill: '#22C55E', opacity: 0.25 },
  moderate:  { color: '#F59E0B', fill: '#F59E0B', opacity: 0.30 },
  congested: { color: '#EF4444', fill: '#EF4444', opacity: 0.35 },
  closed:    { color: '#6B7280', fill: '#6B7280', opacity: 0.40 },
  unknown:   { color: '#3D5A80', fill: '#3D5A80', opacity: 0.20 },
}

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    map.setView([19.0730, -104.3305], 15)
  }, [map])
  return null
}

export default function PortMap({ sections = [], onZoneClick }) {
  const sectionsBySlug = {}
  sections.forEach(s => { sectionsBySlug[s.slug] = s })

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: '400px', border: '1px solid #1E3A6E' }}>
      {/* Header del mapa */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2.5"
           style={{ background: 'rgba(10,22,40,0.92)', borderBottom: '1px solid #1E3A6E' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">🗺️ Mapa del Puerto</span>
          <span className="text-xs" style={{ color: '#3D5A80' }}>· estado en tiempo real</span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#8BA4C4' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Moderado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Saturado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-500" /> Cerrado</span>
        </div>
      </div>

      <MapContainer
        center={[19.0730, -104.3305]}
        zoom={15}
        style={{ height: '100%', width: '100%', background: '#0A1628' }}
        zoomControl={false}
        attributionControl={false}
      >
        <FitBounds />

        {/* Tiles oscuros tipo noche */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Zonas del puerto */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown

          return (
            <Polygon
              key={slug}
              positions={zone.coords}
              pathOptions={{
                color: colors.color,
                fillColor: colors.fill,
                fillOpacity: colors.opacity,
                weight: 2,
                opacity: 0.9,
              }}
              eventHandlers={{
                click: () => onZoneClick && onZoneClick(slug),
                mouseover: (e) => { e.target.setStyle({ fillOpacity: colors.opacity + 0.2, weight: 3 }) },
                mouseout: (e) => { e.target.setStyle({ fillOpacity: colors.opacity, weight: 2 }) },
              }}
            >
              <Tooltip
                permanent={false}
                direction="top"
                className="map-tooltip"
              >
                <div style={{ background: '#0F1F3D', border: '1px solid #1E3A6E', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  <div className="font-bold">{zone.label}</div>
                  <div style={{ color: colors.color }}>{cfg.emoji} {cfg.label}</div>
                  {section?.active_reports > 0 && (
                    <div style={{ color: '#8BA4C4', fontSize: '11px' }}>{section.active_reports} reporte{section.active_reports !== 1 ? 's' : ''}</div>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          )
        })}
      </MapContainer>

      {/* Atribución */}
      <div className="absolute bottom-2 right-2 z-[1000] text-xs" style={{ color: '#3D5A80' }}>
        © OpenStreetMap · © CARTO
      </div>
    </div>
  )
}
