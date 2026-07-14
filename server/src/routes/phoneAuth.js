import { Router } from 'express'
import twilio from 'twilio'
import { supabaseAdmin } from '../config/supabase.js'
import { isValidAccountSelection } from '../security/catalog.js'

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
  // Dominio interno heredado: se conserva para no romper el acceso de usuarios existentes.
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
  const { phone, code, fullName, accountKind, accountType } = req.body
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

  // 2. Crear la cuenta cuando el flujo incluye onboarding. Los accesos existentes
  // continúan directamente a la generación de sesión sin recorrer todos los usuarios.
  let isNew = false
  if (fullName || accountKind || accountType) {
    if (!fullName?.trim()) return res.status(400).json({ error: 'Nombre requerido para registro', needsProfile: true })
    if (!isValidAccountSelection(accountKind, accountType)) return res.status(400).json({ error: 'Tipo de cuenta inválido', needsProfile: true })
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        account_kind: accountKind,
        account_type: accountType,
        tipo_usuario: accountKind === 'company' ? 'empresa' : 'operador',
        role: accountKind === 'company' ? 'company' : 'operator_free',
        phone: formatted,
      },
    })
    const alreadyExists = createErr && ['email_exists', 'user_already_exists'].includes(createErr.code)
    if (createErr && !alreadyExists) {
      console.error('[phoneAuth] create user error:', createErr.message)
      return res.status(500).json({ error: 'Error al crear cuenta' })
    }
    isNew = Boolean(created?.user)
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
  res.json({ ok: true, token_hash: tokenHash, token_type: url.searchParams.get('type') || 'email', isNew })
})

export default router
