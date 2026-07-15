import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMexicoPhone, phoneToAuthEmail, validatePassword } from '../src/services/phoneIdentity.js'

test('normaliza teléfonos mexicanos al formato internacional', () => {
  assert.equal(formatMexicoPhone('314 123 4567'), '+523141234567')
  assert.equal(formatMexicoPhone('+52 314 123 4567'), '+523141234567')
  assert.equal(formatMexicoPhone('123'), null)
})

test('genera la identidad interna estable usada por cuentas existentes', () => {
  assert.equal(phoneToAuthEmail('3141234567'), '523141234567@phone.faroportuario.app')
})

test('exige contraseñas de al menos ocho caracteres con letras y números', () => {
  assert.match(validatePassword('corta1'), /8 caracteres/)
  assert.match(validatePassword('sololetras'), /letras y números/)
  assert.equal(validatePassword('Puerto2026'), null)
})
