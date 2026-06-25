import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Radio } from 'lucide-react'

const CATEGORY_LABELS = {
  aviso:     '📢 AVISO',
  cierre:    '🚫 CIERRE',
  operativo: '🚔 OPERATIVO',
  clima:     '🌤️ CLIMA',
  general:   '📌 INFO',
}

export default function NewsTicker() {
  const [items, setItems] = useState([])

  useEffect(() => {
    supabase
      .from('news_items')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setItems(data || []))
  }, [])

  if (items.length === 0) return null

  const text = items.map(i => `${CATEGORY_LABELS[i.category] || '📌'}: ${i.content}`).join('   ·   ')

  return (
    <div className="bg-[#00C2FF] overflow-hidden h-8 flex items-center">
      <div className="flex-shrink-0 flex items-center gap-2 bg-[#0091BF] px-3 h-full z-10">
        <Radio size={13} className="text-black animate-pulse" />
        <span className="text-black text-xs font-bold uppercase tracking-wide whitespace-nowrap">
          EN VIVO
        </span>
      </div>
      <div className="overflow-hidden flex-1">
        <div
          className="whitespace-nowrap text-black text-xs font-semibold"
          style={{
            display: 'inline-block',
            animation: 'ticker 40s linear infinite',
            paddingLeft: '100%',
          }}
        >
          {text}
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}
