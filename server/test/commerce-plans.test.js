import test from 'node:test'
import assert from 'node:assert/strict'
import { commercePlan, publicCommercePlans } from '../src/services/commercePlans.js'

test('la membresía de vacantes cuesta 599 MXN mensuales', () => {
  assert.equal(commercePlan('job_membership').monthlyPrice, 599)
})

test('Marketplace respeta los tres precios y límites comerciales', () => {
  const plans = publicCommercePlans('marketplace')
  assert.deepEqual(plans.map(plan => [plan.monthly_price, plan.product_limit]), [[599,3],[799,10],[1399,null]])
})

test('no expone planes fuera del tipo solicitado', () => {
  assert.ok(publicCommercePlans('jobs').every(plan => plan.kind === 'jobs'))
  assert.ok(publicCommercePlans('marketplace').every(plan => plan.kind === 'marketplace'))
})
