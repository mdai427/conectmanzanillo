import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export function useSections() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('section_status_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'section_status_cache',
      }, (payload) => {
        const { section_id, current_status, active_reports, confidence, last_report_at } = payload.new || {}

        // Actualiza el cache directamente — sin round-trip al API
        queryClient.setQueryData(['sections'], (old) => {
          if (!old) return old
          return old.map(s => {
            if (s.id !== section_id) return s
            return {
              ...s,
              status: current_status ?? s.status,
              active_reports: active_reports ?? s.active_reports,
              confidence: confidence ?? s.confidence,
              last_report_at: last_report_at ?? s.last_report_at,
            }
          })
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [queryClient])

  return useQuery({
    queryKey: ['sections'],
    queryFn: api.getSections,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
