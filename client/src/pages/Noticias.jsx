import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import NewsCard from '../components/ui/NewsCard'
import { Newspaper } from 'lucide-react'

export default function Noticias() {
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data } = await supabase
        .from('news_items')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
      return data || []
    },
    staleTime: 60_000,
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Newspaper className="text-[#00C2FF]" size={24} />
        <div>
          <h1 className="text-xl font-bold text-white">Noticias del Día</h1>
          <p className="text-[#8B949E] text-sm">Avisos, cierres y novedades del puerto</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#161B22] rounded-xl h-20 animate-pulse border border-[#30363D]" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-16 text-[#4B5563]">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay noticias publicadas hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map(item => <NewsCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
