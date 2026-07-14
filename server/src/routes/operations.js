import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireCompanyAccess } from '../middleware/auth.js'
import { buildOperationalAlerts, evaluateRoute } from '../services/routeComplianceEngine.js'

const router = Router()
const text = (value, max = 180) => String(value ?? '').trim().slice(0, max)
const number = (value) => value === '' || value == null ? null : Number(value)
const SOURCE_CLASSES = new Set(['official', 'third_party', 'internal', 'manual'])

router.get('/context', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('company_members').select('company_id,member_role,permissions,companies(id,trade_name,company_type,status)').eq('user_id', req.user.id).eq('status', 'active')
  if (error) return res.status(500).json({ error: 'No fue posible cargar tus empresas' })
  res.json({ companies: (data || []).map((row) => ({ ...row.companies, member_role: row.member_role, permissions: row.permissions })) })
})

router.get('/companies/:companyId/routes', requireAuth, requireCompanyAccess('operations.view'), async (req, res) => {
  const { data, error } = await supabaseAdmin.from('route_plans').select('id,name,origin,destination,departure_at,vehicle_configuration,status,compliance_result,risk_level,blocking_reasons,updated_at').eq('company_id', req.companyId).order('updated_at', { ascending: false }).limit(50)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data: data || [] })
})

router.get('/companies/:companyId/route-catalogs', requireAuth, requireCompanyAccess('operations.view'), async (req, res) => {
  const [rules, stops, risks] = await Promise.all([
    supabaseAdmin.from('route_legal_rules').select('*').eq('company_id', req.companyId).order('road_class'),
    supabaseAdmin.from('authorized_stops').select('*').eq('company_id', req.companyId).order('name'),
    supabaseAdmin.from('route_risk_segments').select('*').eq('company_id', req.companyId).order('road_name'),
  ])
  res.json({ rules: rules.data || [], stops: stops.data || [], risks: risks.data || [] })
})

router.post('/companies/:companyId/legal-rules', requireAuth, requireCompanyAccess('route.plan'), async (req, res) => {
  const roadClass = text(req.body.road_class, 20).toUpperCase()
  const allowed = Array.isArray(req.body.allowed_configurations) ? req.body.allowed_configurations.map((item) => text(item, 40)).filter(Boolean) : []
  if (!roadClass || !allowed.length || !text(req.body.source_name)) return res.status(400).json({ error: 'Clase, configuraciones permitidas y fuente son obligatorias' })
  const payload = { company_id: req.companyId, road_class: roadClass, allowed_configurations: allowed, max_gross_weight_kg: number(req.body.max_gross_weight_kg), max_length_m: number(req.body.max_length_m), max_width_m: number(req.body.max_width_m), max_height_m: number(req.body.max_height_m), requires_sict_permit: Boolean(req.body.requires_sict_permit), requires_full_authorization: Boolean(req.body.requires_full_authorization), requires_connectivity: Boolean(req.body.requires_connectivity), hazardous_allowed: req.body.hazardous_allowed == null ? null : Boolean(req.body.hazardous_allowed), source_name: text(req.body.source_name), source_class: SOURCE_CLASSES.has(req.body.source_class) ? req.body.source_class : 'manual', effective_from: req.body.effective_from || null, effective_until: req.body.effective_until || null, created_by: req.user.id }
  const { data, error } = await supabaseAdmin.from('route_legal_rules').insert(payload).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'route.rule.create', entity_type: 'route_legal_rule', entity_id: data.id, new_state: data })
  res.status(201).json(data)
})

router.post('/companies/:companyId/authorized-stops', requireAuth, requireCompanyAccess('route.plan'), async (req, res) => {
  if (!text(req.body.name) || !text(req.body.stop_type) || !text(req.body.source_name)) return res.status(400).json({ error: 'Nombre, tipo y fuente son obligatorios' })
  const payload = { company_id: req.companyId, name: text(req.body.name), stop_type: text(req.body.stop_type, 60), address: text(req.body.address, 300), latitude: number(req.body.latitude), longitude: number(req.body.longitude), radius_m: Math.max(50, Number(req.body.radius_m) || 250), accepts_truck: req.body.accepts_truck !== false, accepts_full: Boolean(req.body.accepts_full), overnight: Boolean(req.body.overnight), security_level: ['validated','recommended','aid_only','emergency','pending'].includes(req.body.security_level) ? req.body.security_level : 'pending', source_name: text(req.body.source_name), source_class: SOURCE_CLASSES.has(req.body.source_class) ? req.body.source_class : 'manual', confidence: Math.min(100, Math.max(0, Number(req.body.confidence) || 0)), created_by: req.user.id }
  const { data, error } = await supabaseAdmin.from('authorized_stops').insert(payload).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

router.post('/companies/:companyId/routes', requireAuth, requireCompanyAccess('route.plan'), async (req, res) => {
  const segments = Array.isArray(req.body.segments) ? req.body.segments.slice(0, 100) : []
  if (!text(req.body.name) || !text(req.body.origin) || !text(req.body.destination) || !text(req.body.vehicle_configuration) || !segments.length) return res.status(400).json({ error: 'Nombre, origen, destino, configuración y al menos un segmento son obligatorios' })
  const payload = {
    company_id: req.companyId, name: text(req.body.name), origin: text(req.body.origin), destination: text(req.body.destination),
    waypoints: Array.isArray(req.body.waypoints) ? req.body.waypoints.slice(0, 20) : [], departure_at: req.body.departure_at || null,
    vehicle_type: text(req.body.vehicle_type), vehicle_configuration: text(req.body.vehicle_configuration), axle_count: number(req.body.axle_count), trailer_count: number(req.body.trailer_count) || 0,
    vehicle_weight_kg: number(req.body.vehicle_weight_kg), cargo_weight_kg: number(req.body.cargo_weight_kg), gross_weight_kg: number(req.body.gross_weight_kg),
    total_length_m: number(req.body.total_length_m), width_m: number(req.body.width_m), height_m: number(req.body.height_m), cargo_type: text(req.body.cargo_type),
    hazardous_material: Boolean(req.body.hazardous_material), oversized: Boolean(req.body.oversized), sict_permit_expires_at: req.body.sict_permit_expires_at || null,
    full_authorization_expires_at: req.body.full_authorization_expires_at || null, connectivity_authorization_expires_at: req.body.connectivity_authorization_expires_at || null,
    plates: req.body.plates && typeof req.body.plates === 'object' ? req.body.plates : {}, created_by: req.user.id,
  }
  const { data: plan, error } = await supabaseAdmin.from('route_plans').insert(payload).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  const rows = segments.map((segment, index) => ({ route_plan_id: plan.id, sequence_no: index + 1, road_name: text(segment.road_name), road_class: text(segment.road_class, 20).toUpperCase(), start_km: number(segment.start_km), end_km: number(segment.end_km), direction: text(segment.direction, 50), distance_km: number(segment.distance_km), traffic_level: 'unavailable', source_name: 'Captura empresarial', source_class: 'manual', source_updated_at: new Date().toISOString() }))
  const { error: segmentError } = await supabaseAdmin.from('route_segments').insert(rows)
  if (segmentError) { await supabaseAdmin.from('route_plans').delete().eq('id', plan.id); return res.status(400).json({ error: segmentError.message }) }
  res.status(201).json(plan)
})

router.post('/companies/:companyId/routes/:routeId/evaluate', requireAuth, requireCompanyAccess('route.plan'), async (req, res) => {
  const [{ data: plan }, { data: segments }, { data: rules }, { data: stops }] = await Promise.all([
    supabaseAdmin.from('route_plans').select('*').eq('id', req.params.routeId).eq('company_id', req.companyId).single(),
    supabaseAdmin.from('route_segments').select('*').eq('route_plan_id', req.params.routeId).order('sequence_no'),
    supabaseAdmin.from('route_legal_rules').select('*').eq('company_id', req.companyId),
    supabaseAdmin.from('authorized_stops').select('*').eq('company_id', req.companyId).in('id', Array.isArray(req.body.stop_ids) ? req.body.stop_ids : []),
  ])
  if (!plan) return res.status(404).json({ error: 'Plan de ruta no encontrado' })
  const ruleMap = new Map((rules || []).map((rule) => [rule.road_class, rule]))
  const evaluation = evaluateRoute(plan, segments || [], ruleMap, stops || [])
  const updatedSegments = evaluation.segments.map((segment) => supabaseAdmin.from('route_segments').update({ compliance_status: segment.status, compliance_reasons: segment.reasons }).eq('id', segment.id))
  await Promise.all(updatedSegments)
  const { data, error } = await supabaseAdmin.from('route_plans').update({ status: evaluation.status, compliance_result: evaluation.compliance_result, blocking_reasons: evaluation.blocking_reasons, evaluation_snapshot: evaluation, updated_at: new Date().toISOString() }).eq('id', plan.id).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  const alerts = buildOperationalAlerts(evaluation)
  if (alerts.length) await supabaseAdmin.from('operational_alerts').insert(alerts.map((alert) => ({ ...alert, company_id: req.companyId, route_plan_id: plan.id, source_name: 'RouteComplianceEngine', source_class: 'internal', confidence: 100 })))
  await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'route.evaluate', entity_type: 'route_plan', entity_id: plan.id, new_state: evaluation })
  res.json({ plan: data, evaluation })
})

router.get('/companies/:companyId/customs', requireAuth, requireCompanyAccess('operations.view'), async (req, res) => {
  const { data, error } = await supabaseAdmin.from('customs_operations').select('*,customs_events(*)').eq('company_id', req.companyId).order('updated_at', { ascending: false }).limit(50)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data: data || [] })
})

router.post('/companies/:companyId/customs', requireAuth, requireCompanyAccess('customs.manage'), async (req, res) => {
  const sourceClass = SOURCE_CLASSES.has(req.body.source_class) ? req.body.source_class : 'manual'
  if (!text(req.body.reference) || !text(req.body.operation_type)) return res.status(400).json({ error: 'Referencia y tipo de operación son obligatorios' })
  const payload = { company_id: req.companyId, reference: text(req.body.reference), operation_type: text(req.body.operation_type, 30), customs_name: text(req.body.customs_name), port_name: text(req.body.port_name), terminal_name: text(req.body.terminal_name), broker_name: text(req.body.broker_name), container_number: text(req.body.container_number, 40), booking: text(req.body.booking, 60), customs_entry: text(req.body.customs_entry, 40), status_source: text(req.body.status_source) || 'Captura empresarial', source_class: sourceClass, confidence: Math.min(100, Math.max(0, Number(req.body.confidence) || 0)), next_action: text(req.body.next_action, 300), estimated_at: req.body.estimated_at || null, free_days_until: req.body.free_days_until || null, responsible_name: text(req.body.responsible_name), created_by: req.user.id }
  const { data, error } = await supabaseAdmin.from('customs_operations').insert(payload).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  await supabaseAdmin.from('customs_events').insert({ operation_id: data.id, status_code: data.status_code, status_label: data.status_label, responsible_name: data.responsible_name, source_name: data.status_source, source_class: data.source_class, confidence: data.confidence, comment: 'Operación creada', created_by: req.user.id })
  res.status(201).json(data)
})

router.post('/companies/:companyId/customs/:operationId/events', requireAuth, requireCompanyAccess('customs.manage'), async (req, res) => {
  const sourceClass = SOURCE_CLASSES.has(req.body.source_class) ? req.body.source_class : 'manual'
  const statusCode = text(req.body.status_code, 80), statusLabel = text(req.body.status_label, 120), sourceName = text(req.body.source_name)
  if (!statusCode || !statusLabel || !sourceName) return res.status(400).json({ error: 'Estado, etiqueta y fuente son obligatorios' })
  const { data: operation } = await supabaseAdmin.from('customs_operations').select('*').eq('id', req.params.operationId).eq('company_id', req.companyId).single()
  if (!operation) return res.status(404).json({ error: 'Operación no encontrada' })
  const event = { operation_id: operation.id, status_code: statusCode, status_label: statusLabel, responsible_name: text(req.body.responsible_name), source_name: sourceName, source_class: sourceClass, confidence: Math.min(100, Math.max(0, Number(req.body.confidence) || 0)), comment: text(req.body.comment, 600), occurred_at: req.body.occurred_at || new Date().toISOString(), created_by: req.user.id }
  const { data, error } = await supabaseAdmin.from('customs_events').insert(event).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  await supabaseAdmin.from('customs_operations').update({ status_code: statusCode, status_label: statusLabel, status_source: sourceName, source_class: sourceClass, confidence: event.confidence, next_action: text(req.body.next_action, 300), estimated_at: req.body.estimated_at || operation.estimated_at, updated_at: new Date().toISOString() }).eq('id', operation.id)
  await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'customs.status.update', entity_type: 'customs_operation', entity_id: operation.id, previous_state: { status_code: operation.status_code }, new_state: { status_code: statusCode, source: sourceName } })
  res.status(201).json(data)
})

router.get('/companies/:companyId/appointments', requireAuth, requireCompanyAccess('operations.view'), async (req, res) => {
  const { data, error } = await supabaseAdmin.from('port_appointments').select('*').eq('company_id', req.companyId).order('window_start', { ascending: true }).limit(100)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data: data || [] })
})

router.post('/companies/:companyId/appointments', requireAuth, requireCompanyAccess('customs.manage'), async (req, res) => {
  const sourceClass = SOURCE_CLASSES.has(req.body.source_class) ? req.body.source_class : 'manual'
  if (!text(req.body.port_name) || !text(req.body.operation_type) || !text(req.body.source_name)) return res.status(400).json({ error: 'Puerto, tipo de operación y fuente son obligatorios' })
  const payload = {
    company_id: req.companyId, customs_operation_id: req.body.customs_operation_id || null,
    port_name: text(req.body.port_name), terminal_name: text(req.body.terminal_name), operation_type: text(req.body.operation_type, 60),
    container_number: text(req.body.container_number, 40), booking: text(req.body.booking, 60), customs_entry: text(req.body.customs_entry, 40),
    carrier_name: text(req.body.carrier_name), vehicle_plate: text(req.body.vehicle_plate, 30), driver_name: text(req.body.driver_name),
    requested_at: new Date().toISOString(), window_start: req.body.window_start || null, window_end: req.body.window_end || null,
    status: 'requested', source_name: text(req.body.source_name), source_class: sourceClass, created_by: req.user.id,
  }
  const { data, error } = await supabaseAdmin.from('port_appointments').insert(payload).select('*').single()
  if (error) return res.status(400).json({ error: error.message })
  await supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: 'port.appointment.create', entity_type: 'port_appointment', entity_id: data.id, new_state: data })
  res.status(201).json(data)
})

router.get('/companies/:companyId/tower', requireAuth, requireCompanyAccess('operations.view'), async (req, res) => {
  const [routes, customs, appointments, alerts, incidents, providers] = await Promise.all([
    supabaseAdmin.from('route_plans').select('id,name,origin,destination,status,compliance_result,risk_level,updated_at').eq('company_id', req.companyId).in('status', ['blocked','conditional','approved','in_progress']).limit(100),
    supabaseAdmin.from('customs_operations').select('id,reference,status_code,status_label,container_number,source_class,confidence,updated_at,free_days_until').eq('company_id', req.companyId).limit(100),
    supabaseAdmin.from('port_appointments').select('*').eq('company_id', req.companyId).in('status', ['requested','confirmed','in_queue','entered']).limit(100),
    supabaseAdmin.from('operational_alerts').select('*').eq('company_id', req.companyId).eq('status', 'open').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('road_incidents').select('*').eq('company_id', req.companyId).is('resolved_at', null).limit(100),
    supabaseAdmin.from('integration_providers').select('id,code,name,provider_type,source_class,status,last_success_at,last_error_at').eq('company_id', req.companyId),
  ])
  res.json({ routes: routes.data || [], customs: customs.data || [], appointments: appointments.data || [], alerts: alerts.data || [], incidents: incidents.data || [], providers: providers.data || [], generated_at: new Date().toISOString(), disclaimer: 'Cada dato conserva su fuente y actualización; la ausencia de una integración no se interpreta como estado favorable.' })
})

export default router
