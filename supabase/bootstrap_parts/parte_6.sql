-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · Parte 6/6 · migraciones 025-027
-- Ejecutar EN ORDEN. La migracion 001 ya fue aplicada; NO reejecutar.
-- ════════════════════════════════════════════════════════════════════════════

-- >>> 025_two_advertising_plans.sql
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


-- >>> 026_port_live_map_coordinates.sql
-- FARO PORTUARIO · coordenadas para el mapa operativo.
-- Conserva las coordenadas existentes y garantiza compatibilidad en proyectos
-- donde la migración histórica de zonas ya fue aplicada.
alter table public.sections
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.sections.lat is 'Latitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';
comment on column public.sections.lng is 'Longitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';


-- >>> 027_commerce_marketplace_jobs.sql
-- FARO PORTUARIO · membresías comerciales y Marketplace

insert into public.plans (code,name,audience,description,currency,monthly_price,annual_price,trial_days,is_active,is_featured,sort_order) values
  ('job_membership','Talento Faro','company','Publicación de vacantes durante 30 días.','MXN',599,null,0,true,false,61),
  ('marketplace_starter','Vitrina 3','provider','Publicación de hasta 3 productos.','MXN',599,null,0,true,false,62),
  ('marketplace_growth','Catálogo 10','provider','Publicación de 4 a 10 productos.','MXN',799,null,0,true,true,63),
  ('marketplace_scale','Escala','provider','Publicación desde 11 productos sin límite máximo.','MXN',1399,null,0,true,false,64)
on conflict (code) do update set name=excluded.name,description=excluded.description,currency='MXN',monthly_price=excluded.monthly_price,annual_price=null,is_active=true,is_featured=excluded.is_featured,sort_order=excluded.sort_order;

insert into public.plan_limits (plan_id,feature_code,limit_value,is_enabled)
select id,'active_jobs',null,true from public.plans where code='job_membership'
on conflict (plan_id,feature_code) do update set limit_value=null,is_enabled=true;

insert into public.plan_limits (plan_id,feature_code,limit_value,is_enabled)
select id,'marketplace_products',case code when 'marketplace_starter' then 3 when 'marketplace_growth' then 10 else null end,true
from public.plans where code in ('marketplace_starter','marketplace_growth','marketplace_scale')
on conflict (plan_id,feature_code) do update set limit_value=excluded.limit_value,is_enabled=true;

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null default 'otros',
  listing_type text not null default 'sale' check (listing_type in ('sale','rent','service')),
  price numeric(12,2) check (price is null or price >= 0),
  currency text not null default 'MXN' check (currency='MXN'),
  price_includes_vat boolean not null default false,
  city text not null default 'Manzanillo',
  state text not null default 'Colima',
  image_urls text[] not null default '{}',
  contact_phone text,
  contact_whatsapp text,
  status text not null default 'draft' check (status in ('draft','published','paused','sold','expired')),
  published_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint marketplace_images_limit check (cardinality(image_urls) <= 4)
);

create index if not exists marketplace_products_public_idx on public.marketplace_products(status,created_at desc) where deleted_at is null;
create index if not exists marketplace_products_company_idx on public.marketplace_products(company_id,status,created_at desc) where deleted_at is null;
alter table public.marketplace_products enable row level security;

drop policy if exists "marketplace_public_read" on public.marketplace_products;
create policy "marketplace_public_read" on public.marketplace_products for select
using (status='published' and deleted_at is null and expires_at > now());

drop policy if exists "marketplace_company_manage" on public.marketplace_products;
create policy "marketplace_company_manage" on public.marketplace_products for all
using (exists(select 1 from public.company_members cm where cm.company_id=marketplace_products.company_id and cm.user_id=auth.uid() and cm.status='active' and cm.member_role in ('owner','admin')))
with check (exists(select 1 from public.company_members cm where cm.company_id=marketplace_products.company_id and cm.user_id=auth.uid() and cm.status='active' and cm.member_role in ('owner','admin')));

drop trigger if exists marketplace_products_updated_at on public.marketplace_products;
create trigger marketplace_products_updated_at before update on public.marketplace_products for each row execute function public.set_updated_at();


-- >>> SEED semaforo inicial (Pulso Portuario)
-- ════════════════════════════════════════════════════════════════════════════
-- SEED · Pulso Portuario — Zonas del Puerto de Manzanillo
-- ────────────────────────────────────────────────────────────────────────────
-- Ejecuta este bloque completo en el SQL Editor de Supabase.
-- Es IDEMPOTENTE: puedes correrlo varias veces sin duplicar datos.
--   1) Garantiza columnas lat/lng en public.sections
--   2) Inserta/actualiza las 25 zonas reales del puerto (upsert por slug)
--   3) Crea el estado inicial del semáforo para toda zona que aún no lo tenga
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Columnas de coordenadas (por si el esquema es previo a la migración 003) ──
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- 2) Zonas reales del puerto (acceso → regulador → aduana → terminales → patios)
INSERT INTO public.sections (name, slug, description, lat, lng) VALUES
  -- ── ACCESOS Y VIALIDADES ──────────────────────────────────────────────────
  ('Libramiento Manzanillo',     'libramiento',          'Vía rápida de acceso/salida al puerto. Revisar flujo vehicular y retenes.',   19.1020, -104.3210),
  ('Acceso Principal (Caseta)',  'acceso-principal',     'Caseta de cobro y control de acceso al recinto portuario.',                   19.0985, -104.3192),
  ('Acceso Secundario',          'acceso-secundario',    'Entrada/salida alterna para unidades. Control de documentación.',             19.0972, -104.3205),
  ('Báscula de Entrada',         'bascula-entrada',      'Área de pesaje obligatorio para unidades cargadas.',                          19.0968, -104.3198),
  -- ── PATIO REGULADOR ───────────────────────────────────────────────────────
  ('Patio Regulador Norte',      'patio-regulador-norte','Zona de espera y regulación de flujo vehicular antes de ingresar al puerto.', 19.1005, -104.3180),
  ('Patio Regulador Sur',        'patio-regulador-sur',  'Área de cola y asignación de citas para unidades que esperan turno.',         19.0990, -104.3175),
  -- ── ADUANA Y TRAMITACIÓN ──────────────────────────────────────────────────
  ('Aduana Manzanillo',          'aduana',               'Acceso a la zona aduanal. Revisión de documentos y cargas.',                  19.0962, -104.3165),
  ('Módulo de Verificación',     'modulo-verificacion',  'Revisión física de contenedores y cargas. Inspección de rayos X.',            19.0958, -104.3160),
  ('Ventanilla Única Portuaria', 'ventanilla-unica',     'Trámites de despacho aduanal, pedimentos y permisos.',                        19.0955, -104.3155),
  -- ── TERMINALES ESPECIALIZADAS ─────────────────────────────────────────────
  ('Terminal SSA México (TMESA)','terminal-ssa',         'Terminal de contenedores SSA México. Principal operación de carga/descarga.', 19.0945, -104.3148),
  ('Terminal ICTSI (TIM)',       'terminal-ictsi',       'Terminal Internacional de Manzanillo. Operación de contenedores de gran calado.', 19.0938, -104.3140),
  ('Terminal TEP',               'patio-tep',            'Terminal especializada en productos a granel y carga general.',               19.0958, -104.3175),
  ('Terminal Impala',            'impala',               'Terminal Impala: graneles líquidos, agroquímicos y fertilizantes.',           19.0900, -104.3148),
  ('Impala Terminals',           'impala-terminals',     'Almacenamiento de líquidos a granel: aceites, químicos y derivados.',         19.0960, -104.3152),
  -- ── PATIOS DE CONTENEDORES ────────────────────────────────────────────────
  ('Patio ALCAM',                'patio-alcam',          'Patio de almacenamiento y consolidación de carga ALCAM.',                     19.0972, -104.3128),
  ('Patios Vacíos SSA',          'patios-vacios-ssa',    'Zona de depósito de contenedores vacíos bajo resguardo de SSA.',              19.0945, -104.3155),
  ('Patios Llenos SSA',          'patios-llenos-ssa',    'Patio de contenedores llenos en espera de despacho o arribo.',                19.0930, -104.3150),
  ('Patio Acoman',               'patio-acoman',         'Patio de maniobras y almacenamiento temporal para unidades del puerto.',      19.0928, -104.3163),
  ('Patio Ferroviario',          'patio-ferroviario',    'Zona de transferencia modal ferrocarril-camión. Carga/descarga de vagones.',  19.0915, -104.3142),
  -- ── ZONA INDUSTRIAL PORTUARIA ─────────────────────────────────────────────
  ('Zona Industrial Puerto',     'zona-industrial',      'Área industrial contigua al puerto: bodegas, maquiladoras y almacenes.',      19.0920, -104.3200),
  ('Zona de Carga Peligrosa',    'carga-peligrosa',      'Área restringida para materiales peligrosos, químicos y explosivos.',         19.0905, -104.3160),
  ('Frigorífico Portuario',      'frigorifico',          'Almacenamiento en frío: productos perecederos, alimentos y farmacéuticos.',   19.0910, -104.3135),
  -- ── SERVICIOS INTERNOS ────────────────────────────────────────────────────
  ('Área de Talleres Portuarios','talleres-portuarios',  'Zona de mantenimiento de equipo portuario: grúas, montacargas y maquinaria.', 19.0935, -104.3185),
  ('Gasolinera Puerto',          'gasolinera-puerto',    'Suministro de combustible para unidades dentro del recinto portuario.',       19.0948, -104.3190)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  lat         = EXCLUDED.lat,
  lng         = EXCLUDED.lng,
  is_active   = true;

-- 3) Estado inicial del semáforo para cada zona sin registro de cache ──────────
INSERT INTO public.section_status_cache (section_id, current_status, active_reports, confidence)
SELECT s.id, 'free', 0, 0
FROM public.sections s
WHERE NOT EXISTS (
  SELECT 1 FROM public.section_status_cache c WHERE c.section_id = s.id
);

-- ── Verificación (opcional): cuántas zonas quedaron activas ───────────────────
-- SELECT count(*) AS zonas_activas FROM public.sections WHERE is_active = true;
