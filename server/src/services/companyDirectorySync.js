const CATEGORY_BY_TYPE = {
  carrier: 'transportistas', owner_operator: 'transportistas', customs_broker: 'agencias-aduanales', freight_forwarder: 'forwarders',
  warehouse: 'almacenadoras', bonded_warehouse: 'almacenadoras', yard: 'patios', rigging_company: 'servicios-portuarios', shipping_line: 'navieras',
  workshop: 'talleres', tire_shop: 'llanteras', crane_company: 'gruas', gps_company: 'gps', training_center: 'capacitacion', security_company: 'seguridad', insurer: 'seguros',
}

export function directoryProfileFromCompany(company) {
  const slugBase = String(company.trade_name || company.legal_name || 'empresa').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'empresa'
  return {
    company_id: company.id,
    user_id: company.owner_user_id,
    nombre_comercial: company.trade_name || company.legal_name,
    slug: `${slugBase}-${String(company.id).slice(0, 8)}`,
    descripcion: company.description || null,
    categoria_slug: CATEGORY_BY_TYPE[company.company_type] || 'servicios-portuarios',
    servicios: company.services || [],
    whatsapp: company.whatsapp || null,
    telefono: company.phone || null,
    email: company.business_email || null,
    sitio_web: company.website || null,
    // La dirección fiscal pertenece al expediente privado; no se replica al directorio.
    direccion: null,
    es_verificado: company.status === 'verified',
    is_active: !['suspended', 'rejected', 'blocked'].includes(company.status),
    updated_at: new Date().toISOString(),
  }
}

export async function syncCompanyToDirectory(supabase, company) {
  if (!company?.id) return { data: null, error: new Error('Empresa inválida') }
  return supabase.from('empresa_perfiles').upsert(directoryProfileFromCompany(company), { onConflict: 'company_id' }).select('id,slug,es_verificado').single()
}
