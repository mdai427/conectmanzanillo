import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth, requireCompanyAccess, requirePermission } from '../middleware/auth.js'
import { ACCOUNT_KINDS, isValidAccountSelection } from '../security/catalog.js'
import { randomUUID } from 'crypto'
import { acceptedSuggestionUpdates, createDocumentExtractionProvider } from '../services/documentExtraction.js'
import { createVerificationEmailProvider } from '../services/verificationEmail.js'
import { syncCompanyToDirectory } from '../services/companyDirectorySync.js'

const router = Router()
const cleanText = (value, max = 160) => String(value || '').trim().slice(0, max)
const allowedDocumentTypes = new Set(['tax_certificate', 'official_id', 'proof_of_address', 'incorporation_deed', 'legal_representative_id'])

async function notifyVerification(company, status, reason = null) {
  if (!company?.business_email) return
  const provider = createVerificationEmailProvider()
  let result
  try {
    result = await provider.send({ to: company.business_email, companyName: company.trade_name || company.legal_name, status, reason })
  } catch (error) {
    result = { delivered: false, status: 'failed', provider: provider.code, error: error.message }
  }
  await supabaseAdmin.from('verification_email_deliveries').insert({
    company_id: company.id,
    recipient: company.business_email,
    template: status === 'rejected' ? 'corrections_required' : status,
    provider: result.provider || provider.code,
    delivery_status: result.status,
    provider_message_id: result.providerMessageId || null,
    error_message: result.error || null,
  }).then(({ error }) => { if (error) console.error('[verification/email-log]', error.message) })
}

router.get('/account-types', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('account_types').select('code, account_kind, name, description, sort_order').eq('is_active', true).order('account_kind').order('sort_order')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/plans', async (req, res) => {
  let query = supabaseAdmin.from('plans').select('id, code, name, audience, description, currency, monthly_price, annual_price, trial_days, is_featured').eq('is_active', true).order('sort_order')
  if (req.query.audience) query = query.eq('audience', req.query.audience)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/me/capabilities', requireAuth, async (req, res) => {
  const [{ data: profile }, { data: roles }, { data: subscription }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, account_kind, account_type, onboarding_status, is_verified').eq('id', req.user.id).single(),
    supabaseAdmin.from('user_roles').select('roles(code, name), role_id').eq('user_id', req.user.id),
    supabaseAdmin.from('subscriptions').select('id, estatus, billing_period, plan_id, plans(code, name)').eq('user_id', req.user.id).in('estatus', ['activa', 'pendiente']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const { data: permissions } = await supabaseAdmin.rpc('get_user_permissions', { p_user_id: req.user.id })
  res.json({ profile, roles: roles || [], permissions: permissions || [], subscription: subscription || null })
})

router.post('/me/account', requireAuth, async (req, res) => {
  const { account_kind: kind, account_type: type } = req.body
  if (!ACCOUNT_KINDS.includes(kind) || !isValidAccountSelection(kind, type)) return res.status(400).json({ error: 'Tipo de cuenta inválido' })

  const { data, error } = await supabaseAdmin.from('profiles').update({ account_kind: kind, account_type: type, onboarding_status: 'profile_pending', updated_at: new Date().toISOString() }).eq('id', req.user.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/companies/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('company_members').select('member_role, status, companies(*)').eq('user_id', req.user.id).eq('status', 'active')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/companies', requireAuth, async (req, res) => {
  const { company_type: type } = req.body
  if (!isValidAccountSelection('company', type)) return res.status(400).json({ error: 'Tipo de empresa inválido' })
  const legalName = cleanText(req.body.legal_name, 180)
  const tradeName = cleanText(req.body.trade_name, 140)
  if (!legalName || !tradeName) return res.status(400).json({ error: 'Razón social y nombre comercial son requeridos' })

  const { data, error } = await supabaseAdmin.rpc('create_company_draft', {
    p_owner_id: req.user.id,
    p_company_type: type,
    p_legal_name: legalName,
    p_trade_name: tradeName,
  })
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

router.patch('/companies/:companyId', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const allowed = ['legal_name', 'trade_name', 'legal_entity_type', 'tax_id', 'tax_regime', 'fiscal_address', 'founded_year', 'responsible_name', 'responsible_title', 'business_email', 'phone', 'whatsapp', 'website', 'description', 'services', 'coverage', 'ports_served', 'states_served', 'business_hours']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
  for (const key of ['tax_id', 'tax_regime', 'fiscal_address', 'responsible_name', 'responsible_title', 'business_email', 'phone', 'whatsapp', 'website', 'description']) {
    if (key in updates) updates[key] = cleanText(updates[key], key === 'description' ? 2000 : 300) || null
  }
  if (updates.tax_id) updates.tax_id = updates.tax_id.slice(0, 13).toUpperCase()
  if ('legal_entity_type' in updates && !['individual_business', 'legal_entity'].includes(updates.legal_entity_type)) return res.status(400).json({ error: 'Tipo de personalidad jurídica inválido' })
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('companies').update(updates).eq('id', req.companyId).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/companies/:companyId/submit-verification', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const { data: company, error: readError } = await supabaseAdmin.from('companies').select('*').eq('id', req.companyId).single()
  if (readError || !company) return res.status(404).json({ error: 'Empresa no encontrada' })
  const missing = ['legal_name', 'trade_name', 'legal_entity_type', 'tax_id', 'fiscal_address', 'responsible_name', 'business_email'].filter((field) => !company[field])
  if (missing.length) return res.status(422).json({ error: 'Registro incompleto', missing_fields: missing })
  if (!['draft', 'incomplete', 'corrections_required'].includes(company.status)) return res.status(409).json({ error: 'La empresa no puede enviarse desde su estado actual' })
  const requiredDocuments = company.legal_entity_type === 'individual_business' ? ['tax_certificate', 'official_id', 'proof_of_address'] : ['tax_certificate', 'incorporation_deed', 'legal_representative_id', 'proof_of_address']
  const [{ data: companyDocuments }, { count: subscriptions }] = await Promise.all([
    supabaseAdmin.from('company_documents').select('document_type,extraction_status').eq('company_id', req.companyId).in('document_type', requiredDocuments).is('deleted_at', null),
    supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('company_id', req.companyId).in('estatus', ['activa', 'pendiente']),
  ])
  const uploadedTypes = new Set((companyDocuments || []).filter((document) => !['awaiting_upload', 'processing'].includes(document.extraction_status)).map((document) => document.document_type))
  const missingDocuments = requiredDocuments.filter((type) => !uploadedTypes.has(type))
  if (missingDocuments.length) return res.status(422).json({ error: 'Registro incompleto', missing_fields: missingDocuments })
  if (!subscriptions) return res.status(422).json({ error: 'Registro incompleto', missing_fields: ['plan'] })

  const { data, error } = await supabaseAdmin.from('companies').update({ status: 'pending_verification', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.companyId).select().single()
  if (error) return res.status(400).json({ error: error.message })
  await supabaseAdmin.from('company_verifications').insert({ company_id: req.companyId, level: 2, status: 'pending', requested_by: req.user.id })
  await Promise.allSettled([syncCompanyToDirectory(supabaseAdmin, data), notifyVerification(data, 'submitted')])
  res.json(data)
})

router.post('/companies/:companyId/documents/upload-url', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const allowedMime = new Map([['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png']])
  const mimeType = cleanText(req.body.mime_type, 80)
  const sizeBytes = Number(req.body.size_bytes)
  const documentType = cleanText(req.body.document_type, 60)
  if (!allowedDocumentTypes.has(documentType) || !allowedMime.has(mimeType)) return res.status(400).json({ error: 'Tipo de documento no permitido' })
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 10 * 1024 * 1024) return res.status(400).json({ error: 'El archivo debe pesar menos de 10 MB' })

  const storagePath = `${req.companyId}/${randomUUID()}.${allowedMime.get(mimeType)}`
  const { data: upload, error: uploadError } = await supabaseAdmin.storage.from('company-documents').createSignedUploadUrl(storagePath)
  if (uploadError) return res.status(500).json({ error: 'No fue posible preparar la carga segura' })

  const { data: document, error } = await supabaseAdmin.from('company_documents').insert({
    company_id: req.companyId,
    document_type: documentType,
    storage_path: storagePath,
    original_name: cleanText(req.body.original_name, 180),
    mime_type: mimeType,
    size_bytes: sizeBytes,
    uploaded_by: req.user.id,
    extraction_status: 'awaiting_upload',
  }).select('id, document_type, status').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ document, path: storagePath, token: upload.token })
})

router.get('/companies/:companyId/documents', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const { data, error } = await supabaseAdmin.from('company_documents')
    .select('id,document_type,original_name,mime_type,size_bytes,status,extraction_status,extraction_provider,extracted_fields,extraction_error,extraction_completed_at,extraction_confirmed_at,created_at')
    .eq('company_id', req.companyId).is('deleted_at', null).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: 'No fue posible cargar el expediente' })
  res.json(data || [])
})

router.post('/companies/:companyId/documents/:documentId/complete', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const { data: document } = await supabaseAdmin.from('company_documents').select('*').eq('id', req.params.documentId).eq('company_id', req.companyId).is('deleted_at', null).single()
  if (!document) return res.status(404).json({ error: 'Documento no encontrado' })
  const { data: blob, error: downloadError } = await supabaseAdmin.storage.from('company-documents').download(document.storage_path)
  if (downloadError || !blob) return res.status(409).json({ error: 'La carga no se completó correctamente; vuelve a seleccionar el archivo' })
  if (!req.body.ai_extraction_consent) {
    const { data } = await supabaseAdmin.from('company_documents').update({ extraction_status: 'skipped_by_user', extraction_error: null }).eq('id', document.id).select('id,document_type,original_name,status,extraction_status,extracted_fields').single()
    return res.json(data)
  }
  const provider = createDocumentExtractionProvider()
  if (!provider.enabled) {
    const { data } = await supabaseAdmin.from('company_documents').update({ extraction_status: 'provider_disabled', extraction_provider: provider.code, extraction_error: 'Proveedor de extracción no configurado' }).eq('id', document.id).select('id,document_type,original_name,status,extraction_status,extracted_fields').single()
    return res.json(data)
  }
  const startedAt = new Date().toISOString()
  await supabaseAdmin.from('company_documents').update({ extraction_status: 'processing', extraction_provider: provider.code, extraction_started_at: startedAt, ai_processing_consent_at: startedAt, extraction_error: null }).eq('id', document.id)
  try {
    const extraction = await provider.extract({ buffer: Buffer.from(await blob.arrayBuffer()), mimeType: document.mime_type, filename: document.original_name || `documento.${document.mime_type === 'application/pdf' ? 'pdf' : 'jpg'}`, documentType: document.document_type })
    const { data, error } = await supabaseAdmin.from('company_documents').update({ extraction_status: 'suggestions_ready', extracted_fields: extraction, extraction_completed_at: new Date().toISOString() }).eq('id', document.id).select('id,document_type,original_name,status,extraction_status,extraction_provider,extracted_fields,extraction_completed_at').single()
    if (error) throw error
    return res.json(data)
  } catch (error) {
    console.error('[document/extraction]', error.code || error.message)
    const { data } = await supabaseAdmin.from('company_documents').update({ extraction_status: 'failed', extraction_error: cleanText(error.code || error.message, 300), extraction_completed_at: new Date().toISOString() }).eq('id', document.id).select('id,document_type,original_name,status,extraction_status,extracted_fields').single()
    return res.json(data)
  }
})

router.post('/companies/:companyId/documents/:documentId/confirm-extraction', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const { data: document } = await supabaseAdmin.from('company_documents').select('id,extraction_status,extracted_fields').eq('id', req.params.documentId).eq('company_id', req.companyId).is('deleted_at', null).single()
  if (!document) return res.status(404).json({ error: 'Documento no encontrado' })
  if (document.extraction_status !== 'suggestions_ready') return res.status(409).json({ error: 'Este documento no tiene sugerencias pendientes de confirmar' })
  const updates = acceptedSuggestionUpdates(document.extracted_fields, req.body.accepted_fields)
  const { error } = await supabaseAdmin.rpc('confirm_company_document_extraction', { p_document_id: document.id, p_company_id: req.companyId, p_user_id: req.user.id, p_updates: updates })
  if (error) return res.status(422).json({ error: 'Una sugerencia no cumple el formato requerido. Compárala con el documento y captura el dato manualmente.' })
  res.json({ confirmed_fields: Object.keys(updates), updates })
})

router.post('/companies/:companyId/select-plan', requireAuth, requireCompanyAccess('subscription.manage'), async (req, res) => {
  const planCode = cleanText(req.body.plan_code, 60)
  const billingPeriod = req.body.billing_period === 'annual' ? 'annual' : 'monthly'
  const { data: company } = await supabaseAdmin.from('companies').select('company_type').eq('id', req.companyId).single()
  const carrierTypes = ['carrier', 'owner_operator']
  const providerTypes = ['supplier', 'workshop', 'tire_shop', 'crane_company', 'gps_company', 'security_company', 'insurer', 'financial_company', 'training_center']
  const audience = carrierTypes.includes(company?.company_type) ? 'carrier' : providerTypes.includes(company?.company_type) ? 'provider' : 'company'
  const { data: plan, error: planError } = await supabaseAdmin.from('plans').select('id, code, monthly_price, annual_price').eq('code', planCode).eq('audience', audience).eq('is_active', true).single()
  if (planError || !plan) return res.status(400).json({ error: 'El plan no corresponde a este tipo de empresa' })
  const amount = billingPeriod === 'annual' ? plan.annual_price : plan.monthly_price
  const isFree = Number(amount) === 0
  const { data, error } = await supabaseAdmin.from('subscriptions').insert({
    user_id: req.user.id,
    company_id: req.companyId,
    plan_id: plan.id,
    tipo: 'saas_platform',
    estatus: isFree ? 'activa' : 'pendiente',
    monto: amount,
    moneda: 'MXN',
    billing_period: billingPeriod,
    starts_at: isFree ? new Date().toISOString() : null,
  }).select('id, estatus, monto, billing_period').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

router.get('/companies/:companyId/limits', requireAuth, requireCompanyAccess('company.manage_profile'), async (req, res) => {
  const { data, error } = await supabaseAdmin.rpc('get_company_entitlements', { p_company_id: req.companyId })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/verification-queue', requireAuth, requirePermission('company.verify'), async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('companies').select('id,legal_name,trade_name,legal_entity_type,company_type,tax_id,tax_regime,fiscal_address,responsible_name,business_email,phone,status,submitted_at,company_documents(id,document_type,original_name,mime_type,size_bytes,status,extraction_status,extraction_confirmed_at,created_at),company_verifications(id,level,status,requested_at)').eq('status', 'pending_verification').order('submitted_at')
  if (error) return res.status(500).json({ error: 'No fue posible cargar la cola de validación' })
  res.json(data || [])
})

router.get('/verification-documents/:documentId/download-url', requireAuth, requirePermission('company.verify'), async (req, res) => {
  const { data: document } = await supabaseAdmin.from('company_documents').select('storage_path,original_name').eq('id', req.params.documentId).is('deleted_at', null).single()
  if (!document) return res.status(404).json({ error: 'Documento no encontrado' })
  const { data, error } = await supabaseAdmin.storage.from('company-documents').createSignedUrl(document.storage_path, 300, { download: document.original_name || 'documento' })
  if (error) return res.status(500).json({ error: 'No fue posible abrir el documento privado' })
  res.json({ url: data.signedUrl, expires_in: 300 })
})

router.post('/companies/:companyId/verification-decision', requireAuth, requirePermission('company.verify'), async (req, res) => {
  const decision = req.body.decision === 'approved' ? 'approved' : req.body.decision === 'rejected' ? 'rejected' : null
  if (!decision) return res.status(400).json({ error: 'Decisión inválida' })
  const { data: company } = await supabaseAdmin.from('companies').select('*').eq('id', req.params.companyId).single()
  if (!company || company.status !== 'pending_verification') return res.status(409).json({ error: 'La solicitud ya no está pendiente' })
  const required = company.legal_entity_type === 'individual_business' ? ['tax_certificate','official_id','proof_of_address'] : ['tax_certificate','incorporation_deed','legal_representative_id','proof_of_address']
  const { data: documents } = await supabaseAdmin.from('company_documents').select('id,document_type,extraction_status').eq('company_id', company.id).in('document_type', required).is('deleted_at', null)
  const completedDocuments = (documents || []).filter((document) => !['awaiting_upload', 'processing'].includes(document.extraction_status))
  const types = new Set(completedDocuments.map((document) => document.document_type))
  if (decision === 'approved' && required.some((type) => !types.has(type))) return res.status(422).json({ error: 'No se puede aprobar un expediente incompleto' })
  const now = new Date().toISOString(), reason = cleanText(req.body.reason, 600) || null
  if (decision === 'rejected' && !reason) return res.status(422).json({ error: 'Indica qué debe corregir la persona o empresa' })
  const documentIds = completedDocuments.map((document) => document.id)
  const documentDecision = documentIds.length
    ? supabaseAdmin.from('company_documents').update({ status: decision === 'approved' ? 'approved' : 'rejected', reviewed_by: req.user.id, reviewed_at: now, rejection_reason: reason }).eq('company_id', company.id).in('id', documentIds)
    : Promise.resolve({ error: null })
  const nextStatus = decision === 'approved' ? 'verified' : 'corrections_required'
  const verifiedCompany = { ...company, status: nextStatus, verified_at: decision === 'approved' ? now : null, updated_at: now }
  await Promise.all([
    supabaseAdmin.from('companies').update({ status: nextStatus, verified_at: verifiedCompany.verified_at, updated_at: now }).eq('id', company.id),
    supabaseAdmin.from('company_verifications').update({ status: decision, reviewed_by: req.user.id, reviewed_at: now, applicant_notes: reason }).eq('company_id', company.id).eq('status', 'pending'),
    documentDecision,
    supabaseAdmin.from('audit_logs').insert({ actor_user_id: req.user.id, action: `company.verification.${decision}`, entity_type: 'company', entity_id: company.id, reason }),
  ])
  await Promise.allSettled([syncCompanyToDirectory(supabaseAdmin, verifiedCompany), notifyVerification(verifiedCompany, decision, reason)])
  res.json({ id: company.id, status: nextStatus })
})

export default router
