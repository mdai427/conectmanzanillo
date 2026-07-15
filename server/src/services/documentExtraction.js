const SUPPORTED_FIELDS = new Set([
  'legal_name',
  'trade_name',
  'tax_id',
  'tax_regime',
  'fiscal_address',
  'responsible_name',
])

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field: { type: 'string', enum: [...SUPPORTED_FIELDS] },
          value: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
        },
        required: ['field', 'value', 'confidence', 'evidence'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['fields', 'warnings'],
}

export class DocumentExtractionProvider {
  constructor({ code = 'disabled', enabled = false } = {}) {
    this.code = code
    this.enabled = enabled
  }

  availability() {
    return { code: this.code, status: this.enabled ? 'configured' : 'disabled' }
  }

  async extract() {
    const error = new Error('La extracción asistida no está configurada')
    error.code = 'PROVIDER_NOT_CONFIGURED'
    throw error
  }
}

export class OpenAIDocumentExtractionProvider extends DocumentExtractionProvider {
  constructor({ apiKey, model = 'gpt-4o-mini', fetchImpl = fetch, timeoutMs = 45_000 } = {}) {
    super({ code: 'openai_responses', enabled: Boolean(apiKey) })
    this.apiKey = apiKey
    this.model = model
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
  }

  async extract({ buffer, mimeType, filename, documentType }) {
    if (!this.enabled) return super.extract()
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw Object.assign(new Error('El archivo está vacío'), { code: 'INVALID_DOCUMENT' })
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    const fileContent = mimeType === 'application/pdf'
      ? { type: 'input_file', filename, file_data: dataUrl }
      : { type: 'input_image', image_url: dataUrl, detail: 'high' }
    const prompt = [
      'Extrae únicamente datos que sean visibles en este documento empresarial mexicano.',
      `Tipo declarado: ${documentType}.`,
      'No infieras datos ausentes. No completes ni corrijas un RFC. La evidencia debe ser una descripción breve, sin copiar números de identificación completos.',
      'Devuelve sugerencias; una persona confirmará cada campo antes de incorporarlo al perfil.',
    ].join(' ')
    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        store: false,
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, fileContent] }],
        text: { format: { type: 'json_schema', name: 'company_document_extraction', strict: true, schema: EXTRACTION_SCHEMA } },
        max_output_tokens: 1200,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) {
      const details = await response.text().catch(() => '')
      const error = new Error(`El proveedor de extracción respondió con estado ${response.status}`)
      error.code = 'EXTRACTION_PROVIDER_ERROR'
      error.details = details.slice(0, 500)
      throw error
    }
    const payload = await response.json()
    const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
    if (!outputText) throw Object.assign(new Error('El proveedor no devolvió datos estructurados'), { code: 'INVALID_PROVIDER_RESPONSE' })
    return normalizeExtraction(JSON.parse(outputText))
  }
}

export function normalizeExtraction(payload) {
  const fields = Array.isArray(payload?.fields) ? payload.fields : []
  return {
    fields: fields.flatMap((item) => {
      const field = String(item?.field || '')
      const value = String(item?.value || '').trim().slice(0, field === 'fiscal_address' ? 300 : 180)
      if (!SUPPORTED_FIELDS.has(field) || !value) return []
      return [{
        field,
        value: field === 'tax_id' ? value.toUpperCase().slice(0, 13) : value,
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        evidence: String(item.evidence || '').trim().replace(/\b\d{5,}\b/g, '[dato oculto]').replace(/\b[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}\b/gi, '[RFC oculto]').slice(0, 180),
      }]
    }),
    warnings: (Array.isArray(payload?.warnings) ? payload.warnings : []).map((item) => String(item).trim().slice(0, 220)).filter(Boolean).slice(0, 8),
  }
}

export function createDocumentExtractionProvider(env = process.env, fetchImpl = fetch) {
  if (env.DOCUMENT_EXTRACTION_PROVIDER !== 'openai') return new DocumentExtractionProvider()
  return new OpenAIDocumentExtractionProvider({
    apiKey: env.OPENAI_API_KEY,
    model: env.DOCUMENT_EXTRACTION_MODEL || 'gpt-4o-mini',
    fetchImpl,
  })
}

export function acceptedSuggestionUpdates(extraction, acceptedFields = []) {
  const accepted = new Set(Array.isArray(acceptedFields) ? acceptedFields : [])
  return Object.fromEntries((extraction?.fields || []).filter((item) => accepted.has(item.field) && SUPPORTED_FIELDS.has(item.field)).map((item) => [item.field, item.value]))
}

export { SUPPORTED_FIELDS }
