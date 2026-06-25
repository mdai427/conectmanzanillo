import { useEffect, useState } from 'react'
import { Wind, Thermometer, Droplets, Eye } from 'lucide-react'

const WMO_CODES = {
  0:  { label: 'Despejado',              emoji: '☀️' },
  1:  { label: 'Mayormente despejado',   emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado',   emoji: '⛅' },
  3:  { label: 'Nublado',               emoji: '☁️' },
  45: { label: 'Neblina',               emoji: '🌫️' },
  61: { label: 'Lluvia ligera',          emoji: '🌦️' },
  63: { label: 'Lluvia moderada',        emoji: '🌧️' },
  65: { label: 'Lluvia intensa',         emoji: '⛈️' },
  80: { label: 'Chubascos',             emoji: '🌧️' },
  95: { label: 'Tormenta',              emoji: '⛈️' },
}

const LAT = 19.0522
const LON = -104.3154

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weathercode,visibility&wind_speed_unit=kmh&timezone=America%2FMexico_City`)
      .then(r => r.json())
      .then(d => { setWeather(d.current); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const condition = WMO_CODES[weather?.weathercode] || { label: 'Sin datos', emoji: '❓' }

  const getWindAlert = (speed) => {
    if (speed > 50) return { text: 'Viento fuerte · Precaución en maniobras', color: 'text-red-400' }
    if (speed > 30) return { text: 'Viento moderado', color: 'text-amber-400' }
    return null
  }

  const windAlert = weather ? getWindAlert(weather.wind_speed_10m) : null

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-[#4B5563] uppercase tracking-widest">
          Clima · Puerto Manzanillo
        </span>
        <span className="text-xs text-[#4B5563]">Open-Meteo</span>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse bg-[#30363D] rounded-lg" />
      ) : !weather ? (
        <p className="text-[#4B5563] text-sm text-center py-4">No disponible</p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">{condition.emoji}</span>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{Math.round(weather.temperature_2m)}°</span>
                <span className="text-[#8B949E] text-sm">C</span>
              </div>
              <p className="text-[#8B949E] text-xs">{condition.label}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col items-center bg-[#0D1117] rounded-lg p-2 gap-1">
              <Wind size={14} className="text-[#00C2FF]" />
              <span className="text-white font-semibold">{Math.round(weather.wind_speed_10m)}</span>
              <span className="text-[#4B5563]">km/h</span>
            </div>
            <div className="flex flex-col items-center bg-[#0D1117] rounded-lg p-2 gap-1">
              <Droplets size={14} className="text-blue-400" />
              <span className="text-white font-semibold">{weather.relative_humidity_2m}%</span>
              <span className="text-[#4B5563]">Humedad</span>
            </div>
            <div className="flex flex-col items-center bg-[#0D1117] rounded-lg p-2 gap-1">
              <Eye size={14} className="text-green-400" />
              <span className="text-white font-semibold">
                {weather.visibility ? `${(weather.visibility / 1000).toFixed(0)}km` : '—'}
              </span>
              <span className="text-[#4B5563]">Visib.</span>
            </div>
          </div>

          {windAlert && (
            <div className={`mt-3 text-xs ${windAlert.color} bg-[#0D1117] rounded-lg px-3 py-2 flex items-center gap-2`}>
              <Wind size={12} />
              {windAlert.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}
