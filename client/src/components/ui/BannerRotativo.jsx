import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

async function fetchBanners(zona) {
  const res = await fetch(`${API}/api/publicidad?zona=${zona}`)
  if (!res.ok) return []
  return res.json()
}

async function registrarClic(id) {
  await fetch(`${API}/api/publicidad/${id}/clic`, { method: 'POST' })
}

export default function BannerRotativo({ zona = 'global', className = '', intervalo = 5000 }) {
  const [idx, setIdx] = useState(0)

  const { data: banners = [] } = useQuery({
    queryKey: ['banners', zona],
    queryFn: () => fetchBanners(zona),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const siguiente = useCallback(() => {
    setIdx(i => (i + 1) % banners.length)
  }, [banners.length])

  const anterior = () => setIdx(i => (i - 1 + banners.length) % banners.length)

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(siguiente, intervalo)
    return () => clearInterval(t)
  }, [banners.length, siguiente, intervalo])

  if (!banners.length) return null

  const banner = banners[idx]
  const href = banner.link_url || (banner.whatsapp ? `https://wa.me/${banner.whatsapp.replace(/\D/g,'')}` : null)

  const handleClick = () => {
    registrarClic(banner.id)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      {/* Banner principal */}
      <div
        className={`w-full ${href ? 'cursor-pointer' : ''}`}
        onClick={href ? handleClick : undefined}
      >
        {banner.imagen_url ? (
          <img
            src={banner.imagen_url}
            alt={banner.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[80px] bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
            <p className="text-white font-bold text-sm text-center">{banner.titulo}</p>
            {href && <ExternalLink size={14} className="text-white/70 ml-2 shrink-0" />}
          </div>
        )}
      </div>

      {/* Controles (solo si hay más de 1) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); anterior() }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); siguiente() }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === idx ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Etiqueta "Publicidad" */}
      <span className="absolute top-1 right-1 text-[9px] text-white/60 bg-black/20 px-1 rounded">
        Publicidad
      </span>
    </div>
  )
}
