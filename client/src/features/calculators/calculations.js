export const OFFICIAL_VALUES = {
  updatedAt: '2026-07-14',
  umaDaily: 117.31,
  minimumWageGeneral: 315.04,
  minimumWageBorder: 440.87,
}

export const ISR_MONTHLY_2026 = [
  [0.01, 844.59, 0, 1.92], [844.60, 7168.51, 16.22, 6.40],
  [7168.52, 12598.02, 420.95, 10.88], [12598.03, 14644.64, 1011.68, 16],
  [14644.65, 17533.64, 1339.14, 17.92], [17533.65, 35362.83, 1856.84, 21.36],
  [35362.84, 55736.68, 5665.16, 23.52], [55736.69, 106410.50, 10457.09, 30],
  [106410.51, 141880.66, 25659.23, 32], [141880.67, 425641.99, 37009.69, 34],
  [425642, Infinity, 133488.54, 35],
]

const n = (value) => Number(value) || 0
const daysBetween = (start, end) => Math.max(0, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1)
const money = (value) => Math.round((n(value) + Number.EPSILON) * 100) / 100

export function vacationDaysForYears(years) {
  const completed = Math.max(1, Math.floor(n(years)))
  if (completed <= 5) return 10 + completed * 2
  return 20 + Math.floor((completed - 1) / 5) * 2
}

export function calculateMonthlyIsr({ taxableIncome }) {
  const income = Math.max(0, n(taxableIncome))
  if (!income) return result(0, [['Ingreso gravable mensual', 0], ['ISR antes de subsidio', 0]])
  const bracket = ISR_MONTHLY_2026.find((row) => income >= row[0] && income <= row[1]) || ISR_MONTHLY_2026.at(-1)
  const excess = Math.max(0, income - bracket[0])
  const marginal = excess * bracket[3] / 100
  const tax = bracket[2] + marginal
  return result(tax, [['Ingreso gravable mensual', income], ['Límite inferior', bracket[0]], ['Cuota fija', bracket[2]], [`Excedente × ${bracket[3]}%`, marginal]], { effectiveRate: income ? tax / income * 100 : 0 })
}

export function calculateSettlement(values) {
  const daily = n(values.monthlySalary) / 30
  const start = values.startDate, end = values.endDate
  const serviceDays = start && end ? daysBetween(start, end) : 0
  const serviceYears = serviceDays / 365
  const yearStart = end ? `${new Date(`${end}T12:00:00`).getFullYear()}-01-01` : end
  const yearDays = end ? daysBetween(yearStart, end) : 0
  const completedYears = Math.max(0, Math.floor(serviceYears))
  const anniversary = start && end ? new Date(new Date(`${start}T12:00:00`).setFullYear(new Date(`${end}T12:00:00`).getFullYear())) : null
  if (anniversary && anniversary > new Date(`${end}T12:00:00`)) anniversary.setFullYear(anniversary.getFullYear() - 1)
  const currentPeriodDays = anniversary && end ? daysBetween(anniversary.toISOString().slice(0,10), end) : 0
  const entitled = vacationDaysForYears(Math.max(1, completedYears + 1))
  const proportionalVacation = entitled * Math.min(1, currentPeriodDays / 365)
  const pendingVacationDays = Math.max(0, proportionalVacation - n(values.vacationDaysTaken))
  const vacationPay = daily * pendingVacationDays
  const vacationPremium = vacationPay * n(values.vacationPremium) / 100
  const aguinaldo = daily * n(values.aguinaldoDays) * Math.min(1, yearDays / 365)
  const pendingSalary = n(values.pendingSalary)
  return result(pendingSalary + aguinaldo + vacationPay + vacationPremium, [
    ['Salario pendiente capturado', pendingSalary], ['Aguinaldo proporcional', aguinaldo],
    [`Vacaciones proporcionales (${pendingVacationDays.toFixed(2)} días)`, vacationPay],
    [`Prima vacacional (${n(values.vacationPremium)}%)`, vacationPremium],
  ], { serviceYears, dailySalary: daily })
}

export function calculateLiquidation(values) {
  const daily = n(values.integratedDailySalary)
  const years = Math.max(0, n(values.yearsWorked))
  const minimum = values.salaryZone === 'border' ? OFFICIAL_VALUES.minimumWageBorder : OFFICIAL_VALUES.minimumWageGeneral
  const threeMonths = daily * 90
  const twentyDays = values.includeTwentyDays ? daily * 20 * years : 0
  const seniority = Math.min(daily, minimum * 2) * 12 * years
  const accrued = n(values.accruedBenefits)
  return result(threeMonths + twentyDays + seniority + accrued, [
    ['Indemnización de 3 meses', threeMonths],
    [values.includeTwentyDays ? '20 días por año (incluidos)' : '20 días por año (no incluidos)', twentyDays],
    ['Prima de antigüedad estimada', seniority], ['Finiquito/prestaciones capturadas', accrued],
  ], { seniorityDailyCap: minimum * 2 })
}

export function calculateFuel(values) {
  const distance = n(values.distance), efficiency = n(values.efficiency), trips = Math.max(1, n(values.trips))
  const roadLiters = efficiency > 0 ? distance / efficiency : 0
  const liters = (roadLiters + n(values.idleLiters)) * trips
  return result(liters * n(values.dieselPrice), [['Litros en recorrido', roadLiters * trips], ['Litros en ralentí/maniobras', n(values.idleLiters) * trips], ['Litros totales', liters], ['Precio por litro', n(values.dieselPrice)]], { liters })
}

export function calculateEfficiency(values) {
  const distance = n(values.distance), liters = n(values.liters)
  const kmPerLiter = liters > 0 ? distance / liters : 0
  return result(kmPerLiter, [['Kilómetros recorridos', distance], ['Litros consumidos', liters], ['Litros por 100 km', distance > 0 ? liters / distance * 100 : 0], ['Litros por hora motor', n(values.engineHours) > 0 ? liters / n(values.engineHours) : 0]], { unit: 'km/L', raw: true })
}

export function calculateTripCost(values) {
  const distance = n(values.distance), fuel = calculateFuel({ distance, efficiency: values.efficiency, dieselPrice: values.dieselPrice, idleLiters: values.idleLiters, trips: 1 }).total
  const maintenance = distance * n(values.maintenancePerKm), tires = distance * n(values.tiresPerKm)
  const tolls = n(values.tolls), operator = n(values.operatorCost), fixed = n(values.fixedAllocation), other = n(values.other)
  const total = fuel + maintenance + tires + tolls + operator + fixed + other
  return result(distance ? total / distance : 0, [['Diésel', fuel], ['Casetas', tolls], ['Operador y viáticos', operator], ['Mantenimiento', maintenance], ['Llantas', tires], ['Costos fijos asignados', fixed], ['Otros', other], ['Costo total del viaje', total]], { tripTotal: total, unit: '$/km' })
}

export function calculateTripProfit(values) {
  const revenue = n(values.revenue)
  const costs = ['fuel','tolls','operator','maintenance','fixed','other'].reduce((sum, key) => sum + n(values[key]), 0)
  const profit = revenue - costs
  return result(profit, [['Ingreso del viaje', revenue], ['Costos totales', costs], ['Utilidad antes de impuestos', profit]], { margin: revenue ? profit / revenue * 100 : 0 })
}

export function calculateOperatorCost(values) {
  const salary = n(values.monthlySalary), burden = salary * n(values.employerBurden) / 100
  const total = salary + burden + n(values.bonuses) + n(values.allowances) + n(values.other)
  return result(total, [['Salario mensual', salary], [`Carga patronal capturada (${n(values.employerBurden)}%)`, burden], ['Bonos', n(values.bonuses)], ['Viáticos', n(values.allowances)], ['Otros', n(values.other)]], { perTrip: n(values.trips) ? total / n(values.trips) : 0, perKm: n(values.kilometers) ? total / n(values.kilometers) : 0 })
}

export function calculateFleetCost(values) {
  const units = Math.max(1, n(values.units)), annual = (n(values.insuranceAnnual) + n(values.permitsAnnual)) / 12
  const total = n(values.payments) + annual + n(values.maintenance) + n(values.tires) + n(values.tracking) + n(values.payroll) + n(values.other)
  return result(total, [['Créditos/arrendamiento', n(values.payments)], ['Seguros y permisos mensualizados', annual], ['Mantenimiento', n(values.maintenance)], ['Llantas', n(values.tires)], ['GPS/telemetría', n(values.tracking)], ['Nómina', n(values.payroll)], ['Otros', n(values.other)]], { perUnit: total / units, perKm: n(values.kilometers) ? total / n(values.kilometers) : 0 })
}

function result(total, rows, extra = {}) {
  return { total: money(total), rows: rows.map(([label, value]) => [label, money(value)]), ...extra }
}
