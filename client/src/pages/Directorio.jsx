import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Phone, MessageCircle, MapPin, Star } from 'lucide-react'

const CATEGORIES = {
  taller:          { label: 'Talleres',            emoji: '🔧' },
  grua:            { label: 'Grúas',               emoji: '🚛' },
  gasolinera:      { label: 'Gasolineras',         emoji: '⛽' },
  restaurante:     { label: 'Restaurantes',        emoji: '🍽️' },
  hotel:           { label: 'Hoteles / Hospedaje', emoji: '🛏️' },
  agencia_aduanal: { label: 'Agencias Aduanales',  emoji: '📋' },
  refaccionaria:   { label: 'Refaccionarias',      emoji: '⚙️' },
  lavado:          { label: 'Lavado de Unidades',  emoji: '🚿' },
  otro:            { label: 'Otros servicios',     emoji: '📍' },
}

export default function Directorio() {
  const [activeCategory, setActiveCategory] = useState(null)

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['directory', activeCategory],
    queryFn: async () => {
      let q = supabase.from('directory_listings').select('*').eq('is_active', true)
        .order('is_featured', { ascending: false }).order('name')
      if (activeCategory) q = q.eq('category', activeCategory)
      const { data } = await q
      return data || []
    },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Directorio de Servicios</h1>
        <p className="text-[#8B949E] text-sm mt-1">
          Servicios útiles para transportistas cerca del Puerto de Manzanillo
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            !activeCategory
              ? 'bg-[#00C2FF] text-black'
              : 'bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:text-white'
          }`}>
          Todos
        </button>
        {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
          <button key={key} onClick={() => setActiveCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === key
                ? 'bg-[#00C2FF] text-black'
                : 'bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:text-white'
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#161B22] rounded-xl h-24 animate-pulse border border-[#30363D]" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-[#4B5563]">
          <p className="text-3xl mb-3">📍</p>
          <p>No hay listados en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(item => (
            <div key={item.id}
              className={`bg-[#161B22] border rounded-xl p-4 flex items-start gap-4 ${
                item.is_featured ? 'border-[#00C2FF]/30' : 'border-[#30363D]'
              }`}>
              <div className="text-2xl flex-shrink-0">{CATEGORIES[item.category]?.emoji || '📍'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm">{item.name}</h3>
                  {item.is_featured && (
                    <span className="flex items-center gap-1 text-[10px] bg-[#00C2FF]/10 text-[#00C2FF] px-2 py-0.5 rounded-full">
                      <Star size={9} fill="currentColor" /> Destacado
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[#8B949E] text-xs mt-1">{item.description}</p>
                )}
                {item.address && (
                  <p className="text-[#4B5563] text-xs mt-1 flex items-center gap-1">
                    <MapPin size={10} /> {item.address}
                  </p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {item.whatsapp && (
                    <a href={`https://wa.me/52${item.whatsapp}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-semibold">
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  )}
                  {item.phone && (
                    <a href={`tel:${item.phone}`}
                      className="flex items-center gap-1.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-xs px-3 py-1.5 rounded-lg hover:text-white transition-colors">
                      <Phone size={11} /> {item.phone}
                    </a>
                  )}
                  {item.maps_url && (
                    <a href={item.maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-xs px-3 py-1.5 rounded-lg hover:text-white transition-colors">
                      <MapPin size={11} /> Cómo llegar
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
