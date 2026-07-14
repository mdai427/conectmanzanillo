export class IntegrationProvider {
  constructor({ code, name, sourceClass = 'third_party', enabled = false } = {}) {
    this.code = code
    this.name = name
    this.sourceClass = sourceClass
    this.enabled = enabled
  }

  availability() {
    return {
      code: this.code,
      name: this.name,
      source_class: this.sourceClass,
      status: this.enabled ? 'configured' : 'disabled',
    }
  }

  async execute() {
    if (!this.enabled) {
      const error = new Error(`${this.name || this.code} no está configurado`)
      error.code = 'PROVIDER_NOT_CONFIGURED'
      throw error
    }
    throw new Error('El proveedor debe implementar execute()')
  }
}

export class GoogleRoutesProvider extends IntegrationProvider {
  constructor(options = {}) { super({ code: 'google_routes', name: 'Google Routes', ...options }) }
}

export class WazePartnerProvider extends IntegrationProvider {
  constructor(options = {}) { super({ code: 'waze_partner', name: 'Waze for Cities / Partner Feed', ...options }) }
}

export class CustomsAuthorityProvider extends IntegrationProvider {
  constructor(options = {}) { super({ code: 'customs_authority', name: 'Autoridad aduanera autorizada', sourceClass: 'official', ...options }) }
}

export function configuredProviders(env = process.env) {
  return [
    new GoogleRoutesProvider({ enabled: Boolean(env.GOOGLE_ROUTES_API_KEY) }),
    new WazePartnerProvider({ enabled: Boolean(env.WAZE_PARTNER_FEED_URL) }),
    new CustomsAuthorityProvider({ enabled: Boolean(env.CUSTOMS_AUTHORITY_SECRET_REF) }),
  ]
}
