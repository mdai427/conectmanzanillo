import { supabase } from '../lib/supabase.js'

const API = import.meta.env.VITE_API_URL || ''

// ── Phone OTP (flujo principal) ──────────────────────────────────────────────

export async function sendOtp(phone) {
  const res = await fetch(`${API}/api/phone-auth/send`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al enviar SMS')
  return data
}

export async function verifyOtp({ phone, code, fullName, tipo }) {
  const res = await fetch(`${API}/api/phone-auth/verify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ phone, code, fullName, tipo }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Código incorrecto')

  // Usar token_hash para crear sesión en Supabase
  const { data: session, error } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type:       'email',
  })
  if (error) throw new Error(error.message)
  return { session, isNew: data.isNew }
}

// ── Email/password (legacy — mantener por si acaso) ──────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signUp(email, password, fullName, tipo = 'otro') {
  const roleMap = { operador: 'operator_free', empresa: 'company', otro: 'operator_free' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:    fullName,
        tipo_usuario: tipo,
        role:         roleMap[tipo] || 'operator_free',
      },
    },
  })
  if (error) throw new Error(error.message)
  return data
}
