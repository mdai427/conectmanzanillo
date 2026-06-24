import { create } from 'zustand'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  init: () => {
    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null
      set({ user, loading: false })
      if (user) {
        get().fetchProfile()
      } else {
        set({ profile: null })
      }
    })

    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null
      set({ user, loading: false })
      if (user) get().fetchProfile()
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
    set({ profile: data })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
