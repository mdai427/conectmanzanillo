import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, InfoWindow, OverlayView } from '@react-google-maps/api'
import { STATUS_CONFIG } from '../../lib/constants.js'
import { supabase } from '../../lib/supabase.js'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const LIBRARIES = []
const CENTER = { lat: 19.0955, lng: -104.3162 }

const ZONE_POLYGONS = {
  'patio-tep': {
    coords: [
      { lat: 19.0958, lng: -104.3175 }, { lat: 19.0965, lng: -104.3158 },
      { lat: 19.0948, lng: -104.3145 }, { lat: 19.0938, lng: -104.3162 },
      { lat: 19.0945, lng: -104.3178 },
    ],
    label: 'Patio TEP',
    center: { lat: 19.0951, lng: -104.3161 },
  },
  'impala-terminals': {
    coords: [
      { lat: 19.0960, lng: -104.3152 }, { lat: 19.0968, lng: -104.3135 },
      { lat: 19.0950, lng: -104.3125 }, { lat: 19.0940, lng: -104.3142 },
      { lat: 19.0950, lng: -104.3155 },
    ],
    label: 'Impala Terminals',
    center: { lat: 19.0954, lng: -104.3140 },
  },
  'patio-alcam': {
    coords: [
      { lat: 19.0972, lng: -104.3128 }, { lat: 19.0980, lng: -104.3112 },
      { lat: 19.0962, lng: -104.3105 }, { lat: 19.0952, lng: -104.3120 },
      { lat: 19.0962, lng: -104.3130 },
    ],
    label: 'Patio ALCAM',
    center: { lat: 19.0966, lng: -104.3117 },
  },
  'patios-vacios-ssa': {
    coords: [
      { lat: 19.0945, lng: -104.3155 }, { lat: 19.0952, lng: -104.3138 },
      { lat: 19.0935, lng: -104.3128 }, { lat: 19.0925, lng: -104.3145 },
      { lat: 19.0935, lng: -104.3158 },
    ],
    label: 'Patios Vacíos SSA',
    center: { lat: 19.0938, lng: -104.3143 },
  },
  'patios-llenos-ssa': {
    coords: [
      { lat: 19.0930, lng: -104.3150 }, { lat: 19.0938, lng: -104.3133 },
      { lat: 19.0920, lng: -104.3125 }, { lat: 19.0910, lng: -104.3142 },
      { lat: 19.0920, lng: -104.3152 },
    ],
    label: 'Patios Llenos SSA',
    center: { lat: 19.0924, lng: -104.3140 },
  },
  'patio-acoman': {
    coords: [
      { lat: 19.0928, lng: -104.3163 }, { lat: 19.0935, lng: -104.3150 },
      { lat: 19.0918, lng: -104.3142 }, { lat: 19.0908, lng: -104.3155 },
      { lat: 19.0918, lng: -104.3165 },
    ],
    label: 'Patio Acoman',
    center: { lat: 19.0921, lng: -104.3155 },
  },
  'impala': {
    coords: [
      { lat: 19.0900, lng: -104.3148 }, { lat: 19.0910, lng: -104.3130 },
      { lat: 19.0892, lng: -104.3122 }, { lat: 19.0880, lng: -104.3138 },
      { lat: 19.0888, lng: -104.3150 },
    ],
    label: 'Impala',
    center: { lat: 19.0894, lng: -104.3136 },
  },
  'libramiento': {
    coords: [
      { lat: 19.1020, lng: -104.3210 }, { lat: 19.1030, lng: -104.3180 },
      { lat: 19.1010, lng: -104.3170 }, { lat: 19.1000, lng: -104.3200 },
    ],
    label: 'Libramiento',
    center: { lat: 19.1015, lng: -104.3190 },
  },
}

const STATUS_COLORS = {
  free:      { fill: '#22C55E', stroke: '#16a34a', glow: '#22C55E' },
  moderate:  { fill: '#F59E0B', stroke: '#d97706', glow: '#F59E0B' },
  congested: { fill: '#EF4444', stroke: '#dc2626', glow: '#EF4444' },
  closed:    { fill: '#6B7280', stroke: '#4b5563', glow: '#6B7280' },
  unknown:   { fill: '#94A3B8', stroke: '#64748b', glow: '#94A3B8' },
}

const TIME_EST = {
  free: '5-15 min', moderate: '20-45 min', congested: '45-90+ min', closed: 'Cerrado',
}

const MAP_STYLES_CLEAN = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

const LEGEND = [
  { color: '#22C55E', label: 'Libre · 5-15 min' },
  { color: '#F59E0B', label: 'Moderado · 20-45 min' },
  { color: '#EF4444', label: 'Saturado · 45-90+ min' },
  { color: '#6B7280', label: 'Cerrado' },
]

// Cuántos segundos atrás se formatea el timestamp
function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`
  return `hace ${Math.floor(diff / 3600)}h`
}

export default function PortMap({ sections = [], onZoneClick }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  })

  const mapRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [mapType, setMapType] = useState('satellite')
  const [hoveredSlug, setHoveredSlug] = useState(null)
  // slugs que cambiaron recientemente (para pulso)
  const [pulsing, setPulsing] = useState({})
  const [lastUpdate, setLastUpdate] = useState(null)

  // Suscripción Realtime para el pulso visual (independiente del hook useSections)
  useEffect(() => {
    const channel = supabase
      .channel('portmap_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'section_status_cache',
      }, (payload) => {
        const { section_id } = payload.new || {}
        // Buscar el slug que corresponde a este section_id
        const matchingSection = sections.find(s => s.id === section_id)
        if (matchingSection) {
          setPulsing(prev => ({ ...prev, [matchingSection.slug]: true }))
          setLastUpdate(new Date())
          // Quitar el pulso después de 6 segundos
          setTimeout(() => {
            setPulsing(prev => { const n = { ...prev }; delete n[matchingSection.slug]; return n })
          }, 6000)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sections])

  const sectionsBySlug = {}
  sections.forEach(s => { sectionsBySlug[s.slug] = s })

  const onLoad = useCallback((map) => { mapRef.current = map }, [])

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
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-800">Puerto de Manzanillo</span>
          <span className="text-xs text-slate-400 hidden sm:inline">· en vivo</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Actualizado {timeAgo(lastUpdate)}
            </span>
          )}
          <button onClick={() => setMapType(t => t === 'roadmap' ? 'satellite' : 'roadmap')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: mapType === 'satellite' ? '#eff6ff' : '#f1f5f9',
              color: mapType === 'satellite' ? '#1d4ed8' : '#475569',
              border: `1px solid ${mapType === 'satellite' ? '#bfdbfe' : '#e2e8f0'}`,
            }}>
            {mapType === 'satellite' ? '🗺' : '🛰'} {mapType === 'satellite' ? 'Mapa' : 'Satélite'}
          </button>
        </div>
      </div>

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
        {/* Polígonos de zonas */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown
          const isHovered = hoveredSlug === slug
          const isPulsing = !!pulsing[slug]

          return (
            <Polygon
              key={slug}
              paths={zone.coords}
              options={{
                fillColor: colors.fill,
                fillOpacity: isPulsing ? 0.75 : isHovered ? 0.6 : 0.38,
                strokeColor: colors.stroke,
                strokeOpacity: 1,
                strokeWeight: isPulsing ? 4 : isHovered ? 3 : 2,
              }}
              onClick={(e) => setSelected({
                slug,
                position: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                zone, section, colors, status,
              })}
              onMouseOver={() => setHoveredSlug(slug)}
              onMouseOut={() => setHoveredSlug(null)}
            />
          )
        })}

        {/* Etiquetas sobre las zonas */}
        {Object.entries(ZONE_POLYGONS).map(([slug, zone]) => {
          const section = sectionsBySlug[slug]
          const status = section?.status || 'unknown'
          const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown
          const isPulsing = !!pulsing[slug]

          return (
            <OverlayView
              key={`label-${slug}`}
              position={zone.center}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                onClick={() => setSelected({ slug, position: zone.center, zone, section, colors, status })}
                style={{
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(15,23,42,0.82)',
                  backdropFilter: 'blur(4px)',
                  border: `1.5px solid ${colors.fill}`,
                  borderRadius: 8,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isPulsing ? `0 0 12px ${colors.glow}99` : '0 1px 4px rgba(0,0,0,0.4)',
                  transition: 'box-shadow 0.3s',
                }}
              >
                <span style={{ color: colors.fill, fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }}>
                  {zone.label}
                </span>
              </div>
            </OverlayView>
          )
        })}

        {/* InfoWindow al hacer clic */}
        {selected && (
          <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
            <div style={{ background: '#0f172a', color: 'white', borderRadius: 12, padding: '12px 16px', minWidth: 200, fontFamily: 'system-ui,sans-serif' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f8fafc' }}>
                {selected.zone.label}
              </div>

              {(() => {
                const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.unknown
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{cfg.emoji}</span>
                    <span style={{ color: selected.colors.fill, fontSize: 13, fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                )
              })()}

              {TIME_EST[selected.status] && (
                <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>
                  ⏱ Espera estimada: <strong style={{ color: '#e2e8f0' }}>{TIME_EST[selected.status]}</strong>
                </div>
              )}

              {selected.section?.active_reports > 0 && (
                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>
                  📊 {selected.section.active_reports} reportes activos
                  {selected.section.confidence > 0 && ` · ${Math.round(selected.section.confidence)}% confianza`}
                </div>
              )}

              {selected.section?.last_report_at && (
                <div style={{ color: '#475569', fontSize: 10, marginBottom: 10 }}>
                  🕐 {timeAgo(selected.section.last_report_at)}
                </div>
              )}

              <button
                onClick={() => { onZoneClick?.(selected.slug); setSelected(null) }}
                style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11, cursor: 'pointer', width: '100%', fontWeight: 600 }}>
                Ver detalle y reportar →
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
