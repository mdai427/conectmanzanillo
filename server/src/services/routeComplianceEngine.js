const BLOCKING = new Set(['not_authorized', 'restricted', 'insufficient_information'])

const validDate = (value, today = new Date()) => value && new Date(`${value}T23:59:59Z`) >= today
const exceeds = (value, limit) => value != null && limit != null && Number(value) > Number(limit)

export function evaluateSegment(vehicle, segment, rule, today = new Date()) {
  const reasons = []
  if (!rule) return { status: 'insufficient_information', reasons: ['No existe una regla legal vigente para este segmento'] }
  if (rule.allowed_configurations?.length && !rule.allowed_configurations.includes(vehicle.vehicle_configuration)) reasons.push('La configuración vehicular no está permitida')
  if (exceeds(vehicle.gross_weight_kg, rule.max_gross_weight_kg)) reasons.push('El peso bruto excede el límite configurado')
  if (exceeds(vehicle.total_length_m, rule.max_length_m) || exceeds(vehicle.width_m, rule.max_width_m) || exceeds(vehicle.height_m, rule.max_height_m)) reasons.push('Las dimensiones exceden el límite configurado')
  if (vehicle.hazardous_material && rule.hazardous_allowed === false) reasons.push('El segmento restringe materiales peligrosos')
  if (rule.requires_sict_permit && !validDate(vehicle.sict_permit_expires_at, today)) reasons.push('Permiso SICT faltante o vencido')
  if (rule.requires_full_authorization && !validDate(vehicle.full_authorization_expires_at, today)) reasons.push('Autorización para full faltante o vencida')
  if (rule.requires_connectivity && !validDate(vehicle.connectivity_authorization_expires_at, today)) reasons.push('Autorización de conectividad faltante o vencida')
  if (reasons.length) {
    const connectivityOnly = reasons.every((reason) => reason.includes('conectividad'))
    const permitOnly = reasons.every((reason) => reason.includes('Permiso') || reason.includes('Autorización'))
    return { status: connectivityOnly ? 'requires_connectivity' : permitOnly ? 'requires_permit' : 'not_authorized', reasons }
  }
  const conditions = []
  if (rule.requires_sict_permit) conditions.push('Circular con permiso SICT vigente')
  if (rule.requires_full_authorization) conditions.push('Conservar autorización para full disponible')
  if (rule.requires_connectivity) conditions.push('Respetar los segmentos y horarios de conectividad autorizados')
  return { status: conditions.length ? 'authorized_with_conditions' : 'authorized', reasons: conditions }
}

export function evaluateRoute(vehicle, segments, rulesByClass, stops = []) {
  const evaluatedSegments = segments.map((segment) => ({
    ...segment,
    ...evaluateSegment(vehicle, segment, rulesByClass.get(segment.road_class)),
  }))
  const blockingReasons = evaluatedSegments.filter((segment) => BLOCKING.has(segment.status) || segment.status.startsWith('requires_')).flatMap((segment) => segment.reasons.map((reason) => `${segment.road_name}: ${reason}`))
  const invalidStops = stops.filter((stop) => stop.security_level === 'pending' || (vehicle.vehicle_configuration === 'full' && !stop.accepts_full))
  invalidStops.forEach((stop) => blockingReasons.push(`${stop.name}: parada no validada para esta configuración`))
  const conditional = evaluatedSegments.some((segment) => segment.status === 'authorized_with_conditions')
  return {
    status: blockingReasons.length ? 'blocked' : conditional ? 'conditional' : 'approved',
    compliance_result: blockingReasons.length ? 'not_authorized' : conditional ? 'authorized_with_conditions' : 'authorized',
    blocking_reasons: blockingReasons,
    segments: evaluatedSegments,
    evaluated_at: new Date().toISOString(),
    disclaimer: 'Validación basada en reglas y fuentes registradas; requiere confirmación cuando la fuente o vigencia sea insuficiente.',
  }
}

export function buildOperationalAlerts(routeEvaluation, customsOperation) {
  const alerts = []
  if (routeEvaluation?.status === 'blocked') alerts.push({ alert_type: 'route_compliance', severity: 'critical', title: 'Asignación bloqueada', message: routeEvaluation.blocking_reasons.join(' · '), recommended_action: 'Corregir configuración, permisos o segmentos antes de asignar.' })
  if (customsOperation?.free_days_until) {
    const remaining = Math.ceil((new Date(`${customsOperation.free_days_until}T23:59:59Z`) - new Date()) / 86400000)
    if (remaining <= 1) alerts.push({ alert_type: 'free_days', severity: remaining < 0 ? 'critical' : 'high', title: 'Días libres por vencer', message: remaining < 0 ? 'El periodo de días libres ya venció.' : 'El periodo de días libres termina en un día.', recommended_action: 'Confirmar liberación, cita y retiro con la fuente responsable.' })
  }
  return alerts
}
