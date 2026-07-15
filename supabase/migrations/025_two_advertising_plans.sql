-- FARO PORTUARIO · Oferta publicitaria mensual simple y transparente
update public.advertising_plans set is_active = false, updated_at = now();

insert into public.advertising_plans
  (code, name, description, features, monthly_price, currency, requires_quote, is_active, sort_order, updated_at)
values
  (
    'basic_presence',
    'Impulso Faro',
    'Presencia constante para empresas que quieren generar reconocimiento y contactos dentro de la comunidad logística.',
    array[
      'Perfil destacado en el directorio empresarial',
      'Insignia de anunciante activo',
      'Banner en una sección de Faro Portuario',
      'Enlace directo a sitio web o WhatsApp',
      'Hasta 1 publicación patrocinada al mes',
      'Reporte mensual de impresiones y clics'
    ],
    799,
    'MXN',
    false,
    true,
    10,
    now()
  ),
  (
    'featured_company',
    'Líder Portuario',
    'Cobertura preferente para posicionar la marca, promover servicios y captar oportunidades comerciales.',
    array[
      'Todo lo incluido en Impulso Faro',
      'Banner rotativo en portada y hasta 3 secciones',
      'Prioridad en empresas destacadas del directorio',
      'Hasta 4 publicaciones patrocinadas al mes',
      'Botón destacado de llamada o WhatsApp',
      'Reporte mensual con impresiones, clics y contactos',
      'Acompañamiento para optimizar la campaña'
    ],
    1999,
    'MXN',
    false,
    true,
    20,
    now()
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  features = excluded.features,
  monthly_price = excluded.monthly_price,
  currency = excluded.currency,
  requires_quote = excluded.requires_quote,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
