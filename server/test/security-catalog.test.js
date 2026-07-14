import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidAccountSelection, normalizeBearerToken, PERMISSIONS } from '../src/security/catalog.js'

test('acepta combinaciones válidas de cuenta', () => {
  assert.equal(isValidAccountSelection('person', 'operator'), true)
  assert.equal(isValidAccountSelection('company', 'carrier'), true)
})

test('rechaza tipos cruzados o desconocidos', () => {
  assert.equal(isValidAccountSelection('person', 'carrier'), false)
  assert.equal(isValidAccountSelection('company', 'operator'), false)
  assert.equal(isValidAccountSelection('admin', 'carrier'), false)
})

test('extrae únicamente tokens Bearer válidos', () => {
  assert.equal(normalizeBearerToken('Bearer abc.def'), 'abc.def')
  assert.equal(normalizeBearerToken('bearer token'), 'token')
  assert.equal(normalizeBearerToken('Basic token'), null)
  assert.equal(normalizeBearerToken(''), null)
})

test('el catálogo contiene permisos críticos separados', () => {
  for (const permission of ['freight.create', 'company.verify', 'subscription.manage', 'admin.roles.manage']) {
    assert.equal(PERMISSIONS.includes(permission), true)
  }
})
