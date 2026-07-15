const COLIMA = { lat: 19.2482018722, lng: -103.723829683, label: 'Colima' }
const MANZANILLO = { lat: 19.0506025552, lng: -104.3173602878, label: 'Manzanillo' }

const corridors = [
  { id: 'salada', name: 'La Salada', character: 'Corredor principal', waypoints: [{ lat: 19.0333073959, lng: -103.793797116 }] },
  { id: 'tamala', name: 'Tamala', character: 'Alternativa por Tamala', waypoints: [{ lat: 19.0334288708, lng: -103.756115261 }] },
  { id: 'madrid', name: 'Madrid', character: 'Alternativa por Madrid', waypoints: [{ lat: 19.2194376686, lng: -103.800601938 }, { lat: 19.0735730706, lng: -103.876373885 }] },
  { id: 'coyote', name: 'El Coyote', character: 'Alternativa extendida', waypoints: [{ lat: 19.2194376686, lng: -103.800601938 }, { lat: 19.0735730706, lng: -103.876373885 }, { lat: 18.9875952603, lng: -103.909474993 }] },
  { id: 'pueblo-juarez', name: 'Pueblo Juárez', character: 'Alternativa regional', waypoints: [{ lat: 19.2194376686, lng: -103.800601938 }, { lat: 19.0451968272, lng: -104.00430502 }] },
]

export const OFFICIAL_ROUTES_SOURCE = 'https://rutasalternas.col.gob.mx/routes/#ruta-colima-manzanillo-0'

export function routeOptions(direction = 'enter') {
  return corridors.map((route) => ({
    ...route,
    origin: direction === 'enter' ? COLIMA : MANZANILLO,
    destination: direction === 'enter' ? MANZANILLO : COLIMA,
    waypoints: direction === 'enter' ? route.waypoints : [...route.waypoints].reverse(),
  }))
}

export function googleDirectionsUrl(route) {
  const params = new URLSearchParams({ api: '1', origin: `${route.origin.lat},${route.origin.lng}`, destination: `${route.destination.lat},${route.destination.lng}`, travelmode: 'driving' })
  if (route.waypoints.length) params.set('waypoints', route.waypoints.map(point => `${point.lat},${point.lng}`).join('|'))
  return `https://www.google.com/maps/dir/?${params}`
}

export function wazeDirectionsUrl(route) {
  return `https://waze.com/ul?ll=${route.destination.lat}%2C${route.destination.lng}&navigate=yes&zoom=12`
}
