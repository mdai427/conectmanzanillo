import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

export function useSections() {
  const queryClient = useQueryClient()

  // Supabase Realtime: escuchar cambios en section_status_cache
  useEffect(() => {
    const channel = supabase
      .channel('section_status_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'section_status_cache',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['sections'] })
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
