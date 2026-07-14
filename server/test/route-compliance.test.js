import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateRoute, evaluateSegment } from '../src/services/routeComplianceEngine.js'

const vehicle = { vehicle_configuration: 'full', gross_weight_kg: 70000, total_length_m: 31, width_m: 2.6, height_m: 4.2, full_authorization_expires_at: '2030-01-01' }

test('bloquea un full con sobrepeso', () => {
  const result = evaluateSegment(vehicle, {}, { allowed_configurations: ['full'], max_gross_weight_kg: 66000 }, new Date('2026-01-01'))
  assert.equal(result.status, 'not_authorized')
  assert.match(result.reasons[0], /peso bruto/i)
})

test('información legal ausente nunca autoriza', () => {
  assert.equal(evaluateSegment(vehicle, {}, null).status, 'insufficient_information')
})

test('una parada pendiente bloquea la asignación', () => {
  const rules = new Map([['ET', { allowed_configurations: ['full'], max_gross_weight_kg: 80000 }]])
  const result = evaluateRoute(vehicle, [{ road_name: 'Autopista', road_class: 'ET' }], rules, [{ name: 'Punto sin validar', security_level: 'pending', accepts_full: true }])
  assert.equal(result.status, 'blocked')
})
