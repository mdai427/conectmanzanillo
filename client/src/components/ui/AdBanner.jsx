import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { ExternalLink, Phone, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdBanner({ position = 'dashboard', className = '' }) {
  const [ads, setAds] = useState([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    supabase.from('ads').select('*')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('plan', { ascending: false })
      .then(({ data }) => {
        const filtered = (data || []).filter(a => a.position === position || a.position === 'all')
        setAds(filtered)
      })
  }, [position])

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => setCurrent(c => (c + 1) % ads.length), 6000)
    return () => clearInterval(timer)
  }, [ads.length])

  const trackClick = useCallback(async (adId) => {
    await supabase.rpc('increment_ad_clicks', { ad_id: adId }).catch(() => {})
  }, [])

  if (ads.length === 0) return (
    <div className={`bg-[#161B22] border border-dashed border-[#30363D] rounded-xl p-6 text-center ${className}`}>
      <p className="text-[#4B5563] text-xs">¿Quieres anunciarte aquí?</p>
      <a href="mailto:contacto@conectmanzanillo.com" className="text-[#00C2FF] text-xs hover:underline">
        Contáctanos →
      </a>
    </div>
  )

  const ad = ads[current]

  return (
    <div className={`relative bg-gradient-to-r from-[#161B22] to-[#1C2128] border border-[#00C2FF]/20 rounded-xl overflow-hidden ${className}`}>
      <span className="absolute top-2 right-2 text-[10px] text-[#4B5563] bg-[#0D1117]/80 px-2 py-0.5 rounded-full z-10">
        Publicidad
      </span>

      <div className="p-4">
        <div className="flex items-start gap-4">
          {ad.image_url ? (
            <img src={ad.image_url} alt={ad.company_name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#30363D]" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex-shrink-0
                            flex items-center justify-center text-[#00C2FF] text-xl font-bold">
              {ad.company_name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{ad.company_name}</p>
            {ad.tagline && (
              <p className="text-[#8B949E] text-xs mt-0.5 leading-snug line-clamp-2">{ad.tagline}</p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {ad.cta_url && (
                <a href={ad.cta_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackClick(ad.id)}
                  className="flex items-center gap-1.5 bg-[#00C2FF] text-black text-xs font-semibold
                             px-3 py-1.5 rounded-lg hover:bg-[#00AADD] transition-colors">
                  <ExternalLink size={11} />
                  {ad.cta_text || 'Ver más'}
                </a>
              )}
              {ad.whatsapp && (
                <a href={`https://wa.me/52${ad.whatsapp}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-700 text-white text-xs font-semibold
                             px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">
                  <MessageCircle size={11} />
                  WhatsApp
                </a>
              )}
              {ad.phone && !ad.whatsapp && (
                <a href={`tel:${ad.phone}`}
                  className="flex items-center gap-1.5 bg-[#161B22] text-[#8B949E] border border-[#30363D]
                             text-xs px-3 py-1.5 rounded-lg hover:text-white transition-colors">
                  <Phone size={11} />
                  {ad.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {ads.length > 1 && (
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex gap-1">
            {ads.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-[#00C2FF] w-4' : 'bg-[#30363D] w-1.5'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCurrent(c => (c - 1 + ads.length) % ads.length)}
              className="p-1 text-[#4B5563] hover:text-white transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setCurrent(c => (c + 1) % ads.length)}
              className="p-1 text-[#4B5563] hover:text-white transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
