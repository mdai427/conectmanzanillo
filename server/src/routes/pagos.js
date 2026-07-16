import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { evaluateFreightAccess, FREIGHT_MEMBERSHIP_MONTHLY_MXN } from '../services/freightAccessPolicy.js'
import { commercePlan, publicCommercePlans } from '../services/commercePlans.js'

const router = express.Router()

// Lazy init — no lanza error si la key no está configurada aún
let _stripe = null
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY no configurada en variables de entorno')
    _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' })
  }
  return _stripe
}

let _supabase = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabase
}

// ── Paquetes disponibles ──────────────────────────────────────────────────────
// Sustituye los price_XXXX por los Price IDs reales de tu cuenta Stripe
const PAQUETES = {
  impulso: {
    nombre: 'Impulso Faro',
    priceId: process.env.STRIPE_PRICE_BASICO || 'price_BASICO',
    zona: 'principal',
    meses: 1,
  },
  lider: {
    nombre: 'Líder Portuario',
    priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_PREMIUM',
    zona: 'global',
    meses: 1,
  },
}

router.get('/commerce-plans', (req, res) => res.json({ plans: publicCommercePlans(req.query.kind) }))

router.post('/commerce-membership/checkout', requireAuth, async (req, res) => {
  let pendingId = null
  try {
    const plan = commercePlan(String(req.body.plan_code || ''))
    if (!plan) return res.status(400).json({ error:'Membresía inválida' })
    const companyId = String(req.body.company_id || '')
    const { data: membership } = await getSupabase().from('company_members').select('member_role,companies(id,trade_name,status)').eq('company_id',companyId).eq('user_id',req.user.id).eq('status','active').maybeSingle()
    if (!membership || !['owner','admin'].includes(membership.member_role)) return res.status(403).json({ error:'Registra una empresa o persona física para contratar' })
    if (membership.companies?.status !== 'verified') return res.status(422).json({ error:'Tu empresa o actividad empresarial debe estar verificada antes de contratar', code:'VERIFICATION_REQUIRED' })
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error:'Los pagos con tarjeta estarán disponibles al finalizar la configuración de Stripe', code:'PAYMENTS_NOT_CONFIGURED' })
    await getSupabase().from('subscriptions').update({ estatus:'cancelada' }).eq('company_id',companyId).eq('estatus','pendiente').eq('tipo',plan.code)
    const { data: pending, error } = await getSupabase().from('subscriptions').insert({ user_id:req.user.id,company_id:companyId,tipo:plan.code,estatus:'pendiente',monto:plan.monthlyPrice,moneda:'MXN',billing_period:'monthly',provider:'stripe' }).select('id').single()
    if (error) throw error
    pendingId = pending.id
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const returnPath = plan.kind === 'jobs' ? '/vacantes' : '/marketplace'
    const metadata = { purpose:'commerce_membership',plan_code:plan.code,subscription_id:pending.id,company_id:companyId,user_id:req.user.id }
    const session = await getStripe().checkout.sessions.create({ mode:'subscription',client_reference_id:pending.id,line_items:[{price_data:{currency:'mxn',unit_amount:plan.monthlyPrice*100,recurring:{interval:'month'},product_data:{name:`Faro Portuario · ${plan.name}`,description:plan.description}},quantity:1}],success_url:`${baseUrl}${returnPath}?payment=success`,cancel_url:`${baseUrl}${returnPath}?payment=cancelled`,metadata,subscription_data:{metadata},locale:'es',billing_address_collection:'required',tax_id_collection:{enabled:true} })
    res.json({ url:session.url })
  } catch (error) {
    if (pendingId) await getSupabase().from('subscriptions').update({ estatus:'cancelada' }).eq('id',pendingId)
    console.error('[pagos/commerce-checkout]',error.message)
    res.status(500).json({ error:'No fue posible iniciar el pago de la membresía' })
  }
})

router.post('/freight-membership/checkout', requireAuth, async (req, res) => {
  let pendingSubscriptionId = null
  try {
    const companyId = String(req.body.company_id || '')
    const { data: membership } = await getSupabase().from('company_members').select('member_role,companies(id,trade_name,status,legal_entity_type,tax_id,business_email)').eq('company_id', companyId).eq('user_id', req.user.id).eq('status', 'active').maybeSingle()
    if (!membership || !['owner','admin'].includes(membership.member_role)) return res.status(403).json({ error: 'Solo el propietario o administrador puede contratar la membresía' })
    const company = membership.companies
    if (company?.status !== 'verified') return res.status(422).json({ error: 'La empresa o persona física debe estar verificada antes de contratar', code: 'VERIFICATION_REQUIRED' })
    if (!company.legal_entity_type || !company.tax_id || !company.business_email) return res.status(422).json({ error: 'Completa la identidad fiscal y el correo comercial' })
    const { data: documents } = await getSupabase().from('company_documents').select('document_type').eq('company_id', companyId).eq('status', 'approved').is('deleted_at', null)
    const verification = evaluateFreightAccess({ company, approvedDocuments: documents || [], membership: null, action: 'request' })
    if (!verification.allowed) return res.status(422).json({ error: 'La documentación legal debe estar aprobada antes de contratar', code: verification.code, missing_fields: verification.missing })
    const { data: active } = await getSupabase().from('subscriptions').select('id,plans!inner(code)').eq('company_id', companyId).eq('estatus', 'activa').eq('plans.code', 'freight_membership').limit(1).maybeSingle()
    if (active) return res.status(409).json({ error: 'La membresía de fletes ya está activa' })
    const { data: plan } = await getSupabase().from('plans').select('id,code,monthly_price,currency').eq('code', 'freight_membership').eq('is_active', true).single()
    if (!plan || Number(plan.monthly_price) !== FREIGHT_MEMBERSHIP_MONTHLY_MXN || plan.currency !== 'MXN') return res.status(503).json({ error: 'El plan de fletes no está configurado correctamente' })
    await getSupabase().from('subscriptions').update({ estatus: 'cancelada' }).eq('company_id', companyId).eq('estatus', 'pendiente').eq('tipo', 'freight_membership')
    const { data: pending, error: pendingError } = await getSupabase().from('subscriptions').insert({ user_id: req.user.id, company_id: companyId, plan_id: plan.id, tipo: 'freight_membership', estatus: 'pendiente', monto: FREIGHT_MEMBERSHIP_MONTHLY_MXN, moneda: 'MXN', billing_period: 'monthly', provider: 'stripe' }).select('id').single()
    if (pendingError) throw pendingError
    pendingSubscriptionId = pending.id
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const metadata = { purpose: 'freight_membership', subscription_id: pending.id, company_id: companyId, user_id: req.user.id }
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription', client_reference_id: pending.id,
      line_items: [{ price_data: { currency: 'mxn', unit_amount: FREIGHT_MEMBERSHIP_MONTHLY_MXN * 100, recurring: { interval: 'month' }, product_data: { name: 'Faro Portuario · Membresía de fletes', description: 'Publicación y administración de fletes por un mes.' } }, quantity: 1 }],
      success_url: `${baseUrl}/fletes?payment=success`, cancel_url: `${baseUrl}/fletes?payment=cancelled`,
      metadata, subscription_data: { metadata }, locale: 'es', billing_address_collection: 'required', tax_id_collection: { enabled: true },
    })
    res.json({ url: session.url })
  } catch (err) {
    if (pendingSubscriptionId) await getSupabase().from('subscriptions').update({ estatus: 'cancelada' }).eq('id', pendingSubscriptionId)
    console.error('[pagos/freight-checkout]', err.message)
    res.status(500).json({ error: 'No fue posible iniciar el pago de la membresía' })
  }
})

// POST /api/pagos/checkout
// Body: { paquete: 'impulso' | 'lider', empresa_nombre, empresa_whatsapp }
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { paquete, empresa_nombre = '', empresa_whatsapp = '' } = req.body

    const plan = PAQUETES[paquete]
    if (!plan) return res.status(400).json({ error: 'Paquete inválido' })

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/anunciate?success=true&paquete=${paquete}`,
      cancel_url:  `${baseUrl}/anunciate?canceled=true`,
      metadata: {
        purpose: 'advertising',
        user_id: req.user.id,
        paquete,
        empresa_nombre,
        empresa_whatsapp,
        zona: plan.zona,
      },
      subscription_data: {
        metadata: { paquete, zona: plan.zona, user_id: req.user.id },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'es',
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[pagos/checkout]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pagos/webhook
// Stripe envía eventos aquí. Configura el endpoint en el dashboard de Stripe.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return res.status(503).json({ error: 'Webhook de pagos no configurado' })

  let event
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Firma inválida:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const database = getSupabase()
  const { error: eventInsertError } = await database.from('payment_events').insert({ provider: 'stripe', provider_event_id: event.id, event_type: event.type })
  if (eventInsertError?.code === '23505') return res.json({ received: true, duplicate: true })
  if (eventInsertError) return res.status(500).json({ error: 'No fue posible registrar el evento de pago' })

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.metadata?.purpose === 'freight_membership') {
        const paid = ['paid','no_payment_required'].includes(session.payment_status)
        await database.from('subscriptions').update({ estatus: paid ? 'activa' : 'pendiente', starts_at: paid ? new Date().toISOString() : null, provider: 'stripe', provider_customer_id: String(session.customer || ''), provider_subscription_id: String(session.subscription || '') }).eq('id', session.metadata.subscription_id).eq('company_id', session.metadata.company_id)
      }
      if (session.metadata?.purpose === 'commerce_membership') {
        const paid = ['paid','no_payment_required'].includes(session.payment_status)
        await database.from('subscriptions').update({ estatus:paid?'activa':'pendiente',starts_at:paid?new Date().toISOString():null,provider:'stripe',provider_customer_id:String(session.customer||''),provider_subscription_id:String(session.subscription||'') }).eq('id',session.metadata.subscription_id).eq('company_id',session.metadata.company_id)
      }
    }
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object
      const providerSubscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.parent?.subscription_details?.subscription
      if (providerSubscriptionId) await database.from('subscriptions').update({ estatus: 'activa', grace_period_ends_at: null }).eq('provider_subscription_id', providerSubscriptionId)
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const status = event.type === 'customer.subscription.deleted' || subscription.status === 'canceled' ? 'cancelada' : ['active','trialing'].includes(subscription.status) ? 'activa' : ['past_due','unpaid'].includes(subscription.status) ? 'vencida' : 'pendiente'
      await database.from('subscriptions').update({ estatus: status, cancel_at_period_end: Boolean(subscription.cancel_at_period_end) }).eq('provider_subscription_id', subscription.id)
    }

  if (event.type === 'checkout.session.completed' && event.data.object.metadata?.purpose === 'advertising') {
    const session = event.data.object
    const { paquete, empresa_nombre, empresa_whatsapp, zona } = session.metadata || {}

    // Crear campaña activa en publicidad_campanas
    const fechaInicio = new Date()
    const fechaFin = new Date()
    fechaFin.setMonth(fechaFin.getMonth() + 1)

    const { error } = await database.from('publicidad_campanas').insert({
      titulo: empresa_nombre || `Campaña ${paquete}`,
      whatsapp: empresa_whatsapp || null,
      zona: zona || 'global',
      prioridad: paquete === 'lider' ? 8 : 3,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      is_active: true,
    })

    if (error) console.error('[webhook] Error creando campaña:', error)
    else console.log('[webhook] Campaña creada para:', empresa_nombre, 'zona:', zona)
  }
    await database.from('payment_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('provider', 'stripe').eq('provider_event_id', event.id)
    res.json({ received: true })
  } catch (error) {
    await database.from('payment_events').delete().eq('provider', 'stripe').eq('provider_event_id', event.id)
    console.error('[webhook/process]', error.message)
    res.status(500).json({ error: 'No fue posible procesar el evento' })
  }
})

// GET /api/pagos/paquetes — lista los paquetes disponibles
router.get('/paquetes', (_req, res) => {
  res.json(Object.entries(PAQUETES).map(([id, p]) => ({ id, nombre: p.nombre, zona: p.zona })))
})

export default router
