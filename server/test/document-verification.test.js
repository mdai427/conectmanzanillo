import test from 'node:test'
import assert from 'node:assert/strict'
import {
  acceptedSuggestionUpdates,
  createDocumentExtractionProvider,
  normalizeExtraction,
  OpenAIDocumentExtractionProvider,
} from '../src/services/documentExtraction.js'
import { createVerificationEmailProvider, ResendVerificationEmailProvider } from '../src/services/verificationEmail.js'
import { directoryProfileFromCompany } from '../src/services/companyDirectorySync.js'

test('document extraction stays explicitly disabled without provider configuration', async () => {
  const provider = createDocumentExtractionProvider({})
  assert.equal(provider.availability().status, 'disabled')
  await assert.rejects(provider.extract(), (error) => error.code === 'PROVIDER_NOT_CONFIGURED')
})

test('extraction normalization only keeps supported, bounded suggestions', () => {
  const result = normalizeExtraction({ fields: [
    { field: 'tax_id', value: 'abc010101aa1', confidence: 4, evidence: 'Visible en encabezado' },
    { field: 'bank_account', value: '123', confidence: 1, evidence: 'No permitido' },
  ], warnings: ['Revisar vigencia'] })
  assert.deepEqual(result.fields, [{ field: 'tax_id', value: 'ABC010101AA1', confidence: 1, evidence: 'Visible en encabezado' }])
  assert.deepEqual(result.warnings, ['Revisar vigencia'])
})

test('only fields explicitly confirmed by the applicant are applied', () => {
  const extraction = { fields: [
    { field: 'legal_name', value: 'Logística Faro SA de CV' },
    { field: 'tax_id', value: 'LFA010101AA1' },
  ] }
  assert.deepEqual(acceptedSuggestionUpdates(extraction, ['legal_name']), { legal_name: 'Logística Faro SA de CV' })
})

test('OpenAI adapter requests no response retention and parses structured output', async () => {
  let requestBody
  const provider = new OpenAIDocumentExtractionProvider({ apiKey: 'test-key', fetchImpl: async (_url, options) => {
    requestBody = JSON.parse(options.body)
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ fields: [{ field: 'legal_name', value: 'Faro Logístico', confidence: 0.91, evidence: 'Encabezado' }], warnings: [] }) }) }
  } })
  const result = await provider.extract({ buffer: Buffer.from('pdf'), mimeType: 'application/pdf', filename: 'constancia.pdf', documentType: 'tax_certificate' })
  assert.equal(requestBody.store, false)
  assert.equal(requestBody.input[0].content[1].type, 'input_file')
  assert.equal(result.fields[0].field, 'legal_name')
})

test('verification email is disabled without credentials and never claims delivery', async () => {
  const provider = createVerificationEmailProvider({})
  assert.deepEqual(await provider.send({}), { delivered: false, status: 'provider_disabled', provider: 'disabled' })
})

test('verification email escapes reviewer text and sends no attachments', async () => {
  let body
  const provider = new ResendVerificationEmailProvider({ apiKey: 'key', from: 'Faro <no-reply@example.com>', fetchImpl: async (_url, options) => {
    body = JSON.parse(options.body)
    return { ok: true, json: async () => ({ id: 'email-1' }) }
  } })
  const result = await provider.send({ to: 'empresa@example.com', companyName: 'Empresa <Uno>', status: 'rejected', reason: '<script>mal</script>' })
  assert.equal(result.delivered, true)
  assert.equal('attachments' in body, false)
  assert.equal(body.html.includes('<script>'), false)
})

test('directory profile exposes a clear verified or unverified state', () => {
  const base = { id: '12345678-aaaa-bbbb-cccc-123456789012', owner_user_id: 'user-1', trade_name: 'Faro Prueba', legal_name: 'Faro Prueba SA', company_type: 'carrier', services: [], status: 'pending_verification' }
  assert.equal(directoryProfileFromCompany(base).es_verificado, false)
  assert.equal(directoryProfileFromCompany({ ...base, status: 'verified' }).es_verificado, true)
})
