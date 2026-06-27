import { Router } from 'express'
import twilio from 'twilio'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const VERIFY_SID   = process.env.TWILIO_VERIFY_SID

function getClient() {
  return twilio(TWILIO_SID, TWILIO_TOKEN)
}

function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) return `+52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`
  return `+${digits}`
}

// Derivar un email estable a partir del teléfono para auth Supabase
function phoneToEmail(phone) {
  return `${phone.replace('+', '')}@phone.conectmanzanillo.app`
}

// POST /api/phone-auth/send  — enviar código SMS
router.post('/send', async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'Teléfono requerido' })

  const formatted = formatPhone(phone)

  try {
    await getClient().verify.v2.services(VERIFY_SID)
      .verifications.create({ to: formatted, channel: 'sms' })
    res.json({ ok: true, phone: formatted })
  } catch (err) {
    console.error('[phoneAuth] send error:', err.message)
    res.status(500).json({ error: 'No se pudo enviar el SMS. Verifica el número.' })
  }
})

// POST /api/phone-auth/verify  — verificar código y devolver sesión
router.post('/verify', async (req, res) => {
  const { phone, code, fullName, tipo } = req.body
  if (!phone || !code) return res.status(400).json({ error: 'Teléfono y código requeridos' })

  const formatted = formatPhone(phone)
  const email     = phoneToEmail(formatted)

  // 1. Verificar código con Twilio
  try {
    const check = await getClient().verify.v2.services(VERIFY_SID)
      .verificationChecks.create({ to: formatted, code })
    if (check.status !== 'approved') {
      return res.status(400).json({ error: 'Código incorrecto' })
    }
  } catch (err) {
    console.error('[phoneAuth] verify error:', err.message)
    return res.status(400).json({ error: 'Código inválido o expirado' })
  }

  // 2. Buscar o crear usuario en Supabase
  let userId
  let isNew = false

  // Buscar por email derivado
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const existing = users?.find(u => u.email === email)

  if (existing) {
    userId = existing.id
  } else {
    // Nuevo usuario — requiere fullName y tipo
    if (!fullName?.trim()) return res.status(400).json({ error: 'Nombre requerido para registro', needsProfile: true })
    if (!tipo)             return res.status(400).json({ error: 'Tipo de usuario requerido', needsProfile: true })

    const roleMap = { operador: 'operator_free', empresa: 'company', otro: 'operator_free' }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name:    fullName.trim(),
        tipo_usuario: tipo,
        role:         roleMap[tipo] || 'operator_free',
        phone:        formatted,
      },
    })
    if (createErr) {
      console.error('[phoneAuth] create user error:', createErr.message)
      return res.status(500).json({ error: 'Error al crear cuenta' })
    }
    userId = created.user.id
    isNew  = true
  }

  // 3. Generar token de magic link para obtener sesión en el cliente
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  'magiclink',
    email,
  })

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[phoneAuth] generateLink error:', linkErr?.message)
    return res.status(500).json({ error: 'Error al generar sesión' })
  }

  // Extraer token_hash de la URL
  const url       = new URL(linkData.properties.action_link)
  const tokenHash = url.searchParams.get('token')
  const tokenType = url.searchParams.get('type') || 'email'   // siempre 'email' para magiclink

  res.json({ ok: true, token_hash: tokenHash, token_type: tokenType, isNew })
})

export default router
