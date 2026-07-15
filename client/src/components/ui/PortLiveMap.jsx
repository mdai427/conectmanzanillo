import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Layers3, MapPin, Navigation, Radio, Route } from 'lucide-react'

const MANZANILLO_PORT = { lat: 19.0716, lng: -104.2997 }
let mapsLoader

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsLoader) return mapsLoader
  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-faro-google-maps]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=es&region=MX`
    script.async = true
    script.defer = true
    script.dataset.faroGoogleMaps = 'true'
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('No fue posible cargar Google Maps'))
    document.head.appendChild(script)
  })
  return mapsLoader
}

function coordinates(section) {
  const lat = Number(section.lat)
  const lng = Number(section.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function statusColor(section) {
  if (!Number(section.active_reports || 0)) return '#94a3b8'
  return { free: '#22c55e', moderate: '#f59e0b', congested: '#ef4444', closed: '#64748b' }[section.status] || '#94a3b8'
}

export default function PortLiveMap({ sections = [], onReport }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const markersRef = useRef([])
  const [selected, setSelected] = useState(null)
  const [mapState, setMapState] = useState(apiKey ? 'loading' : 'needs_key')
  const mappable = useMemo(() => sections.filter(coordinates), [sections])

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    let cancelled = false
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !mapRef.current) return
      if (!instanceRef.current) {
        instanceRef.current = new maps.Map(mapRef.current, {
          center: MANZANILLO_PORT, zoom: 13, mapTypeControl: false,
          streetViewControl: false, fullscreenControl: true,
          gestureHandling: 'cooperative',
        })
        new maps.TrafficLayer().setMap(instanceRef.current)
      }
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = mappable.map((section) => {
        const marker = new maps.Marker({
          map: instanceRef.current, position: coordinates(section), title: section.name,
          icon: { path: maps.SymbolPath.CIRCLE, fillColor: statusColor(section), fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3, scale: 8 },
        })
        marker.addListener('click', () => setSelected(section))
        return marker
      })
      setMapState('ready')
    }).catch(() => setMapState('error'))
    return () => { cancelled = true }
  }, [apiKey, mappable])

  const focus = selected ? coordinates(selected) : MANZANILLO_PORT
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${focus.lat},${focus.lng}`
  const wazeUrl = `https://waze.com/ul?ll=${focus.lat}%2C${focus.lng}&navigate=yes&zoom=16`

  return <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(8,31,44,.07)]">
    <header className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-teal-700"><Layers3 size={14}/> Mapa operativo</div><h2 className="mt-2 text-xl font-black text-[#081f2c]">Tráfico externo + reportes Faro</h2><p className="mt-1 text-xs leading-5 text-slate-500">La capa de tránsito pertenece a Google. Los marcadores de color provienen de reportes comunitarios.</p></div><div className="flex gap-2"><a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-700 hover:border-teal-500"><MapPin size={14}/> Google Maps</a><a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0d5b55] px-3 text-[10px] font-black text-white"><Navigation size={14}/> Abrir Waze</a></div></header>
    <div className="relative min-h-[410px] bg-[#dfe9e8]">
      {apiKey && <div ref={mapRef} className="absolute inset-0" aria-label="Mapa de tráfico y zonas del Puerto de Manzanillo"/>}
      {mapState === 'loading' && <div className="absolute inset-0 grid place-items-center bg-[#e8f0ef]"><div className="text-center"><Route className="mx-auto animate-pulse text-teal-700"/><p className="mt-3 text-xs font-black text-slate-600">Cargando tráfico…</p></div></div>}
      {(mapState === 'needs_key' || mapState === 'error') && <div className="port-map-fallback absolute inset-0 grid place-items-center p-6"><div className="max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 text-center shadow-xl backdrop-blur"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Route size={22}/></div><h3 className="mt-4 text-lg font-black text-[#081f2c]">Mapa de tráfico preparado</h3><p className="mt-2 text-xs leading-5 text-slate-500">{mapState === 'needs_key' ? 'Agrega una clave restringida de Google Maps para mostrar el tráfico dentro de Faro. Mientras tanto puedes consultar Google Maps o navegar con Waze.' : 'La capa de Google no respondió. Los reportes de Faro siguen disponibles y puedes abrir el mapa externo.'}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700">Ver tráfico en Google <ExternalLink size={13}/></a><a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d5b55] px-4 text-xs font-black text-white">Navegar con Waze <Navigation size={13}/></a></div></div></div>}
      {mapState === 'ready' && mappable.length === 0 && <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">El tráfico está visible, pero faltan coordenadas verificadas para colocar las zonas de Faro.</div>}
      {selected && <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur"><div className="flex items-start gap-3"><span className="mt-1 h-3 w-3 rounded-full" style={{ background:statusColor(selected), boxShadow:`0 0 12px ${statusColor(selected)}` }}/><div className="min-w-0 flex-1"><p className="text-sm font-black text-[#081f2c]">{selected.name}</p><p className="mt-1 text-[10px] text-slate-500">{selected.active_reports ? `${selected.active_reports} reportes comunitarios activos` : 'Sin reportes recientes'}</p></div><button onClick={() => setSelected(null)} aria-label="Cerrar detalle" className="text-slate-400">×</button></div><div className="mt-3 flex gap-2"><button onClick={() => onReport(selected)} className="port-glow-button inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0d5b55] text-[10px] font-black text-white"><Radio size={13}/> Reportar</button><a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-700"><Navigation size={13}/> Cómo llegar</a></div></div>}
    </div>
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-3 text-[9px] font-semibold text-slate-400"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Fluido</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"/> Con carga</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"/> Saturado</span><span className="ml-auto">La disponibilidad del tráfico depende de la cobertura del proveedor.</span></footer>
  </section>
}
