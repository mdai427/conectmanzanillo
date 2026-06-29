import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Paquetes disponibles ──────────────────────────────────────────────────────
// Sustituye los price_XXXX por los Price IDs reales de tu cuenta Stripe
const PAQUETES = {
  basico: {
    nombre: 'Banner Básico',
    priceId: process.env.STRIPE_PRICE_BASICO || 'price_BASICO',
    zona: 'principal',
    meses: 1,
  },
  zona: {
    nombre: 'Patrocinador de Zona',
    priceId: process.env.STRIPE_PRICE_ZONA || 'price_ZONA',
    zona: 'directorio',
    meses: 1,
  },
  principal: {
    nombre: 'Patrocinador Principal',
    priceId: process.env.STRIPE_PRICE_PRINCIPAL || 'price_PRINCIPAL',
    zona: 'global',
    meses: 1,
  },
  reporte: {
    nombre: 'Reporte WA Patrocinado',
    priceId: process.env.STRIPE_PRICE_REPORTE || 'price_REPORTE',
    zona: 'global',
    meses: 1,
  },
}

// POST /api/pagos/checkout
// Body: { paquete: 'basico' | 'zona' | 'principal' | 'reporte', empresa_nombre, empresa_whatsapp }
router.post('/checkout', async (req, res) => {
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
        paquete,
        empresa_nombre,
        empresa_whatsapp,
        zona: plan.zona,
      },
      subscription_data: {
        metadata: { paquete, zona: plan.zona },
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

  let event
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Firma inválida:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { paquete, empresa_nombre, empresa_whatsapp, zona } = session.metadata || {}

    // Crear campaña activa en publicidad_campanas
    const fechaInicio = new Date()
    const fechaFin = new Date()
    fechaFin.setMonth(fechaFin.getMonth() + 1)

    const { error } = await supabase.from('publicidad_campanas').insert({
      titulo: empresa_nombre || `Campaña ${paquete}`,
      whatsapp: empresa_whatsapp || null,
      zona: zona || 'global',
      prioridad: paquete === 'reporte' ? 10 : paquete === 'principal' ? 8 : paquete === 'zona' ? 5 : 2,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      is_active: true,
    })

    if (error) console.error('[webhook] Error creando campaña:', error)
    else console.log('[webhook] Campaña creada para:', empresa_nombre, 'zona:', zona)
  }

  res.json({ received: true })
})

// GET /api/pagos/paquetes — lista los paquetes disponibles
router.get('/paquetes', (_req, res) => {
  res.json(Object.entries(PAQUETES).map(([id, p]) => ({ id, nombre: p.nombre, zona: p.zona })))
})

export default router
