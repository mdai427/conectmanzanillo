import test from 'node:test'
import assert from 'node:assert/strict'
import { configuredProviders, GoogleRoutesProvider } from '../src/services/integrationProviders.js'

test('external providers are disabled without credentials', () => {
  const providers = configuredProviders({})
  assert.equal(providers.every((provider) => provider.availability().status === 'disabled'), true)
})

test('a disabled provider fails explicitly instead of inventing data', async () => {
  const provider = new GoogleRoutesProvider()
  await assert.rejects(provider.execute(), (error) => error.code === 'PROVIDER_NOT_CONFIGURED')
})
