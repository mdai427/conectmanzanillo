import { Router } from 'express'
import twilio from 'twilio'
import { supabaseAdmin } from '../config/supabase.js'
import { isValidAccountSelection } from '../security/catalog.js'
import { formatMexicoPhone, phoneToAuthEmail, validatePassword } from '../services/phoneIdentity.js'

const router = Router()
const PURPOSES = new Set(['register', 'reset_password'])
const VALID_CHANNELS = new Set(['sms', 'whatsapp'])

// Canal primario configurable (VERIFY_CHANNEL=whatsapp|sms). WhatsApp evita el
// filtrado de SMS A2P de los carriers mexicanos; si falla, respalda con SMS.
function verifyChannels() {
  const primary = String(process.env.VERIFY_CHANNEL || 'sms').toLowerCase()
  const channel = VALID_CHANNELS.has(primary) ? primary : 'sms'
  return channel === 'whatsapp' ? ['whatsapp', 'sms'] : ['sms']
}

router.get('/status', (_req, res) => {
  res.json({
    available: Boolean(verificationClient()),
    provider: 'sms',
    message: verificationClient()
      ? 'La validación por SMS está disponible'
      : 'La validación por SMS requiere configuración en el servidor',
  })
})

function verificationClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const verifySid = process.env.TWILIO_VERIFY_SID
  if (!sid || !token || !verifySid) return null
  return { client: twilio(sid, token), verifySid }
}

async function verifyCode(phone, code) {
  const verification = verificationClient()
  if (!verification) return { error: 'El servicio de verificación SMS aún no está configurado' }
  try {
    const check = await verification.client.verify.v2.services(verification.verifySid)
      .verificationChecks.create({ to: phone, code: String(code || '').trim() })
    return check.status === 'approved' ? { approved: true } : { error: 'Código incorrecto' }
  } catch (error) {
    console.error('[phoneAuth] verify error:', error.message)
    return { error: 'Código inválido, vencido o con demasiados intentos' }
  }
}

router.post('/send', async (req, res) => {
  const phone = formatMexicoPhone(req.body.phone)
  const purpose = PURPOSES.has(req.body.purpose) ? req.body.purpose : 'register'
  if (!phone) return res.status(400).json({ error: 'Ingresa un número mexicano válido de 10 dígitos' })
  const verification = verificationClient()
  if (!verification) return res.status(503).json({ error: 'El servicio de verificación aún no está configurado' })

  const channels = verifyChannels()
  for (const channel of channels) {
    try {
      await verification.client.verify.v2.services(verification.verifySid)
        .verifications.create({ to: phone, channel, locale: 'es' })
      return res.json({ ok: true, phone, purpose, channel, expires_in: 600 })
    } catch (error) {
      console.error(`[phoneAuth] send error (${channel}):`, error.message)
    }
  }
  res.status(502).json({ error: 'No se pudo enviar el código. Verifica el número e inténtalo más tarde.' })
})

router.post('/verify', async (req, res) => {
  const phone = formatMexicoPhone(req.body.phone)
  const { code, fullName, accountKind, accountType, password } = req.body
  if (!phone || !code) return res.status(400).json({ error: 'Teléfono y código requeridos' })
  if (!fullName?.trim()) return res.status(400).json({ error: 'Nombre requerido para registro' })
  if (!isValidAccountSelection(accountKind, accountType)) return res.status(400).json({ error: 'Tipo de cuenta inválido' })
  const passwordError = validatePassword(password)
  if (passwordError) return res.status(400).json({ error: passwordError })

  const verification = await verifyCode(phone, code)
  if (!verification.approved) return res.status(400).json({ error: verification.error })

  const email = phoneToAuthEmail(phone)
  const smsConsent = Boolean(req.body.smsNotificationsEnabled)
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim().slice(0, 80), account_kind: accountKind, account_type: accountType,
      tipo_usuario: accountKind === 'company' ? 'empresa' : 'operador',
      role: accountKind === 'company' ? 'company' : 'operator_free', phone,
      phone_verified: true, sms_notifications_enabled: smsConsent,
    },
  })
  if (createError) {
    const alreadyExists = ['email_exists', 'user_already_exists'].includes(createError.code) || /already|registered/i.test(createError.message)
    if (alreadyExists) return res.status(409).json({ error: 'Este teléfono ya está registrado. Inicia sesión o recupera tu contraseña.' })
    console.error('[phoneAuth] create user error:', createError.message)
    return res.status(500).json({ error: 'No fue posible crear la cuenta' })
  }

  const now = new Date().toISOString()
  await supabaseAdmin.from('profiles').update({
    phone, phone_verified_at: now, sms_notifications_enabled: smsConsent,
    sms_consent_at: smsConsent ? now : null,
  }).eq('id', created.user.id)

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !linkData?.properties?.action_link) {
    console.error('[phoneAuth] generate link error:', linkError?.message)
    return res.status(500).json({ error: 'Cuenta creada. Inicia sesión con tu teléfono y contraseña.' })
  }
  const url = new URL(linkData.properties.action_link)
  res.status(201).json({ ok: true, token_hash: url.searchParams.get('token'), token_type: 'email', isNew: true, phone })
})

router.post('/reset-password', async (req, res) => {
  const phone = formatMexicoPhone(req.body.phone)
  const passwordError = validatePassword(req.body.password)
  if (!phone || !req.body.code) return res.status(400).json({ error: 'Teléfono y código requeridos' })
  if (passwordError) return res.status(400).json({ error: passwordError })
  const verification = await verifyCode(phone, req.body.code)
  if (!verification.approved) return res.status(400).json({ error: verification.error })

  const localPhone = phone.slice(-10)
  let { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('phone', phone).limit(1).maybeSingle()
  if (!profile) ({ data: profile } = await supabaseAdmin.from('profiles').select('id').eq('phone', localPhone).limit(1).maybeSingle())
  if (!profile) return res.status(404).json({ error: 'No encontramos una cuenta con ese teléfono' })

  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: req.body.password,
  })
  if (error) {
    console.error('[phoneAuth] reset password error:', error.message)
    return res.status(500).json({ error: 'No fue posible actualizar la contraseña' })
  }
  await supabaseAdmin.from('profiles').update({ phone, phone_verified_at: new Date().toISOString() }).eq('id', profile.id)
  res.json({ ok: true })
})

export default router
