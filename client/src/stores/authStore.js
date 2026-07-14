import { create } from 'zustand'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  capabilities: { roles: [], permissions: [], subscription: null },
  loading: true,

  init: () => {
    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null
      set({ user, loading: Boolean(user) })
      if (user) {
        await get().fetchProfile()
        set({ loading: false })
      } else {
        set({ profile: null, capabilities: { roles: [], permissions: [], subscription: null }, loading: false })
      }
    })

    // Obtener sesión actual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user || null
      set({ user, loading: Boolean(user) })
      if (user) await get().fetchProfile()
      set({ loading: false })
    })
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    let capabilities = { roles: [], permissions: [], subscription: null }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/foundations/me/capabilities`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (response.ok) capabilities = await response.json()
    } catch {
      // El perfil heredado sigue disponible mientras se aplica la migración SaaS.
    }
    set({ profile: data, capabilities })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, capabilities: { roles: [], permissions: [], subscription: null } })
  },

  hasPermission: (permission) => get().capabilities.permissions?.some((item) => (item.code || item) === permission) || false,
}))
