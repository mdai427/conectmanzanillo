import { supabase } from '../lib/supabase.js'
import { fetchApi } from '../lib/apiBase.js'

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  const local = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits
  if (local.length !== 10) throw new Error('Ingresa un número mexicano válido de 10 dígitos')
  return `+52${local}`
}

function phoneToAuthEmail(phone) {
  return `${normalizePhone(phone).slice(1)}@phone.faroportuario.app`
}

async function post(path, body) {
  const response = await fetchApi(`/api/phone-auth${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No fue posible completar la operación')
  return data
}

export async function sendOtp(phone, purpose = 'register') {
  return post('/send', { phone, purpose })
}

export async function verifyOtp({ phone, code, fullName, accountKind, accountType, password, smsNotificationsEnabled }) {
  const data = await post('/verify', { phone, code, fullName, accountKind, accountType, password, smsNotificationsEnabled })
  const { data: session, error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' })
  if (error) throw new Error(error.message)
  return { session, isNew: data.isNew }
}

export async function signInWithPhonePassword(phone, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: phoneToAuthEmail(phone), password })
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new Error('Número o contraseña incorrectos')
    throw new Error(error.message)
  }
  return data
}

export async function resetPasswordWithOtp({ phone, code, password }) {
  return post('/reset-password', { phone, code, password })
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signUp(email, password, fullName, tipo = 'otro') {
  const roleMap = { operador: 'operator_free', empresa: 'company', otro: 'operator_free' }
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, tipo_usuario: tipo, role: roleMap[tipo] || 'operator_free' } },
  })
  if (error) throw new Error(error.message)
  return data
}
