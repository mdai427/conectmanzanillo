export function formatMexicoPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `+52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`
  return null
}

export function phoneToAuthEmail(phone) {
  const formatted = formatMexicoPhone(phone)
  return formatted ? `${formatted.slice(1)}@phone.faroportuario.app` : null
}

// Contraseñas triviales más comunes en español/inglés (comparación en minúsculas)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'contrasena', 'contrasena1', 'contrasena123',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'faroportuario', 'manzanillo', 'iloveyou', 'admin123', 'welcome1',
])

export function validatePassword(password) {
  const value = String(password || '')
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (value.length > 72) return 'La contraseña no puede exceder 72 caracteres'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) || !/\d/.test(value)) return 'La contraseña debe incluir letras y números'
  if (/^(.)\1+$/.test(value)) return 'La contraseña es demasiado sencilla'
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return 'Elige una contraseña menos común'
  return null
}
