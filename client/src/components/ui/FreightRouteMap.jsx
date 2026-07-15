import { useEffect, useRef, useState } from 'react'
import { ExternalLink, MapPinned, Route } from 'lucide-react'
import { loadGoogleMaps } from './PortLiveMap.jsx'
import { googleDirectionsUrl } from '../../data/manzanilloRoutes.js'

export default function FreightRouteMap({ route, onSummary }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
  const mapNode = useRef(null)
  const map = useRef(null)
  const renderer = useRef(null)
  const [state, setState] = useState(apiKey ? 'loading' : 'fallback')

  useEffect(() => {
    if (!apiKey || !mapNode.current || !route) return
    let cancelled = false
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !mapNode.current) return
      if (!map.current) {
        map.current = new maps.Map(mapNode.current, { center: route.origin, zoom: 9, mapTypeControl: false, streetViewControl: false, gestureHandling: 'cooperative' })
        new maps.TrafficLayer().setMap(map.current)
        renderer.current = new maps.DirectionsRenderer({ map: map.current, polylineOptions: { strokeColor: '#0d5b55', strokeWeight: 6, strokeOpacity: .9 } })
      }
      setState('loading')
      new maps.DirectionsService().route({
        origin: route.origin,
        destination: route.destination,
        waypoints: route.waypoints.map(location => ({ location, stopover: false })),
        travelMode: maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: maps.TrafficModel.BEST_GUESS },
        provideRouteAlternatives: false,
      }, (result, status) => {
        if (cancelled) return
        if (status !== 'OK' || !result?.routes?.[0]) return setState('error')
        renderer.current.setDirections(result)
        const legs = result.routes[0].legs || []
        onSummary?.({
          distance: legs.map(leg => leg.distance?.value || 0).reduce((a,b)=>a+b,0),
          seconds: legs.map(leg => leg.duration_in_traffic?.value || leg.duration?.value || 0).reduce((a,b)=>a+b,0),
        })
        setState('ready')
      })
    }).catch(() => setState('error'))
    return () => { cancelled = true }
  }, [apiKey, route, onSummary])

  return <div className="relative min-h-[430px] overflow-hidden rounded-3xl bg-[#dfe9e8] lg:min-h-[610px]">
    {apiKey && <div ref={mapNode} className="absolute inset-0" aria-label={`Mapa de la ruta ${route.name}`}/>}
    {state === 'loading' && <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[10px] font-black text-teal-800 shadow-lg"><Route size={13} className="animate-pulse"/> Calculando con tráfico…</div>}
    {(state === 'fallback' || state === 'error') && <div className="port-map-fallback absolute inset-0 grid place-items-center p-6"><div className="max-w-md rounded-3xl border border-white/70 bg-white/[.92] p-7 text-center shadow-2xl backdrop-blur"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><MapPinned size={25}/></div><h3 className="mt-4 text-xl font-black">Corredor {route.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{state === 'fallback' ? 'El mapa interno se activa con la clave de Google Maps. La ruta oficial de referencia ya puede abrirse en tu navegador.' : 'Google no pudo calcular esta ruta ahora. Puedes abrirla externamente y continuar.'}</p><a href={googleDirectionsUrl(route)} target="_blank" rel="noopener noreferrer" className="port-glow-button mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0d5b55] px-5 text-xs font-black text-white">Abrir recorrido <ExternalLink size={14}/></a></div></div>}
  </div>
}
