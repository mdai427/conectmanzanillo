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
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['section', slug] })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [slug, queryClient])

  return useQuery({
    queryKey: ['section', slug],
    queryFn: () => api.getSection(slug),
    enabled: !!slug,
  })
}
