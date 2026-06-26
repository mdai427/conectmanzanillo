import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export function useSectionStatus(slug) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!slug) return
    const channel = supabase
      .channel(`section_status_${slug}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'section_status_cache',
      }, (payload) => {
        // Actualizar cache directamente si el payload tiene datos
        if (payload.new) {
          queryClient.setQueryData(['section', slug], (old) => {
            if (!old) return old
            const { current_status, active_reports, confidence, last_report_at } = payload.new
            return {
              ...old,
              status: current_status ?? old.status,
              active_reports: active_reports ?? old.active_reports,
              confidence: confidence ?? old.confidence,
              last_report_at: last_report_at ?? old.last_report_at,
            }
          })
        } else {
          queryClient.invalidateQueries({ queryKey: ['section', slug] })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [slug, queryClient])

  return useQuery({
    queryKey: ['section', slug],
    queryFn: () => api.getSection(slug),
    enabled: !!slug,
    staleTime: 30_000,
    refetchInterval: 60_000, // fallback si el websocket se desconecta
  })
}
