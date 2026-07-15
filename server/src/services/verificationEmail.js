function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

export class VerificationEmailProvider {
  constructor({ code = 'disabled', enabled = false } = {}) { this.code = code; this.enabled = enabled }
  availability() { return { code: this.code, status: this.enabled ? 'configured' : 'disabled' } }
  async send() { return { delivered: false, status: 'provider_disabled', provider: this.code } }
}

export class ResendVerificationEmailProvider extends VerificationEmailProvider {
  constructor({ apiKey, from, fetchImpl = fetch } = {}) {
    super({ code: 'resend', enabled: Boolean(apiKey && from) })
    this.apiKey = apiKey
    this.from = from
    this.fetchImpl = fetchImpl
  }

  async send({ to, companyName, status, reason }) {
    if (!this.enabled) return super.send()
    const approved = status === 'approved'
    const submitted = status === 'submitted'
    const subject = submitted ? 'Recibimos tu expediente en Faro Portuario' : approved ? 'Tu empresa fue verificada en Faro Portuario' : 'Tu expediente requiere correcciones'
    const heading = submitted ? 'Expediente recibido' : approved ? 'Verificación aprobada' : 'Necesitamos una corrección'
    const detail = submitted
      ? 'El equipo de Faro Portuario revisará la documentación. Te avisaremos por correo cuando exista una resolución.'
      : approved
        ? 'Tu empresa ya puede mostrarse con la insignia de verificación en el directorio de Faro Portuario.'
        : `Motivo indicado por el equipo revisor: ${escapeHtml(reason || 'Consulta el portal para conocer el detalle.')}`
    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject,
        html: `<div style="font-family:Arial,sans-serif;color:#082f35;max-width:600px;margin:auto"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#0f766e">FARO PORTUARIO</p><h1>${heading}</h1><p>Hola, ${escapeHtml(companyName)}.</p><p style="line-height:1.6">${detail}</p><p style="color:#64748b;font-size:12px">Este mensaje confirma un cambio real en tu expediente. Faro Portuario no solicita contraseñas por correo.</p></div>`,
      }),
    })
    if (!response.ok) throw Object.assign(new Error(`El proveedor de correo respondió con estado ${response.status}`), { code: 'EMAIL_PROVIDER_ERROR' })
    const payload = await response.json()
    return { delivered: true, status: 'sent', provider: this.code, providerMessageId: payload.id || null }
  }
}

export function createVerificationEmailProvider(env = process.env, fetchImpl = fetch) {
  if (env.EMAIL_PROVIDER !== 'resend') return new VerificationEmailProvider()
  return new ResendVerificationEmailProvider({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fetchImpl })
}
