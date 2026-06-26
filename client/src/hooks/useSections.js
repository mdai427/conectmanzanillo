import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export function useSections() {
  const queryClient = useQueryClient()
  // slug -> timestamp of last status change (for pulse animation)
  const recentChanges = useRef({})

  useEffect(() => {
    const channel = supabase
      .channel('section_status_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'section_status_cache',
      }, (payload) => {
        const { section_id, current_status, active_reports, confidence, last_report_at } = payload.new || {}

        // Update React Query cache directly — no round-trip to API
        queryClient.setQueryData(['sections'], (old) => {
          if (!old) return old
          return old.map(s => {
            if (s.id !== section_id) return s
            recentChanges.current[s.slug] = Date.now()
            return {
              ...s,
              status: current_status ?? s.status,
              active_reports: active_reports ?? s.active_reports,
              confidence: confidence ?? s.confidence,
              last_report_at: last_report_at ?? s.last_report_at,
            }
          })
        })

        // Also invalidate after 2s to ensure full consistency
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['sections'] })
        }, 2000)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [queryClient])

  return useQuery({
    queryKey: ['sections'],
    queryFn: api.getSections,
    refetchInterval: 60_000,
  })
}

// Hook para saber si una zona cambió recientemente (para animación de pulso)
export function useRecentChange(slug, windowMs = 8000) {
  const queryClient = useQueryClient()
  // We expose this via a separate mechanism — see PortMap usage
  return false
}
