import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Phone, MessageCircle, MapPin, Star, BookOpen } from 'lucide-react'

const CATEGORIES = {
  taller:          { label: 'Talleres',            emoji: '🔧' },
  grua:            { label: 'Grúas',               emoji: '🚛' },
  gasolinera:      { label: 'Gasolineras',         emoji: '⛽' },
  restaurante:     { label: 'Restaurantes',        emoji: '🍽️' },
  hotel:           { label: 'Hoteles',             emoji: '🛏️' },
  agencia_aduanal: { label: 'Ag. Aduanales',       emoji: '📋' },
  refaccionaria:   { label: 'Refaccionarias',      emoji: '⚙️' },
  lavado:          { label: 'Lavado',              emoji: '🚿' },
  otro:            { label: 'Otros',               emoji: '📍' },
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Directorio de Servicios</h1>
              <p className="text-slate-500 text-sm">Servicios útiles para transportistas cerca del Puerto</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-5">
          <button onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              !activeCategory
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300 hover:text-teal-600'
            }`}>
            Todos
          </button>
          {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
            <button key={key} onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeCategory === key
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300 hover:text-teal-600'
              }`}>
              {emoji} {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="text-3xl mb-3">📍</p>
            <p className="text-slate-500 font-medium">No hay listados en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(item => (
              <div key={item.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-4 flex items-start gap-4 ${
                  item.is_featured ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
                }`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-slate-50 border border-slate-200">
                  {CATEGORIES[item.category]?.emoji || '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-slate-800 font-bold text-sm">{item.name}</h3>
                    {item.is_featured && (
                      <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                        <Star size={9} fill="currentColor" /> Destacado
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-slate-500 text-xs mb-1 leading-relaxed">{item.description}</p>
                  )}
                  {item.address && (
                    <p className="text-slate-400 text-xs flex items-center gap-1 mb-2">
                      <MapPin size={10} /> {item.address}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {item.whatsapp && (
                      <a href={`https://wa.me/52${item.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-bold">
                        <MessageCircle size={11} /> WhatsApp
                      </a>
                    )}
                    {item.phone && (
                      <a href={`tel:${item.phone}`}
                        className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                        <Phone size={11} /> {item.phone}
                      </a>
                    )}
                    {item.maps_url && (
                      <a href={item.maps_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-600 text-xs px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors font-medium">
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
    </div>
  )
}
