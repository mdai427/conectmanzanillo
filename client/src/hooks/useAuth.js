import { supabase } from '../lib/supabase.js'

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signUp(email, password, fullName, tipo = 'otro') {
  // Mapear tipo de usuario a rol inicial
  const roleMap = {
    operador: 'operator_free',
    empresa:  'company',
    otro:     'operator_free',
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        tipo_usuario: tipo,
        role: roleMap[tipo] || 'operator_free',
      },
    },
  })
  if (error) throw new Error(error.message)
  return data
}
