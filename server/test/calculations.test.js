import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateEfficiency, calculateFuel, calculateLiquidation, calculateMonthlyIsr,
  calculateSettlement, calculateTripCost, calculateTripProfit, vacationDaysForYears,
} from '../../client/src/features/calculators/calculations.js'

test('aplica la tarifa mensual ISR 2026 correcta', () => {
  const result = calculateMonthlyIsr({ taxableIncome: 30000 })
  assert.equal(result.total, 4519.65)
  assert.ok(result.effectiveRate > 15 && result.effectiveRate < 16)
})

test('usa la progresión vigente de vacaciones dignas', () => {
  assert.deepEqual([1, 2, 5, 6, 10, 11].map(vacationDaysForYears), [12, 14, 20, 22, 22, 24])
})

test('desglosa finiquito sin ocultar prestaciones proporcionales', () => {
  const result = calculateSettlement({ monthlySalary: 15000, startDate: '2024-01-15', endDate: '2026-07-14', pendingSalary: 1000, vacationDaysTaken: 0, aguinaldoDays: 15, vacationPremium: 25 })
  assert.ok(result.total > 1000)
  assert.equal(result.rows.length, 4)
})

test('usa doce días de vacaciones durante el primer año', () => {
  const result = calculateSettlement({ monthlySalary: 12000, startDate: '2026-01-01', endDate: '2026-07-01', pendingSalary: 0, vacationDaysTaken: 0, aguinaldoDays: 15, vacationPremium: 25 })
  const vacationRow = result.rows.find(([label]) => label.startsWith('Vacaciones proporcionales'))
  assert.match(vacationRow[0], /5\.98 días/)
})

test('separa conceptos condicionados en liquidación', () => {
  const withoutTwenty = calculateLiquidation({ integratedDailySalary: 650, yearsWorked: 3, salaryZone: 'general', includeTwentyDays: false, accruedBenefits: 0 })
  const withTwenty = calculateLiquidation({ integratedDailySalary: 650, yearsWorked: 3, salaryZone: 'general', includeTwentyDays: true, accruedBenefits: 0 })
  assert.equal(withTwenty.total - withoutTwenty.total, 39000)
})

test('calcula combustible, rendimiento, costo y utilidad con entradas empresariales', () => {
  assert.equal(calculateFuel({ distance: 600, efficiency: 2, dieselPrice: 25, idleLiters: 0, trips: 1 }).total, 7500)
  assert.equal(calculateEfficiency({ distance: 1000, liters: 400 }).total, 2.5)
  assert.equal(calculateTripCost({ distance: 100, efficiency: 2, dieselPrice: 20, idleLiters: 0, tolls: 0, operatorCost: 0, maintenancePerKm: 1, tiresPerKm: 1, fixedAllocation: 0, other: 0 }).total, 12)
  assert.equal(calculateTripProfit({ revenue: 10000, fuel: 2000, tolls: 500, operator: 1000, maintenance: 500, fixed: 500, other: 500 }).total, 5000)
})
