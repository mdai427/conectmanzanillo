import { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from '@react-google-maps/api'
import { Trash2, CheckCircle2, Info, MapPin } from 'lucide-react'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const LIBRARIES = ['drawing']
const CENTER    = { lat: 19.0955, lng: -104.3162 }
const MAP_ID    = 'empresa-polygon-map'

const MAP_OPTIONS = {
  mapTypeId:           'satellite',
  tilt:                0,
  mapTypeControl:      false,
  streetViewControl:   false,
  fullscreenControl:   false,
  zoomControl:         true,
  clickableIcons:      false,
}

const POLY_OPTIONS = {
  fillColor:    '#00C2FF',
  fillOpacity:  0.25,
  strokeColor:  '#00C2FF',
  strokeWeight: 2,
  editable:     true,
  draggable:    true,
}

export default function EmpresaPolygonMap({ onChange }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
    id: MAP_ID,
  })

  const drawingMgrRef  = useRef(null)
  const polygonRef     = useRef(null)
  const [coords, setCoords]   = useState(null)
  const [mapRef, setMapRef]   = useState(null)
  const [mode, setMode]       = useState('draw') // 'draw' | 'done'

  const extractCoords = useCallback((poly) => {
    const path = poly.getPath()
    const pts = []
    for (let i = 0; i < path.getLength(); i++) {
      const ll = path.getAt(i)
      pts.push({ lat: ll.lat(), lng: ll.lng() })
    }
    return pts
  }, [])

  const onPolyComplete = useCallback((poly) => {
    // Remove previous polygon
    if (polygonRef.current) polygonRef.current.setMap(null)
    polygonRef.current = poly
    setMode('done')

    // Disable drawing mode
    if (drawingMgrRef.current) {
      drawingMgrRef.current.setDrawingMode(null)
    }

    const update = () => {
      const pts = extractCoords(poly)
      setCoords(pts)
      onChange(pts)
    }

    update()

    // Listen for edits
    const path = poly.getPath()
    window.google.maps.event.addListener(path, 'set_at', update)
    window.google.maps.event.addListener(path, 'insert_at', update)
    window.google.maps.event.addListener(path, 'remove_at', update)
    window.google.maps.event.addListener(poly, 'dragend', update)
  }, [extractCoords, onChange])

  const reset = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    setCoords(null)
    setMode('draw')
    onChange(null)
    if (drawingMgrRef.current) {
      drawingMgrRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON)
    }
  }

  if (!isLoaded) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando mapa…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Instrucciones */}
      <div className={`flex items-start gap-2.5 p-3 rounded-xl text-sm ${
        mode === 'done'
          ? 'bg-green-50 border border-green-200 text-green-700'
          : 'bg-blue-50 border border-blue-200 text-blue-700'
      }`}>
        {mode === 'done' ? (
          <>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>Polígono guardado ({coords?.length} puntos). Puedes arrastrarlo o editar los vértices.</span>
          </>
        ) : (
          <>
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>Haz clic en el mapa para trazar el contorno de tu empresa. Doble clic para cerrar el polígono.</span>
          </>
        )}
      </div>

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: 340 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={CENTER}
          zoom={16}
          options={MAP_OPTIONS}
          onLoad={m => setMapRef(m)}
        >
          <DrawingManager
            onLoad={dm => {
              drawingMgrRef.current = dm
            }}
            onPolygonComplete={onPolyComplete}
            defaultDrawingMode={window.google?.maps?.drawing?.OverlayType?.POLYGON}
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor:   '#00C2FF',
                fillOpacity: 0.25,
                strokeColor: '#00C2FF',
                strokeWeight: 2.5,
                editable:    true,
                draggable:   true,
              },
            }}
          />
        </GoogleMap>
      </div>

      {/* Botón borrar */}
      {mode === 'done' && (
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} /> Volver a dibujar
        </button>
      )}
    </div>
  )
}
