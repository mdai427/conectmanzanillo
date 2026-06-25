import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, X } from 'lucide-react'

export default function EmergencyBanner() {
  const [alert, setAlert] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    supabase
      .from('emergency_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAlert(data))

    const channel = supabase
      .channel('emergency')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => {
          supabase.from('emergency_alerts').select('*').eq('is_active', true)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
            .then(({ data }) => { setAlert(data); setDismissed(false) })
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (!alert || dismissed) return null

  return (
    <div className="relative z-50 bg-red-600 border-b-2 border-red-400">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <AlertTriangle size={18} className="text-white flex-shrink-0 animate-pulse" />
        <p className="text-white font-semibold text-sm flex-1">
          ⚠️ ALERTA ACTIVA: {alert.message}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-200 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
