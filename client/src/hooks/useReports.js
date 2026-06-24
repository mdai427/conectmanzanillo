import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSocketEvent } from './useRealtime.js'
import { api } from '../lib/api.js'

export function useReports(sectionSlug, sectionId) {
  const queryClient = useQueryClient()

  // Socket.io: nuevo reporte en tiempo real
  useSocketEvent('new_report', (report) => {
    if (report.section_id === sectionId) {
      queryClient.invalidateQueries({ queryKey: ['reports', sectionSlug] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
    }
  })

  useSocketEvent('reaction_update', () => {
    queryClient.invalidateQueries({ queryKey: ['reports', sectionSlug] })
  })

  return useQuery({
    queryKey: ['reports', sectionSlug],
    queryFn: () => api.getReports(sectionSlug),
    enabled: !!sectionSlug,
    refetchInterval: 30_000,
  })
}

export function usePostReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.postReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
    },
  })
}

export function usePostReaction() {
  return useMutation({ mutationFn: api.postReaction })
}
