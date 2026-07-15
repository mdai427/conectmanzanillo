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

export function validatePassword(password) {
  const value = String(password || '')
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) || !/\d/.test(value)) return 'La contraseña debe incluir letras y números'
  return null
}
