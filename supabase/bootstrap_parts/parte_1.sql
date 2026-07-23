-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · Parte 1/6 · migraciones 002-007
-- Ejecutar EN ORDEN. La migracion 001 ya fue aplicada; NO reejecutar.
-- ════════════════════════════════════════════════════════════════════════════

-- >>> 002_modules.sql
-- ── Módulo 1: Alertas de Emergencia ─────────────────────────────────────────
create table if not exists public.emergency_alerts (
  id          uuid primary key default uuid_generate_v4(),
  message     text not null,
  is_active   boolean default true,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  resolved_at timestamptz
);
alter table public.emergency_alerts enable row level security;
create policy "public_read_alerts"   on public.emergency_alerts for select using (true);
create policy "service_write_alerts" on public.emergency_alerts for all using (true);

-- ── Módulo 2: Ticker de Noticias ─────────────────────────────────────────────
create table if not exists public.news_items (
  id         uuid primary key default uuid_generate_v4(),
  content    text not null check (char_length(content) <= 200),
  category   text default 'aviso' check (category in ('aviso','cierre','operativo','clima','general')),
  is_active  boolean default true,
  priority   int default 0,
  created_by uuid references public.profiles(id),
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);
alter table public.news_items enable row level security;
create policy "public_read_news"   on public.news_items for select using (true);
create policy "service_write_news" on public.news_items for all using (true);

insert into public.news_items (content, category, priority, expires_at) values
  ('Bienvenido a Faro Portuario · Conecta con el ecosistema logístico de Manzanillo', 'general', 10, now() + interval '365 days'),
  ('Para reportar necesitas registrarte · Es gratis · Tarda menos de 1 minuto', 'aviso', 5, now() + interval '365 days');

-- ── Módulo 4: Anuncios Comerciales ───────────────────────────────────────────
create table if not exists public.ads (
  id           uuid primary key default uuid_generate_v4(),
  company_name text not null,
  tagline      text,
  image_url    text,
  cta_text     text default 'Ver más',
  cta_url      text,
  phone        text,
  whatsapp     text,
  plan         text default 'basic' check (plan in ('basic','premium','featured')),
  position     text default 'dashboard' check (position in ('dashboard','sidebar','ticker','all')),
  is_active    boolean default true,
  starts_at    timestamptz default now(),
  ends_at      timestamptz default (now() + interval '30 days'),
  clicks       int default 0,
  impressions  int default 0,
  created_at   timestamptz default now()
);
alter table public.ads enable row level security;
create policy "public_read_ads"   on public.ads for select using (is_active = true and ends_at > now());
create policy "service_write_ads" on public.ads for all using (true);

insert into public.ads (company_name, tagline, cta_text, cta_url, phone, plan, position) values
  ('Tu Empresa Aquí', 'Presenta tus servicios ante una audiencia especializada del sector logístico', 'Anúnciate', '/anunciate', NULL, 'featured', 'dashboard');

-- ── Módulo 6: Directorio de Servicios ────────────────────────────────────────
create table if not exists public.directory_listings (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  category     text not null check (category in (
                 'taller','grua','gasolinera','restaurante','hotel',
                 'agencia_aduanal','refaccionaria','lavado','otro'
               )),
  description  text,
  address      text,
  phone        text,
  whatsapp     text,
  maps_url     text,
  is_featured  boolean default false,
  is_active    boolean default true,
  created_at   timestamptz default now()
);
alter table public.directory_listings enable row level security;
create policy "public_read_directory"   on public.directory_listings for select using (is_active = true);
create policy "service_write_directory" on public.directory_listings for all using (true);

insert into public.directory_listings (name, category, description, phone, is_featured) values
  ('Talleres Puerto', 'taller', 'Servicio diesel y reparación de unidades pesadas cerca del puerto', '3141234567', true),
  ('Grúas Manzanillo 24h', 'grua', 'Servicio de grúa disponible las 24 horas para unidades pesadas', '3149876543', true),
  ('Fonda La Terminal', 'restaurante', 'Comida corrida económica, desayunos desde las 5am para transportistas', '3141112233', false);

-- ── Módulo 7: Chat por Sección ───────────────────────────────────────────────
create table if not exists public.section_messages (
  id         uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 3 and 200),
  created_at timestamptz default now()
);
create index if not exists idx_messages_section on public.section_messages(section_id, created_at desc);
alter table public.section_messages enable row level security;
create policy "public_read_messages" on public.section_messages for select using (true);
create policy "auth_insert_messages" on public.section_messages for insert with check (auth.uid() = user_id);


-- >>> 003_zones_update.sql
-- ── Actualización de zonas reales del Puerto de Manzanillo ──────────────────
-- Elimina zonas genéricas e inserta todas las zonas reales del puerto
-- Cubre: acceso → regulador → aduana → terminales → patios de almacenamiento

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Limpiar zonas anteriores (si existen con slugs viejos)
DELETE FROM public.sections WHERE slug IN (
  'patio-tep','impala-terminals','patio-alcam','patios-vacios-ssa',
  'patios-llenos-ssa','patio-acoman','impala','libramiento',
  'primer-acceso','segundo-acceso','zona-franca'
);

-- ── ACCESOS Y VIALIDADES ────────────────────────────────────────────────────
INSERT INTO public.sections (name, slug, description, lat, lng) VALUES
  ('Libramiento Manzanillo',     'libramiento',          'Vía rápida de acceso/salida al puerto. Revisar flujo vehicular y retenes.',              19.1020, -104.3210),
  ('Acceso Principal (Caseta)',  'acceso-principal',     'Caseta de cobro y control de acceso al recinto portuario.',                              19.0985, -104.3192),
  ('Acceso Secundario',          'acceso-secundario',    'Entrada/salida alterna para unidades. Control de documentación.',                        19.0972, -104.3205),
  ('Báscula de Entrada',         'bascula-entrada',      'Área de pesaje obligatorio para unidades cargadas.',                                    19.0968, -104.3198),

-- ── PATIO REGULADOR ─────────────────────────────────────────────────────────
  ('Patio Regulador Norte',      'patio-regulador-norte','Zona de espera y regulación de flujo vehicular antes de ingresar al puerto.',           19.1005, -104.3180),
  ('Patio Regulador Sur',        'patio-regulador-sur',  'Área de cola y asignación de citas para unidades que esperan turno.',                   19.0990, -104.3175),

-- ── ADUANA Y TRAMITACIÓN ────────────────────────────────────────────────────
  ('Aduana Manzanillo',          'aduana',               'Acceso a la zona aduanal. Revisión de documentos y cargas.',                            19.0962, -104.3165),
  ('Módulo de Verificación',     'modulo-verificacion',  'Revisión física de contenedores y cargas. Inspección de rayos X.',                      19.0958, -104.3160),
  ('Ventanilla Única Portuaria', 'ventanilla-unica',     'Trámites de despacho aduanal, pedimentos y permisos.',                                 19.0955, -104.3155),

-- ── TERMINALES ESPECIALIZADAS ───────────────────────────────────────────────
  ('Terminal SSA México (TMESA)','terminal-ssa',         'Terminal de contenedores SSA México. Principal operación de carga/descarga.',           19.0945, -104.3148),
  ('Terminal ICTSI (TIM)',       'terminal-ictsi',       'Terminal Internacional de Manzanillo. Operación de contenedores de gran calado.',       19.0938, -104.3140),
  ('Terminal TEP',               'patio-tep',            'Terminal especializada en productos a granel y carga general.',                         19.0958, -104.3175),
  ('Terminal Impala',            'impala',               'Terminal Impala: graneles líquidos, agroquímicos y fertilizantes.',                     19.0900, -104.3148),
  ('Impala Terminals',           'impala-terminals',     'Almacenamiento de líquidos a granel: aceites, químicos y derivados.',                   19.0960, -104.3152),

-- ── PATIOS DE CONTENEDORES ──────────────────────────────────────────────────
  ('Patio ALCAM',                'patio-alcam',          'Patio de almacenamiento y consolidación de carga ALCAM.',                              19.0972, -104.3128),
  ('Patios Vacíos SSA',          'patios-vacios-ssa',    'Zona de depósito de contenedores vacíos bajo resguardo de SSA.',                       19.0945, -104.3155),
  ('Patios Llenos SSA',          'patios-llenos-ssa',    'Patio de contenedores llenos en espera de despacho o arribo.',                         19.0930, -104.3150),
  ('Patio Acoman',               'patio-acoman',         'Patio de maniobras y almacenamiento temporal para unidades del puerto.',                19.0928, -104.3163),
  ('Patio Ferroviario',          'patio-ferroviario',    'Zona de transferencia modal ferrocarril-camión. Carga/descarga de vagones.',            19.0915, -104.3142),

-- ── ZONA INDUSTRIAL PORTUARIA ───────────────────────────────────────────────
  ('Zona Industrial Puerto',     'zona-industrial',      'Área industrial contigua al puerto: bodegas, maquiladoras y almacenes.',               19.0920, -104.3200),
  ('Zona de Carga Peligrosa',    'carga-peligrosa',      'Área restringida para materiales peligrosos, químicos y explosivos.',                  19.0905, -104.3160),
  ('Frigorífico Portuario',      'frigorifico',          'Almacenamiento en frío: productos perecederos, alimentos y farmacéuticos.',            19.0910, -104.3135),

-- ── SERVICIOS INTERNOS ──────────────────────────────────────────────────────
  ('Área de Talleres Portuarios','talleres-portuarios',  'Zona de mantenimiento de equipo portuario: grúas, montacargas y maquinaria.',          19.0935, -104.3185),
  ('Gasolinera Puerto',          'gasolinera-puerto',    'Suministro de combustible para unidades dentro del recinto portuario.',                19.0948, -104.3190)

ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  lat         = EXCLUDED.lat,
  lng         = EXCLUDED.lng;


-- >>> 004_posturas.sql
-- ── Tabla de Posturas: operadores disponibles para trabajo ──────────────────

CREATE TABLE IF NOT EXISTS public.posturas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_completo  TEXT        NOT NULL,
  edad             INTEGER,
  tipo_licencia    TEXT        NOT NULL DEFAULT 'federal-b',
  tipo_maniobra    TEXT        NOT NULL DEFAULT 'full',
  labora           TEXT        NOT NULL DEFAULT 'local',   -- 'local' | 'foraneo' | 'ambos'
  telefono         TEXT,
  whatsapp         TEXT,
  correo           TEXT,
  ciudad           TEXT,
  descripcion      TEXT,
  estatus          TEXT        NOT NULL DEFAULT 'disponible', -- 'disponible' | 'ocupado' | 'no-disponible'
  licencia_url     TEXT,
  ine_url          TEXT,
  estrellas        NUMERIC(3,2) DEFAULT 0,
  total_reviews    INTEGER     DEFAULT 0,
  is_active        BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS posturas_estatus_idx   ON public.posturas (estatus);
CREATE INDEX IF NOT EXISTS posturas_labora_idx    ON public.posturas (labora);
CREATE INDEX IF NOT EXISTS posturas_licencia_idx  ON public.posturas (tipo_licencia);
CREATE INDEX IF NOT EXISTS posturas_is_active_idx ON public.posturas (is_active);

-- RLS
ALTER TABLE public.posturas ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver posturas activas
CREATE POLICY "posturas_select" ON public.posturas
  FOR SELECT USING (is_active = true);

-- Solo el dueño puede insertar/actualizar su postura
CREATE POLICY "posturas_insert" ON public.posturas
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "posturas_update" ON public.posturas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posturas_delete" ON public.posturas
  FOR DELETE USING (auth.uid() = user_id);


-- >>> 005_vacantes.sql
-- ── Tabla de Vacantes: empresas publican ofertas para operadores ─────────────

CREATE TABLE IF NOT EXISTS public.vacantes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Datos de la empresa
  empresa           TEXT        NOT NULL,
  contacto_nombre   TEXT,
  contacto_tel      TEXT,
  contacto_wa       TEXT,
  contacto_correo   TEXT,
  ciudad            TEXT        DEFAULT 'Manzanillo',
  logo_url          TEXT,

  -- Descripción del puesto
  puesto            TEXT        NOT NULL,
  descripcion       TEXT,
  sueldo_min        NUMERIC(10,2),
  sueldo_max        NUMERIC(10,2),
  tipo_contrato     TEXT        DEFAULT 'indefinido',  -- 'indefinido'|'temporal'|'por-viaje'|'honorarios'

  -- Requisitos del operador
  tipo_licencia     TEXT        NOT NULL DEFAULT 'federal-b',
  tipo_maniobra     TEXT,
  antiguedad_min    INTEGER     DEFAULT 0,             -- años mínimos de experiencia
  labora            TEXT        DEFAULT 'ambos',       -- 'local'|'foraneo'|'ambos'
  edad_min          INTEGER,
  edad_max          INTEGER,
  requisitos_extra  TEXT,                              -- texto libre de requisitos

  -- Beneficios
  beneficios        TEXT,                              -- IMSS, INFONAVIT, vales, etc.

  -- Estado
  estatus           TEXT        DEFAULT 'activa',      -- 'activa'|'pausada'|'cerrada'
  is_active         BOOLEAN     DEFAULT true,
  expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS vacantes_estatus_idx    ON public.vacantes (estatus);
CREATE INDEX IF NOT EXISTS vacantes_licencia_idx   ON public.vacantes (tipo_licencia);
CREATE INDEX IF NOT EXISTS vacantes_labora_idx     ON public.vacantes (labora);
CREATE INDEX IF NOT EXISTS vacantes_is_active_idx  ON public.vacantes (is_active);
CREATE INDEX IF NOT EXISTS vacantes_expires_idx    ON public.vacantes (expires_at);

-- RLS
ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacantes_select" ON public.vacantes
  FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "vacantes_insert" ON public.vacantes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "vacantes_update" ON public.vacantes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "vacantes_delete" ON public.vacantes
  FOR DELETE USING (auth.uid() = user_id);


-- >>> 006_subscriptions.sql
-- ─── Tabla de suscripciones de empresas ─────────────────────────────────────
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  tipo          text not null default 'empresa_vacantes',   -- tipo de suscripción
  estatus       text not null default 'pendiente'           -- pendiente | activa | vencida | cancelada
                check (estatus in ('pendiente', 'activa', 'vencida', 'cancelada')),
  monto         numeric(10,2) not null default 500.00,
  moneda        text not null default 'MXN',
  -- Periodo
  starts_at     timestamptz,
  expires_at    timestamptz,
  -- Comprobante de pago (usuario sube imagen/referencia)
  comprobante_url  text,
  referencia_pago  text,                                    -- CLABE / referencia / número de operación
  metodo_pago      text,                                    -- transferencia | oxxo | efectivo | otro
  notas_admin      text,                                    -- notas del admin al activar/rechazar
  -- Auditoría
  activado_por  uuid references auth.users(id),            -- admin que activó
  activado_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índices
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_estatus_idx on public.subscriptions(estatus);

-- RLS
alter table public.subscriptions enable row level security;

-- Usuario ve sus propias suscripciones
create policy "User reads own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Usuario crea solicitud de suscripción (pendiente)
create policy "User inserts own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id and estatus = 'pendiente');

-- Usuario puede actualizar su comprobante si está pendiente
create policy "User updates own pending subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id and estatus = 'pendiente')
  with check (estatus = 'pendiente');

-- Admin puede leer y actualizar todas
create policy "Admin full access subscriptions"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();


-- >>> 007_reputacion.sql
-- ─── Sistema de Reputación ────────────────────────────────────────────────────
-- Agrega columnas de reputación a profiles
alter table public.profiles
  add column if not exists puntos            int          not null default 0,
  add column if not exists nivel             text         not null default 'nuevo',
  add column if not exists total_reportes    int          not null default 0,
  add column if not exists reportes_confirmados int       not null default 0,
  add column if not exists reportes_precisos   int        not null default 0,
  add column if not exists racha_dias          int        not null default 0,
  add column if not exists ultimo_reporte_at   timestamptz;

-- Función para calcular el nivel basado en puntos
create or replace function public.calcular_nivel(puntos int)
returns text language plpgsql as $$
begin
  return case
    when puntos >= 5000 then 'elite'
    when puntos >= 2500 then 'embajador'
    when puntos >= 1000 then 'premium'
    when puntos >= 500  then 'experto'
    when puntos >= 100  then 'colaborador'
    else                     'nuevo'
  end;
end;
$$;

-- Función que se llama cuando se crea un reporte: +5 puntos
create or replace function public.otorgar_puntos_reporte()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is not null then
    update public.profiles
    set
      puntos            = puntos + 5,
      total_reportes    = total_reportes + 1,
      ultimo_reporte_at = now(),
      nivel             = public.calcular_nivel(puntos + 5)
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created
  after insert on public.reports
  for each row execute function public.otorgar_puntos_reporte();

-- Función que se llama cuando una reacción confirma un reporte: +10 puntos al autor
create or replace function public.otorgar_puntos_confirmacion()
returns trigger language plpgsql security definer as $$
declare
  report_owner uuid;
begin
  -- Solo procesar reacciones tipo 'confirm'
  if new.reaction = 'confirm' then
    -- Obtener el dueño del reporte
    select user_id into report_owner from public.reports where id = new.report_id;
    if report_owner is not null and report_owner != new.user_id then
      update public.profiles
      set
        puntos                = puntos + 10,
        reportes_confirmados  = reportes_confirmados + 1,
        nivel                 = public.calcular_nivel(puntos + 10)
      where id = report_owner;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_reaction_confirm on public.vote_reactions;
create trigger on_reaction_confirm
  after insert on public.vote_reactions
  for each row execute function public.otorgar_puntos_confirmacion();

