export const ACCOUNT_KINDS = ['person', 'company']

export const PERSON_ACCOUNT_TYPES = [
  'candidate', 'operator', 'traffic_executive', 'documenter', 'customs_reviewer',
  'sales_executive', 'rigger', 'mechanic', 'technician', 'warehouse_staff',
  'independent_professional', 'other_logistics_profile',
]

export const COMPANY_ACCOUNT_TYPES = [
  'carrier', 'owner_operator', 'customs_broker', 'freight_forwarder', 'importer',
  'exporter', 'logistics_operator', 'warehouse', 'yard', 'rigging_company',
  'shipping_line', 'bonded_warehouse', 'supplier', 'workshop', 'tire_shop',
  'crane_company', 'gps_company', 'security_company', 'insurer', 'financial_company',
  'training_center', 'trading_company', 'other_logistics_provider',
]

export const ACCOUNT_TYPES = [...PERSON_ACCOUNT_TYPES, ...COMPANY_ACCOUNT_TYPES]

export const PLATFORM_ROLES = [
  'person_user', 'professional_user', 'company_unverified', 'company_verified',
  'carrier_verified', 'superadmin', 'general_admin', 'moderator', 'company_validator',
  'sales_executive', 'advertising_admin', 'finance_admin', 'content_editor', 'support',
]

export const PERMISSIONS = [
  'freight.create', 'freight.view_private_data', 'freight.submit_quote', 'freight.manage_quotes',
  'company.manage_profile', 'company.manage_team', 'company.verify', 'job.create',
  'marketplace.create', 'ad.create', 'ad.approve', 'subscription.manage',
  'moderation.manage', 'admin.analytics', 'admin.audit.read', 'content.manage',
  'admin.users.manage', 'admin.roles.manage',
]

export function isValidAccountSelection(kind, type) {
  if (kind === 'person') return PERSON_ACCOUNT_TYPES.includes(type)
  if (kind === 'company') return COMPANY_ACCOUNT_TYPES.includes(type)
  return false
}

export function normalizeBearerToken(header = '') {
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim())
  return match?.[1]?.trim() || null
}
