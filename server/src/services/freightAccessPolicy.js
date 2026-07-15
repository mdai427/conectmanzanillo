export const FREIGHT_MEMBERSHIP_MONTHLY_MXN = 500

export function requiredLegalDocuments(legalEntityType) {
  return legalEntityType === 'individual_business'
    ? ['tax_certificate', 'official_id', 'proof_of_address']
    : ['tax_certificate', 'incorporation_deed', 'legal_representative_id', 'proof_of_address']
}

export function evaluateFreightAccess({ company, approvedDocuments = [], membership, action }) {
  if (!company || company.status !== 'verified') return { allowed: false, code: 'VERIFICATION_REQUIRED' }
  if (!company.legal_entity_type || !company.tax_id || !company.business_email) return { allowed: false, code: 'COMPANY_PROFILE_INCOMPLETE' }
  const approved = new Set(approvedDocuments.map((item) => typeof item === 'string' ? item : item.document_type))
  const missing = requiredLegalDocuments(company.legal_entity_type).filter((type) => !approved.has(type))
  if (missing.length) return { allowed: false, code: 'DOCUMENTS_NOT_APPROVED', missing }
  if (action === 'publish' && !membership) return { allowed: false, code: 'MEMBERSHIP_REQUIRED' }
  return { allowed: true, code: 'ALLOWED', missing: [] }
}
