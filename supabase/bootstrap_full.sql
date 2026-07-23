-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP COMPLETO · Faro Portuario
-- Aplica las 27 migraciones en orden sobre una base de datos VACÍA.
-- Pegar TODO en el SQL Editor de Supabase y pulsar Run UNA sola vez.
-- Equivale a "supabase db push". Las 25 zonas del puerto se crean en la
-- migracion 003; el semaforo inicial se siembra al final.
-- ════════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 001_initial_schema.sql
-- ────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- =============================================
-- SECTIONS — zonas del puerto
-- =============================================
create table public.sections (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  icon        text default 'map-pin',
  is_active   boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- =============================================
-- PROFILES — extiende auth.users
-- =============================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  full_name     text,
  phone         text,
  role          text default 'operator_free'
                  check (role in ('operator_free','operator_premium','company','admin')),
  reputation    numeric(4,2) default 1.00,
  reports_count int default 0,
  is_verified   boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- =============================================
-- REPORTS — núcleo del sistema de votos
-- =============================================
create type status_level as enum ('free','moderate','congested','closed');

create table public.reports (
  id             uuid primary key default uuid_generate_v4(),
  section_id     uuid not null references public.sections(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  status         status_level not null,
  comment        text check (char_length(comment) <= 140),
  weight         numeric(4,2) default 1.00,
  confirmations  int default 0,
  contradictions int default 0,
  expires_at     timestamptz not null,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

create index idx_reports_section_active on public.reports(section_id, is_active, expires_at desc);
create index idx_reports_user on public.reports(user_id, created_at desc);

-- =============================================
-- VOTE_REACTIONS — confirmar o contradecir
-- =============================================
create table public.vote_reactions (
  id         uuid primary key default uuid_generate_v4(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reaction   text not null check (reaction in ('confirm','contradict')),
  created_at timestamptz default now(),
  unique(report_id, user_id)
);

-- =============================================
-- SECTION_STATUS_CACHE — estado calculado
-- =============================================
create table public.section_status_cache (
  section_id      uuid primary key references public.sections(id),
  current_status  status_level default 'free',
  active_reports  int default 0,
  confidence      numeric(4,2) default 0,
  last_calculated timestamptz default now(),
  last_report_at  timestamptz
);

-- =============================================
-- FUNCIÓN: calcular estado con decaimiento temporal
-- =============================================
create or replace function calculate_section_status(p_section_id uuid)
returns void as $$
declare
  v_now          timestamptz := now();
  w_free         numeric := 0;
  w_moderate     numeric := 0;
  w_congested    numeric := 0;
  w_closed       numeric := 0;
  v_total        numeric := 0;
  v_count        int := 0;
  v_status       status_level := 'free';
  v_confidence   numeric := 0;
begin
  select
    coalesce(sum(case when r.status = 'free' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'moderate' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'congested' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'closed' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    count(*)
  into w_free, w_moderate, w_congested, w_closed, v_count
  from public.reports r
  where r.section_id = p_section_id
    and r.is_active = true
    and r.expires_at > v_now;

  v_total := w_free + w_moderate + w_congested + w_closed;

  if v_total > 0 then
    if w_closed >= greatest(w_free, w_moderate, w_congested) then
      v_status := 'closed';     v_confidence := w_closed / v_total;
    elsif w_congested >= greatest(w_free, w_moderate) then
      v_status := 'congested';  v_confidence := w_congested / v_total;
    elsif w_moderate >= w_free then
      v_status := 'moderate';   v_confidence := w_moderate / v_total;
    else
      v_status := 'free';       v_confidence := w_free / v_total;
    end if;
  end if;

  insert into public.section_status_cache
    (section_id, current_status, active_reports, confidence, last_calculated, last_report_at)
  values (
    p_section_id, v_status, v_count, v_confidence, v_now,
    (select max(created_at) from public.reports
     where section_id = p_section_id and is_active = true and expires_at > v_now)
  )
  on conflict (section_id) do update set
    current_status  = excluded.current_status,
    active_reports  = excluded.active_reports,
    confidence      = excluded.confidence,
    last_calculated = excluded.last_calculated,
    last_report_at  = excluded.last_report_at;
end;
$$ language plpgsql security definer;

-- TRIGGER: recalcular al insertar reporte
create or replace function trg_recalculate() returns trigger as $$
begin perform calculate_section_status(NEW.section_id); return NEW; end;
$$ language plpgsql security definer;

create trigger on_report_insert
  after insert on public.reports for each row execute function trg_recalculate();

-- TRIGGER: crear profile al registrar usuario
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- RLS
alter table public.sections            enable row level security;
alter table public.profiles            enable row level security;
alter table public.reports             enable row level security;
alter table public.vote_reactions      enable row level security;
alter table public.section_status_cache enable row level security;

create policy "public_read_sections"  on public.sections            for select using (true);
create policy "public_read_profiles"  on public.profiles            for select using (true);
create policy "own_write_profiles"    on public.profiles            for all    using (auth.uid() = id);
create policy "public_read_reports"   on public.reports             for select using (true);
create policy "auth_insert_reports"   on public.reports             for insert with check (auth.uid() = user_id);
create policy "own_update_reports"    on public.reports             for update using (auth.uid() = user_id);
create policy "public_read_reactions" on public.vote_reactions      for select using (true);
create policy "auth_write_reactions"  on public.vote_reactions      for all    using (auth.uid() = user_id);
create policy "public_read_cache"     on public.section_status_cache for select using (true);
create policy "service_write_cache"   on public.section_status_cache for all    using (true);


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 002_modules.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 003_zones_update.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 004_posturas.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 005_vacantes.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 006_subscriptions.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 007_reputacion.sql
-- ────────────────────────────────────────────────────────────────────────────
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
  if new.type = 'confirm' then
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

drop trigger if exists on_reaction_confirm on public.reactions;
create trigger on_reaction_confirm
  after insert on public.reactions
  for each row execute function public.otorgar_puntos_confirmacion();


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 008_analytics_alerts.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ================================================================
-- 008_analytics_alerts.sql
-- Tablas para: historial de estado de zonas, alertas configurables,
-- evidencia de reportes, eventos de línea del tiempo, simulaciones de costo
-- ================================================================

-- ── 1. Historial de estado de zonas ─────────────────────────────
create table if not exists public.zone_status_history (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid references public.sections(id) on delete cascade,
  status        text not null,
  active_reports int not null default 0,
  confidence    float8 not null default 0,
  recorded_at   timestamptz not null default now()
);

create index if not exists zone_status_history_section_id_idx on public.zone_status_history(section_id);
create index if not exists zone_status_history_recorded_at_idx on public.zone_status_history(recorded_at desc);

-- RLS: lectura pública, escritura solo servidor
alter table public.zone_status_history enable row level security;
create policy "Public read zone_status_history"
  on public.zone_status_history for select using (true);

-- ── 2. Evidencia de reportes ─────────────────────────────────────
create table if not exists public.report_evidence (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.reports(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  tipo        text not null check (tipo in ('foto','video','audio','documento')),
  url         text not null,
  thumbnail   text,
  created_at  timestamptz not null default now()
);

alter table public.report_evidence enable row level security;
create policy "Public read report_evidence"
  on public.report_evidence for select using (true);
create policy "Users insert own evidence"
  on public.report_evidence for insert
  with check (auth.uid() = user_id);

-- ── 3. Alertas configurables ─────────────────────────────────────
create table if not exists public.user_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  section_id    uuid references public.sections(id) on delete cascade,
  tipo          text not null check (tipo in ('saturacion','cierre','operativo','cambio','fila_alta','zona_libre')),
  nivel_minimo  text not null default 'congested' check (nivel_minimo in ('moderate','congested','closed')),
  canal         text not null default 'portal' check (canal in ('portal','whatsapp','email')),
  activa        boolean not null default true,
  ultimo_envio  timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.user_alerts enable row level security;
create policy "Users manage own alerts"
  on public.user_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. Eventos de línea del tiempo ──────────────────────────────
create table if not exists public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid references public.sections(id) on delete cascade,
  report_id   uuid references public.reports(id) on delete set null,
  tipo        text not null check (tipo in (
    'reporte_recibido','confirmacion','cambio_estado','alerta_generada',
    'congestion_detectada','incidente','zona_normalizada','cierre','apertura'
  )),
  severidad   text not null default 'normal' check (severidad in ('normal','media','alta','critica')),
  descripcion text,
  fuente      text not null default 'comunidad' check (fuente in ('comunidad','ia','sistema','admin')),
  created_at  timestamptz not null default now()
);

create index if not exists timeline_events_section_id_idx on public.timeline_events(section_id);
create index if not exists timeline_events_created_at_idx on public.timeline_events(created_at desc);

alter table public.timeline_events enable row level security;
create policy "Public read timeline_events"
  on public.timeline_events for select using (true);

-- ── 5. Simulaciones de costo ─────────────────────────────────────
create table if not exists public.cost_simulations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete cascade,
  unidades          int not null,
  costo_por_hora    numeric(10,2) not null,
  horas_espera      numeric(5,2) not null,
  dias_mes          int not null,
  costo_diario      numeric(12,2) not null,
  costo_mensual     numeric(12,2) not null,
  costo_anual       numeric(14,2) not null,
  ahorro_20pct      numeric(12,2) not null,
  ahorro_35pct      numeric(12,2) not null,
  created_at        timestamptz not null default now()
);

alter table public.cost_simulations enable row level security;
create policy "Users manage own simulations"
  on public.cost_simulations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. Perfiles de empresa ───────────────────────────────────────
create table if not exists public.company_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete cascade unique,
  nombre_empresa    text not null,
  tipo_empresa      text check (tipo_empresa in ('transportista','naviera','patio','terminal','agente_aduanal','cliente_logistico','otro')),
  num_unidades      int,
  zonas_favoritas   text[],
  telefono_whatsapp text,
  recibir_reportes  boolean default true,
  plan_activo       text default 'gratuito' check (plan_activo in ('gratuito','operador_pro','empresa','empresa_pro','patio_terminal','enterprise')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.company_profiles enable row level security;
create policy "Users manage own company profile"
  on public.company_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admin read all company profiles"
  on public.company_profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- updated_at trigger
create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function update_updated_at_column();

-- ── 7. Trigger: registrar evento de timeline al crear reporte ────
create or replace function public.crear_evento_timeline()
returns trigger language plpgsql security definer as $$
begin
  insert into public.timeline_events (section_id, report_id, tipo, severidad, descripcion, fuente)
  values (
    new.section_id,
    new.id,
    'reporte_recibido',
    case new.status
      when 'congested' then 'alta'
      when 'moderate'  then 'media'
      when 'closed'    then 'critica'
      else 'normal'
    end,
    case new.status
      when 'free'      then 'Reporte: flujo libre'
      when 'moderate'  then 'Reporte: tráfico moderado'
      when 'congested' then 'Reporte: zona saturada'
      when 'closed'    then 'Reporte: zona cerrada'
      else 'Reporte recibido'
    end,
    'comunidad'
  );
  return new;
end;
$$;

drop trigger if exists on_report_insert_timeline on public.reports;
create trigger on_report_insert_timeline
  after insert on public.reports
  for each row execute function public.crear_evento_timeline();

-- ── 8. Trigger: detectar congestión y crear evento alerta ────────
create or replace function public.detectar_congestion()
returns trigger language plpgsql security definer as $$
begin
  -- Si el nuevo estado de caché es 'congested', registrar evento de alerta
  if new.current_status = 'congested' and
     (old.current_status is null or old.current_status != 'congested') then
    insert into public.timeline_events (section_id, tipo, severidad, descripcion, fuente)
    values (
      new.section_id,
      'congestion_detectada',
      'critica',
      'Saturación detectada por sistema de monitoreo',
      'sistema'
    );
  end if;

  -- Si el estado mejora (de congested a free), registrar normalización
  if old.current_status = 'congested' and new.current_status = 'free' then
    insert into public.timeline_events (section_id, tipo, severidad, descripcion, fuente)
    values (
      new.section_id,
      'zona_normalizada',
      'normal',
      'Zona normalizada: flujo libre detectado',
      'sistema'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_status_cache_change on public.section_status_cache;
create trigger on_status_cache_change
  after update of current_status on public.section_status_cache
  for each row execute function public.detectar_congestion();

-- ── Índices de eficiencia ────────────────────────────────────────
create index if not exists user_alerts_user_id_idx on public.user_alerts(user_id);
create index if not exists report_evidence_report_id_idx on public.report_evidence(report_id);
create index if not exists cost_simulations_user_id_idx on public.cost_simulations(user_id);
create index if not exists company_profiles_user_id_idx on public.company_profiles(user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 009_enable_realtime.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ================================================================
-- 009_enable_realtime.sql
-- Habilitar Supabase Realtime para las tablas críticas del mapa
-- Ejecutar en: Supabase SQL Editor
-- ================================================================

-- Habilitar realtime en section_status_cache (para el mapa en vivo)
alter publication supabase_realtime add table public.section_status_cache;

-- Habilitar realtime en reports (para el feed de actividad)
alter publication supabase_realtime add table public.reports;

-- Habilitar realtime en timeline_events (para la línea del tiempo)
alter publication supabase_realtime add table public.timeline_events;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 010_user_moderation.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ================================================================
-- 010_user_moderation.sql
-- Moderación de usuarios: warnings, ban, tipo_usuario
-- Ejecutar en: Supabase SQL Editor
-- ================================================================

-- Agregar columnas de moderación al perfil
alter table public.profiles
  add column if not exists is_banned        boolean     not null default false,
  add column if not exists warning_count    int         not null default 0,
  add column if not exists tipo_usuario     text        check (tipo_usuario in ('operador','empresa','otro')),
  add column if not exists banned_at        timestamptz;

-- Tabla de warnings
create table if not exists public.user_warnings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  admin_id    uuid        references public.profiles(id) on delete set null,
  tipo        text        not null default 'publicacion_falsa'
                          check (tipo in ('publicacion_falsa','spam','ofensivo','ban','otro')),
  motivo      text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists user_warnings_user_id_idx on public.user_warnings(user_id);
create index if not exists user_warnings_created_at_idx on public.user_warnings(created_at desc);

-- RLS: solo admin puede ver/crear warnings
alter table public.user_warnings enable row level security;

create policy "Admin manage warnings"
  on public.user_warnings for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Sincronizar tipo_usuario desde auth.users metadata al crear perfil
-- (el trigger existente on_auth_user_created ya crea el perfil,
--  aquí solo nos aseguramos de que el campo quede disponible)

-- Índice para buscar usuarios baneados fácilmente
create index if not exists profiles_is_banned_idx on public.profiles(is_banned) where is_banned = true;
create index if not exists profiles_tipo_usuario_idx on public.profiles(tipo_usuario);


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 011_empresa_polygon.sql
-- ────────────────────────────────────────────────────────────────────────────
-- 011_empresa_polygon.sql
alter table public.profiles
  add column if not exists empresa_polygon  jsonb,
  add column if not exists empresa_name     text,
  add column if not exists empresa_address  text;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 012_comunicados_sanctions.sql
-- ────────────────────────────────────────────────────────────────────────────
-- 012_comunicados_sanctions.sql

-- Comunicados con flujo de aprobación
create table if not exists public.comunicados (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  titulo      text not null,
  contenido   text not null,
  archivo_url text,
  status      text not null default 'pendiente'
              check (status in ('pendiente','aprobado','rechazado')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists comunicados_status_idx on public.comunicados(status, created_at desc);
create index if not exists comunicados_user_idx   on public.comunicados(user_id);

alter table public.comunicados enable row level security;

create policy "Ver comunicados aprobados"
  on public.comunicados for select
  using (status = 'aprobado' or auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderador')));

create policy "Crear comunicados"
  on public.comunicados for insert
  with check (auth.uid() = user_id);

-- Ban temporal
alter table public.profiles
  add column if not exists temp_ban_until timestamptz;

-- Anulación de votos
alter table public.vote_reactions
  add column if not exists is_annulled boolean not null default false,
  add column if not exists annulled_by uuid references public.profiles(id),
  add column if not exists annulled_at timestamptz;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 013_directorio_empresarial.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────
-- 013: Directorio Empresarial + Publicidad + Analytics
-- ─────────────────────────────────────────────────────────────────

-- ── Categorías del directorio ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS directorio_categorias (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nombre text NOT NULL,
  icono text,
  orden int DEFAULT 0
);

INSERT INTO directorio_categorias (slug, nombre, icono, orden) VALUES
  ('transportistas',       'Transportistas',        '🚛', 1),
  ('agencias-aduanales',   'Agencias Aduanales',    '🏛️', 2),
  ('terminales',           'Terminales',            '🏗️', 3),
  ('patios',               'Patios',                '📦', 4),
  ('forwarders',           'Forwarders',            '🌐', 5),
  ('navieras',             'Navieras',              '🚢', 6),
  ('almacenadoras',        'Almacenadoras',         '🏭', 7),
  ('llanteras',            'Llanteras',             '🔧', 8),
  ('gruas',                'Grúas',                 '🏗️', 9),
  ('montacargas',          'Montacargas',           '🏋️', 10),
  ('gasolineras',          'Gasolineras',           '⛽', 11),
  ('refacciones',          'Refacciones',           '🔩', 12),
  ('talleres',             'Talleres',              '🔨', 13),
  ('hoteles',              'Hoteles',               '🏨', 14),
  ('restaurantes',         'Restaurantes',          '🍽️', 15),
  ('seguridad',            'Seguridad',             '🛡️', 16),
  ('gps',                  'GPS y Rastreo',         '📡', 17),
  ('seguros',              'Seguros',               '📋', 18),
  ('consultoria',          'Consultoría',           '💼', 19),
  ('tecnologia',           'Tecnología',            '💻', 20),
  ('capacitacion',         'Capacitación',          '📚', 21),
  ('servicios-portuarios', 'Servicios Portuarios',  '⚓', 22)
ON CONFLICT (slug) DO NOTHING;

-- ── Perfiles empresariales ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresa_perfiles (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identidad
  nombre_comercial text NOT NULL,
  slug             text UNIQUE,
  descripcion      text,
  logo_url         text,
  portada_url      text,

  -- Categorización
  categoria_slug   text REFERENCES directorio_categorias(slug),
  categorias       text[],
  especialidades   text[],
  servicios        text[],
  certificaciones  text[],

  -- Contacto
  whatsapp   text,
  telefono   text,
  email      text,
  sitio_web  text,
  direccion  text,

  -- Redes sociales
  facebook_url  text,
  instagram_url text,
  linkedin_url  text,
  tiktok_url    text,

  -- Media
  fotos_urls  text[],
  videos_urls text[],

  -- Horarios { "lun": "8:00-18:00", ... }
  horarios jsonb,

  -- Ubicación
  ubicacion_lat  double precision,
  ubicacion_lng  double precision,
  empresa_polygon jsonb,

  -- Tier
  es_premium    boolean DEFAULT false,
  es_destacado  boolean DEFAULT false,
  es_verificado boolean DEFAULT false,
  is_active     boolean DEFAULT true,

  -- Counters (denormalizados para rendimiento)
  visitas_total    int DEFAULT 0,
  clics_whatsapp   int DEFAULT 0,
  clics_web        int DEFAULT 0,
  consultas_total  int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_categoria ON empresa_perfiles(categoria_slug);
CREATE INDEX IF NOT EXISTS idx_empresa_premium    ON empresa_perfiles(es_premium)  WHERE es_premium = true;
CREATE INDEX IF NOT EXISTS idx_empresa_active     ON empresa_perfiles(is_active)   WHERE is_active = true;

-- ── Campañas de publicidad ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicidad_campanas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresa_perfiles(id) ON DELETE SET NULL,

  titulo     text NOT NULL,
  imagen_url text,
  link_url   text,
  whatsapp   text,

  -- Zona de aparición
  zona text NOT NULL DEFAULT 'global',
  -- Valores: 'global','principal','directorio','noticias','vacantes','empresa'

  prioridad  int DEFAULT 0,

  -- Vigencia
  fecha_inicio date,
  fecha_fin    date,

  -- Estado
  is_active boolean DEFAULT true,

  -- Métricas (denormalizadas)
  impresiones bigint DEFAULT 0,
  clics       bigint DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campana_zona   ON publicidad_campanas(zona, is_active);
CREATE INDEX IF NOT EXISTS idx_campana_active ON publicidad_campanas(is_active) WHERE is_active = true;

-- ── Eventos de analytics (empresa) ───────────────────────────────
CREATE TABLE IF NOT EXISTS empresa_analytics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresa_perfiles(id) ON DELETE CASCADE,
  evento     text NOT NULL,
  -- 'visita','clic_whatsapp','clic_web','consulta','clic_vacante','clic_banner'
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_analytics_empresa ON empresa_analytics(empresa_id, created_at);

-- ── Eventos de publicidad ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicidad_eventos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid REFERENCES publicidad_campanas(id) ON DELETE CASCADE,
  tipo       text NOT NULL, -- 'impresion','clic'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_eventos_campana ON publicidad_eventos(campana_id, created_at);

-- ── Vacantes activas vinculadas a empresas ────────────────────────
-- (la tabla vacantes ya existe, solo agregamos empresa_perfil_id si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vacantes' AND column_name='empresa_perfil_id'
  ) THEN
    ALTER TABLE vacantes ADD COLUMN empresa_perfil_id uuid REFERENCES empresa_perfiles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ── Función updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE TRIGGER trg_empresa_perfiles_updated
  BEFORE UPDATE ON empresa_perfiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_publicidad_campanas_updated
  BEFORE UPDATE ON publicidad_campanas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE empresa_perfiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicidad_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_analytics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicidad_eventos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE directorio_categorias ENABLE ROW LEVEL SECURITY;

-- Categorías: lectura pública
CREATE POLICY "categorias_public_read" ON directorio_categorias FOR SELECT USING (true);

-- Empresa perfiles: lectura pública de activos
CREATE POLICY "empresa_perfiles_public_read" ON empresa_perfiles
  FOR SELECT USING (is_active = true);

-- Empresa perfiles: admin puede todo
CREATE POLICY "empresa_perfiles_admin_all" ON empresa_perfiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
  );

-- Empresa perfiles: dueño puede ver/editar el suyo
CREATE POLICY "empresa_perfiles_owner_edit" ON empresa_perfiles
  FOR ALL USING (user_id = auth.uid());

-- Publicidad: lectura pública de activas y vigentes
CREATE POLICY "publicidad_public_read" ON publicidad_campanas
  FOR SELECT USING (
    is_active = true
    AND (fecha_inicio IS NULL OR fecha_inicio <= current_date)
    AND (fecha_fin    IS NULL OR fecha_fin    >= current_date)
  );

-- Publicidad: admin puede todo
CREATE POLICY "publicidad_admin_all" ON publicidad_campanas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
  );

-- Analytics: solo insert público (no select)
CREATE POLICY "empresa_analytics_insert" ON empresa_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "empresa_analytics_admin"  ON empresa_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
);
CREATE POLICY "empresa_analytics_owner"  ON empresa_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM empresa_perfiles ep WHERE ep.id = empresa_id AND ep.user_id = auth.uid())
);

CREATE POLICY "publicidad_eventos_insert" ON publicidad_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "publicidad_eventos_admin"  ON publicidad_eventos FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
);


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 014_operator_marketplace.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Marketplace de operadores: amplía perfiles existentes sin perder compatibilidad.

ALTER TABLE public.posturas
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Operación de transporte',
  ADD COLUMN IF NOT EXISTS puesto TEXT,
  ADD COLUMN IF NOT EXISTS experiencia INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS especialidades TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo_carga TEXT,
  ADD COLUMN IF NOT EXISTS empresa_anterior TEXT,
  ADD COLUMN IF NOT EXISTS ultima_conexion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS medico_vigente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS viajes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recomendaciones INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 50;

CREATE INDEX IF NOT EXISTS posturas_marketplace_status_idx
  ON public.posturas (is_active, estatus, score DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS posturas_marketplace_license_idx
  ON public.posturas (tipo_licencia, tipo_maniobra, labora);

CREATE INDEX IF NOT EXISTS posturas_marketplace_area_idx
  ON public.posturas (area, is_active, score DESC);

CREATE INDEX IF NOT EXISTS posturas_marketplace_specialties_idx
  ON public.posturas USING GIN (especialidades);

CREATE INDEX IF NOT EXISTS posturas_marketplace_search_idx
  ON public.posturas USING GIN (
    to_tsvector('spanish',
      coalesce(nombre_completo, '') || ' ' ||
      coalesce(ciudad, '') || ' ' ||
      coalesce(descripcion, '') || ' ' ||
      coalesce(empresa_anterior, '')
    )
  );

CREATE TABLE IF NOT EXISTS public.operador_favoritos (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operador_id UUID NOT NULL REFERENCES public.posturas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, operador_id)
);

ALTER TABLE public.operador_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operador_favoritos_propios" ON public.operador_favoritos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.operador_recomendaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES public.posturas(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa TEXT,
  calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT,
  verificada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operador_recomendaciones_operador_idx
  ON public.operador_recomendaciones (operador_id, created_at DESC);

ALTER TABLE public.operador_recomendaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recomendaciones_publicas" ON public.operador_recomendaciones
  FOR SELECT USING (true);

CREATE POLICY "recomendaciones_autenticadas" ON public.operador_recomendaciones
  FOR INSERT WITH CHECK (auth.uid() = autor_id);


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 015_saas_foundations.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FARO PORTUARIO · Fase 1: fundamentos SaaS
-- Migración aditiva: conserva profiles, company_profiles, empresa_perfiles y subscriptions.
-- El nuevo modelo canónico puede convivir con los datos heredados durante la transición.

create extension if not exists pgcrypto;

-- ── Catálogos de cuenta ────────────────────────────────────────────────────
create table if not exists public.account_types (
  code text primary key,
  account_kind text not null check (account_kind in ('person', 'company')),
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.account_types (code, account_kind, name, sort_order) values
  ('candidate','person','Candidato',10), ('operator','person','Operador',20),
  ('traffic_executive','person','Ejecutivo de tráfico',30), ('documenter','person','Documentador',40),
  ('customs_reviewer','person','Glosador',50), ('sales_executive','person','Ejecutivo comercial',60),
  ('rigger','person','Maniobrista',70), ('mechanic','person','Mecánico',80),
  ('technician','person','Técnico',90), ('warehouse_staff','person','Personal de almacén',100),
  ('independent_professional','person','Profesional independiente',110), ('other_logistics_profile','person','Otro perfil logístico',120),
  ('carrier','company','Transportista',10), ('owner_operator','company','Hombre-camión',20),
  ('customs_broker','company','Agente aduanal',30), ('freight_forwarder','company','Freight forwarder',40),
  ('importer','company','Importador',50), ('exporter','company','Exportador',60),
  ('logistics_operator','company','Operador logístico',70), ('warehouse','company','Almacén',80),
  ('yard','company','Patio',90), ('rigging_company','company','Empresa de maniobras',100),
  ('shipping_line','company','Naviera',110), ('bonded_warehouse','company','Recinto fiscalizado',120),
  ('supplier','company','Proveedor',130), ('workshop','company','Taller',140),
  ('tire_shop','company','Llantera',150), ('crane_company','company','Empresa de grúas',160),
  ('gps_company','company','Empresa de GPS',170), ('security_company','company','Seguridad o custodia',180),
  ('insurer','company','Aseguradora',190), ('financial_company','company','Financiera',200),
  ('training_center','company','Centro de capacitación',210), ('trading_company','company','Comercializadora',220),
  ('other_logistics_provider','company','Otro proveedor logístico',230)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

alter table public.profiles
  add column if not exists account_kind text check (account_kind in ('person','company')),
  add column if not exists account_type text references public.account_types(code),
  add column if not exists onboarding_status text not null default 'account_pending'
    check (onboarding_status in ('account_pending','profile_pending','company_pending','plan_pending','complete')),
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- ── RBAC granular ───────────────────────────────────────────────────────────
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  scope text not null default 'platform' check (scope in ('platform','company')),
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

insert into public.roles (code, name, scope) values
  ('person_user','Usuario persona','platform'), ('professional_user','Usuario profesional','platform'),
  ('company_unverified','Empresa no verificada','platform'), ('company_verified','Empresa verificada','platform'),
  ('carrier_verified','Transportista verificado','platform'), ('superadmin','Superadministrador','platform'),
  ('general_admin','Administrador general','platform'), ('moderator','Moderador','platform'),
  ('company_validator','Validador de empresas','platform'), ('sales_executive','Ejecutivo de ventas','platform'),
  ('advertising_admin','Administrador de publicidad','platform'), ('finance_admin','Administrador financiero','platform'),
  ('content_editor','Editor de contenido','platform'), ('support','Soporte','platform')
on conflict (code) do update set name = excluded.name;

insert into public.permissions (code, description) values
  ('freight.create','Publicar cargas'), ('freight.view_private_data','Ver datos privados de fletes'),
  ('freight.submit_quote','Enviar cotizaciones'), ('freight.manage_quotes','Administrar cotizaciones recibidas'),
  ('company.manage_profile','Administrar perfil de empresa'), ('company.manage_team','Administrar equipo de empresa'),
  ('company.verify','Validar empresas'), ('job.create','Publicar vacantes'),
  ('marketplace.create','Publicar en marketplace'), ('ad.create','Crear campañas publicitarias'),
  ('ad.approve','Aprobar campañas'), ('subscription.manage','Administrar suscripciones'),
  ('moderation.manage','Moderar contenido'), ('admin.analytics','Consultar analítica administrativa'),
  ('admin.audit.read','Consultar auditoría'), ('content.manage','Administrar contenido')
  ,('admin.users.manage','Administrar usuarios'), ('admin.roles.manage','Administrar roles y permisos')
on conflict (code) do update set description = excluded.description;

-- El superadministrador recibe todos los permisos.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'superadmin'
on conflict do nothing;

-- Permisos administrativos acotados.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(case r.code
  when 'general_admin' then array['company.verify','ad.approve','subscription.manage','moderation.manage','admin.analytics','admin.audit.read','content.manage','admin.users.manage']
  when 'moderator' then array['moderation.manage']
  when 'company_validator' then array['company.verify']
  when 'advertising_admin' then array['ad.approve','admin.analytics']
  when 'finance_admin' then array['subscription.manage','admin.analytics']
  when 'content_editor' then array['content.manage']
  when 'support' then array['moderation.manage']
  else array[]::text[] end)
where r.code in ('general_admin','moderator','company_validator','advertising_admin','finance_admin','content_editor','support')
on conflict do nothing;

-- ── Empresa canónica y membresías ──────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  company_type text not null references public.account_types(code),
  status text not null default 'draft' check (status in ('draft','incomplete','pending_verification','corrections_required','verified','suspended','rejected','blocked')),
  trust_level smallint not null default 0 check (trust_level between 0 and 3),
  legal_name text not null,
  trade_name text not null,
  slug text unique,
  tax_id text,
  tax_regime text,
  fiscal_address text,
  founded_year smallint,
  responsible_name text,
  responsible_title text,
  business_email text,
  phone text,
  whatsapp text,
  website text,
  description text,
  services text[] not null default '{}',
  coverage text[] not null default '{}',
  ports_served text[] not null default '{}',
  states_served text[] not null default '{}',
  business_hours jsonb not null default '{}'::jsonb,
  badges text[] not null default '{}',
  submitted_at timestamptz,
  verified_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint companies_tax_id_format check (tax_id is null or tax_id ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$')
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('owner','admin','collaborator')),
  status text not null default 'active' check (status in ('invited','active','suspended','removed')),
  permissions text[] not null default '{}',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  expires_at date,
  uploaded_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint company_document_size check (size_bytes is null or size_bytes between 1 and 10485760),
  constraint company_document_mime check (mime_type is null or mime_type in ('application/pdf','image/jpeg','image/png','image/webp'))
);

create table if not exists public.company_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  status text not null default 'pending' check (status in ('pending','in_review','corrections_required','approved','rejected','revoked')),
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  checklist jsonb not null default '{}'::jsonb,
  internal_notes text,
  applicant_notes text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (company_id, level, status)
);

-- ── Planes y límites configurables ─────────────────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  audience text not null check (audience in ('person','carrier','company','provider')),
  description text,
  currency text not null default 'MXN',
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12,2) check (annual_price is null or annual_price >= 0),
  trial_days integer not null default 0 check (trial_days between 0 and 90),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_limits (
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_code text not null,
  limit_value integer,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  primary key (plan_id, feature_code),
  constraint plan_limit_value check (limit_value is null or limit_value >= 0)
);

insert into public.plans (code,name,audience,monthly_price,annual_price,sort_order,is_featured) values
  ('candidate_free','Candidato gratuito','person',0,0,10,false),
  ('professional','Profesional','person',99,990,20,true),
  ('carrier_essential','Transportista esencial','carrier',599,5990,30,false),
  ('carrier_pro','Transportista Pro','carrier',1499,14990,40,true),
  ('carrier_corporate','Transportista corporativo','carrier',3990,null,50,false),
  ('company_free','Empresa gratuita','company',0,0,10,false),
  ('company_essential','Empresa esencial','company',899,8990,20,false),
  ('company_pro','Empresa Pro','company',1999,19990,30,true),
  ('company_corporate','Empresa corporativa','company',4990,null,40,false),
  ('provider_local','Proveedor local','provider',399,3990,10,false),
  ('provider_featured','Proveedor destacado','provider',999,9990,20,true),
  ('provider_premium','Proveedor premium','provider',1999,null,30,false)
on conflict (code) do update set name=excluded.name, monthly_price=excluded.monthly_price, annual_price=excluded.annual_price;

insert into public.plan_limits (plan_id, feature_code, limit_value, is_enabled)
select p.id, x.feature_code, x.limit_value, true from public.plans p join (values
  ('candidate_free','active_jobs',0), ('professional','active_jobs',0),
  ('company_free','active_jobs',1), ('company_free','freight_posts',0), ('company_free','company_users',1), ('company_free','commercial_posts',1),
  ('carrier_essential','vehicles',3), ('carrier_essential','monthly_quotes',10), ('carrier_essential','active_jobs',1),
  ('carrier_pro','vehicles',20), ('carrier_pro','monthly_quotes',null), ('carrier_pro','active_jobs',5),
  ('carrier_corporate','vehicles',null), ('carrier_corporate','company_users',null),
  ('company_essential','monthly_freight_posts',10), ('company_essential','active_jobs',2),
  ('company_pro','monthly_freight_posts',null), ('company_pro','active_jobs',10), ('company_pro','company_users',null),
  ('provider_local','monthly_promotions',1), ('provider_featured','monthly_promotions',5), ('provider_featured','active_jobs',3),
  ('provider_premium','company_users',null), ('provider_premium','branches',null)
) as x(plan_code,feature_code,limit_value) on p.code=x.plan_code
on conflict (plan_id,feature_code) do update set limit_value=excluded.limit_value, is_enabled=excluded.is_enabled;

alter table public.subscriptions
  add column if not exists plan_id uuid references public.plans(id),
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists billing_period text check (billing_period in ('monthly','annual')),
  add column if not exists provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists grace_period_ends_at timestamptz;

-- ── Auditoría ───────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_companies_owner on public.companies(owner_user_id) where deleted_at is null;
create index if not exists idx_companies_type_status on public.companies(company_type,status) where deleted_at is null;
create index if not exists idx_company_members_user on public.company_members(user_id,status);
create index if not exists idx_company_documents_company on public.company_documents(company_id,status) where deleted_at is null;
create index if not exists idx_company_verifications_status on public.company_verifications(status,requested_at);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan_id,estatus);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type,entity_id,created_at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id,created_at desc);

-- ── Funciones de autorización ──────────────────────────────────────────────
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions p on p.id=rp.permission_id
    where ur.user_id=p_user_id and p.code=p_permission
      and (ur.expires_at is null or ur.expires_at>now())
  );
$$;

create or replace function public.get_user_permissions(p_user_id uuid)
returns table(code text) language sql stable security definer set search_path=public as $$
  select distinct p.code from public.user_roles ur
  join public.role_permissions rp on rp.role_id=ur.role_id
  join public.permissions p on p.id=rp.permission_id
  where ur.user_id=p_user_id and (ur.expires_at is null or ur.expires_at>now());
$$;

create or replace function public.company_member_has_permission(p_user_id uuid,p_company_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_permission(p_user_id,p_permission) or exists (
    select 1 from public.company_members cm where cm.user_id=p_user_id and cm.company_id=p_company_id
      and cm.status='active' and (cm.member_role in ('owner','admin') or p_permission=any(cm.permissions))
  );
$$;

create or replace function public.create_company_draft(p_owner_id uuid,p_company_type text,p_legal_name text,p_trade_name text)
returns public.companies language plpgsql security definer set search_path=public as $$
declare v_company public.companies;
begin
  if auth.uid() is not null and auth.uid()<>p_owner_id then raise exception 'No autorizado'; end if;
  if not exists(select 1 from public.account_types where code=p_company_type and account_kind='company' and is_active) then raise exception 'Tipo de empresa inválido'; end if;
  insert into public.companies(owner_user_id,company_type,legal_name,trade_name,status)
  values(p_owner_id,p_company_type,p_legal_name,p_trade_name,'draft') returning * into v_company;
  insert into public.company_members(company_id,user_id,member_role,status,joined_at) values(v_company.id,p_owner_id,'owner','active',now());
  update public.profiles set account_kind='company',account_type=p_company_type,onboarding_status='company_pending',updated_at=now() where id=p_owner_id;
  return v_company;
end; $$;

create or replace function public.get_company_entitlements(p_company_id uuid)
returns table(feature_code text,limit_value integer,is_enabled boolean) language sql stable security definer set search_path=public as $$
  select pl.feature_code,pl.limit_value,pl.is_enabled from public.subscriptions s
  join public.plan_limits pl on pl.plan_id=s.plan_id
  where s.company_id=p_company_id and s.estatus='activa' and (s.expires_at is null or s.expires_at>now())
  order by pl.feature_code;
$$;

-- Mantiene compatibilidad con el trigger histórico y asigna el rol canónico.
create or replace function public.handle_new_user() returns trigger as $$
declare
  v_kind text := nullif(new.raw_user_meta_data->>'account_kind','');
  v_type text := nullif(new.raw_user_meta_data->>'account_type','');
  v_role text;
begin
  if v_kind not in ('person','company') then v_kind := 'person'; end if;
  if not exists(select 1 from public.account_types where code=v_type and account_kind=v_kind) then
    v_type := case when v_kind='company' then 'other_logistics_provider' else 'candidate' end;
  end if;
  insert into public.profiles(id,full_name,phone,role,tipo_usuario,account_kind,account_type,onboarding_status,phone_verified_at)
  values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'phone',case when v_kind='company' then 'company' else 'operator_free' end,case when v_kind='company' then 'empresa' else 'operador' end,v_kind,v_type,case when v_kind='company' then 'company_pending' else 'profile_pending' end,case when new.raw_user_meta_data ? 'phone' then now() else null end)
  on conflict(id) do update set account_kind=excluded.account_kind,account_type=excluded.account_type;
  v_role := case when v_kind='company' then 'company_unverified' else 'person_user' end;
  insert into public.user_roles(user_id,role_id) select new.id,id from public.roles where code=v_role on conflict do nothing;
  return new;
end; $$ language plpgsql security definer set search_path=public;

-- Roles iniciales para cuentas existentes sin borrar su rol heredado.
insert into public.user_roles(user_id,role_id)
select p.id,r.id from public.profiles p join public.roles r on r.code=case
  when p.role='admin' then 'superadmin'
  when p.role='moderador' then 'moderator'
  when p.role='company' then 'company_unverified'
  else 'person_user' end
on conflict do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.account_types enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_documents enable row level security;
alter table public.company_verifications enable row level security;
alter table public.plans enable row level security;
alter table public.plan_limits enable row level security;
alter table public.audit_logs enable row level security;

create policy "account_types_public_read" on public.account_types for select using (is_active);
create policy "plans_public_read" on public.plans for select using (is_active);
create policy "plan_limits_authenticated_read" on public.plan_limits for select to authenticated using (true);
create policy "roles_own_read" on public.user_roles for select using (user_id=auth.uid());
create policy "companies_member_read" on public.companies for select using (exists(select 1 from public.company_members cm where cm.company_id=id and cm.user_id=auth.uid() and cm.status='active'));
create policy "companies_public_verified" on public.companies for select using (status='verified' and deleted_at is null);
create policy "companies_member_update" on public.companies for update using (public.company_member_has_permission(auth.uid(),id,'company.manage_profile'));
create policy "company_members_own_read" on public.company_members for select using (user_id=auth.uid() or public.company_member_has_permission(auth.uid(),company_id,'company.manage_team'));
create policy "company_documents_member" on public.company_documents for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') or public.has_permission(auth.uid(),'company.verify'));
create policy "company_documents_member_insert" on public.company_documents for insert with check (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') and uploaded_by=auth.uid());
create policy "company_verifications_member_read" on public.company_verifications for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') or public.has_permission(auth.uid(),'company.verify'));
create policy "audit_authorized_read" on public.audit_logs for select using (public.has_permission(auth.uid(),'admin.audit.read'));

revoke all on function public.has_permission(uuid,text) from public;
grant execute on function public.has_permission(uuid,text) to authenticated,service_role;
revoke all on function public.get_user_permissions(uuid) from public;
grant execute on function public.get_user_permissions(uuid) to authenticated,service_role;
revoke all on function public.company_member_has_permission(uuid,uuid,text) from public;
grant execute on function public.company_member_has_permission(uuid,uuid,text) to authenticated,service_role;
revoke all on function public.create_company_draft(uuid,text,text,text) from public;
grant execute on function public.create_company_draft(uuid,text,text,text) to authenticated,service_role;
revoke all on function public.get_company_entitlements(uuid) from public;
grant execute on function public.get_company_entitlements(uuid) to authenticated,service_role;

comment on table public.companies is 'Modelo empresarial canónico de Faro Portuario. Los modelos heredados se migrarán gradualmente.';
comment on table public.company_documents is 'Solo contiene rutas privadas; los archivos deben almacenarse en un bucket privado y servirse con URL firmada.';

-- Bucket privado para expedientes empresariales. Nunca usar URLs públicas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('company-documents','company-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 016_public_experience.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Fase 2 · experiencia pública y métricas publicitarias atómicas

alter table public.publicidad_campanas
  add column if not exists is_demo boolean not null default false,
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft','pending','approved','rejected','paused'));

-- Conserva campañas activas heredadas, pero exige aprobación para nuevas activaciones.
update public.publicidad_campanas set review_status='approved' where is_active=true and review_status='draft';

create or replace function public.increment_ad_metric(p_campaign_id uuid,p_metric text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_metric='impression' then
    update public.publicidad_campanas set impresiones=coalesce(impresiones,0)+1 where id=p_campaign_id;
  elsif p_metric='click' then
    update public.publicidad_campanas set clics=coalesce(clics,0)+1 where id=p_campaign_id;
  else
    raise exception 'Métrica inválida';
  end if;
end; $$;

revoke all on function public.increment_ad_metric(uuid,text) from public;
grant execute on function public.increment_ad_metric(uuid,text) to service_role;

create index if not exists idx_publicidad_public_active
  on public.publicidad_campanas(zona,prioridad desc,fecha_inicio,fecha_fin)
  where is_active=true and review_status='approved' and is_demo=false;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 017_advertising_commercial_flow.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Fase 2 · planes publicitarios administrables y solicitudes comerciales

create table if not exists public.advertising_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  features text[] not null default '{}',
  monthly_price numeric(12,2),
  currency text not null default 'MXN',
  requires_quote boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advertising_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.advertising_plans(id),
  requested_by uuid not null references auth.users(id),
  contact_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','proposal_sent','won','lost','closed')),
  assigned_to uuid references auth.users(id),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.advertising_plans(code,name,description,features,monthly_price,requires_quote,sort_order) values
  ('basic_presence','Presencia Básica','Visibilidad inicial dentro del directorio.',array['Perfil destacado','Logo en directorio','Enlace de contacto','Estadísticas básicas','Vigencia mensual'],null,true,10),
  ('featured_company','Empresa Destacada','Mayor presencia en resultados y espacios editoriales.',array['Carrusel de portada','Prioridad en resultados','Botón de cotización','Estadísticas','Publicación destacada'],null,true,20),
  ('sponsor','Patrocinador','Campaña con presencia preferente en distintas secciones.',array['Banner premium','Presencia multisección','Campaña destacada','Reporte de métricas','Acompañamiento comercial'],null,true,30),
  ('custom_campaign','Campaña Personalizada','Estrategia y duración definidas según objetivos.',array['Creatividad personalizada','Contenido patrocinado','Segmentación','Duración flexible','Canales sujetos a disponibilidad'],null,true,40)
on conflict(code) do update set name=excluded.name,description=excluded.description,features=excluded.features,sort_order=excluded.sort_order;

create index if not exists idx_advertising_leads_company on public.advertising_leads(company_id,status,created_at desc) where deleted_at is null;
create index if not exists idx_advertising_leads_status on public.advertising_leads(status,created_at desc) where deleted_at is null;

alter table public.advertising_plans enable row level security;
alter table public.advertising_leads enable row level security;
create policy "advertising_plans_public_read" on public.advertising_plans for select using (is_active);
create policy "advertising_leads_company_read" on public.advertising_leads for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile'));
create policy "advertising_leads_admin_read" on public.advertising_leads for select using (public.has_permission(auth.uid(),'ad.approve'));

comment on table public.advertising_plans is 'Precios y características editables. NULL indica cotización comercial.';


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 018_operational_control_centers.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FARO PORTUARIO · Centros de rutas, seguridad, aduanas y torre de control
-- Las fuentes externas permanecen desactivadas hasta contar con credenciales y autorización.

create extension if not exists pgcrypto;

insert into public.permissions (code, description) values
  ('operations.view','Consultar torre de control y operaciones'),
  ('route.plan','Crear y evaluar planes de ruta'),
  ('route.override','Autorizar excepciones de ruta'),
  ('customs.manage','Administrar operaciones aduanales'),
  ('integrations.manage','Administrar proveedores operativos')
on conflict (code) do update set description=excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code='superadmin' and p.code in ('operations.view','route.plan','route.override','customs.manage','integrations.manage')
on conflict do nothing;

create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  provider_type text not null check (provider_type in ('routing','traffic','incident','gps','weather','customs','port','terminal','customs_broker')),
  code text not null, name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  status text not null default 'disabled' check (status in ('disabled','configured','healthy','degraded','unavailable')),
  configuration jsonb not null default '{}'::jsonb, last_success_at timestamptz, last_error_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,code)
);

create table if not exists public.integration_logs (
  id bigint generated always as identity primary key, company_id uuid not null references public.companies(id) on delete cascade,
  provider_id uuid references public.integration_providers(id) on delete set null, operation text not null,
  status text not null check (status in ('success','retry','failed','fallback')), duration_ms integer,
  request_id text, error_code text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Secrets never live in this table. secret_reference points to the platform secret manager.
create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  provider_id uuid not null references public.integration_providers(id) on delete cascade, secret_reference text not null,
  credential_type text not null, status text not null default 'pending' check (status in ('pending','active','expired','revoked')),
  expires_at timestamptz, last_rotated_at timestamptz, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), unique(provider_id,credential_type)
);

create table if not exists public.authorized_stops (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, stop_type text not null, address text, latitude numeric(10,7), longitude numeric(10,7), radius_m integer not null default 250,
  schedule jsonb not null default '{}'::jsonb, accepts_truck boolean not null default true, accepts_full boolean not null default false,
  overnight boolean not null default false, security_level text not null default 'pending' check (security_level in ('validated','recommended','aid_only','emergency','pending')),
  amenities text[] not null default '{}', max_minutes integer, requires_authorization boolean not null default false,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), validated_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.route_legal_rules (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  road_class text not null check (road_class in ('ET','A','B','C','D','STATE','MUNICIPAL','PORT','CUSTOMS','PRIVATE')),
  allowed_configurations text[] not null default '{}', max_gross_weight_kg numeric(12,2), max_length_m numeric(8,2), max_width_m numeric(8,2), max_height_m numeric(8,2),
  requires_sict_permit boolean not null default false, requires_full_authorization boolean not null default false,
  requires_connectivity boolean not null default false, hazardous_allowed boolean, valid_hours jsonb not null default '{}'::jsonb,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  effective_from date, effective_until date, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.route_risk_segments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  road_name text not null, start_km numeric(9,3), end_km numeric(9,3), direction text, schedule jsonb not null default '{}'::jsonb,
  risk_type text not null, risk_level text not null check (risk_level in ('critical','high','medium','low','reinforced_monitoring','insufficient_information')),
  cargo_types text[] not null default '{}', recommendation text, protocol text, requires_convoy boolean not null default false,
  intensive_monitoring boolean not null default false, no_stop boolean not null default false, daylight_only boolean not null default false,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), reviewed_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.road_incidents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  incident_type text not null, severity text not null check (severity in ('info','preventive','high','critical')),
  road_name text, segment text, kilometer numeric(9,3), direction text, latitude numeric(10,7), longitude numeric(10,7),
  starts_at timestamptz not null, estimated_end_at timestamptz, resolved_at timestamptz, description text not null, evidence_path text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','corroborated','confirmed','dismissed')),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);

create table if not exists public.route_plans (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, origin text not null, destination text not null, waypoints jsonb not null default '[]'::jsonb,
  departure_at timestamptz, vehicle_type text not null, vehicle_configuration text not null, axle_count smallint,
  trailer_count smallint not null default 0, vehicle_weight_kg numeric(12,2), cargo_weight_kg numeric(12,2), gross_weight_kg numeric(12,2),
  total_length_m numeric(8,2), width_m numeric(8,2), height_m numeric(8,2), cargo_type text,
  hazardous_material boolean not null default false, oversized boolean not null default false,
  sict_permit_expires_at date, full_authorization_expires_at date, connectivity_authorization_expires_at date,
  plates jsonb not null default '{}'::jsonb, status text not null default 'draft' check (status in ('draft','evaluating','blocked','conditional','approved','in_progress','completed','cancelled')),
  compliance_result text, risk_level text, blocking_reasons jsonb not null default '[]'::jsonb,
  evaluation_snapshot jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id), approved_by uuid references auth.users(id),
  approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.route_segments (
  id uuid primary key default gen_random_uuid(), route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  sequence_no integer not null, road_name text not null, road_class text not null, start_km numeric(9,3), end_km numeric(9,3), direction text,
  distance_km numeric(10,2), duration_minutes integer, traffic_level text check (traffic_level in ('normal','slow','congested','blocked','unavailable')),
  compliance_status text not null default 'insufficient_information' check (compliance_status in ('authorized','authorized_with_conditions','requires_permit','requires_connectivity','restricted','not_authorized','insufficient_information')),
  compliance_reasons jsonb not null default '[]'::jsonb, risk_level text, source_name text, source_class text check (source_class in ('official','third_party','internal','manual')),
  source_updated_at timestamptz, unique(route_plan_id,sequence_no)
);

create table if not exists public.route_overrides (
  id uuid primary key default gen_random_uuid(), route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  reason text not null, evidence_path text, approved_by uuid not null references auth.users(id), valid_until timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gps_positions (
  id bigint generated always as identity primary key, company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete cascade, asset_reference text not null,
  latitude numeric(10,7) not null, longitude numeric(10,7) not null, speed_kph numeric(7,2), heading smallint,
  accuracy_m numeric(8,2), recorded_at timestamptz not null, received_at timestamptz not null default now(),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100)
);

create table if not exists public.route_deviations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid not null references public.route_plans(id) on delete cascade, deviation_type text not null,
  distance_m numeric(10,2), detected_at timestamptz not null, resolved_at timestamptz, status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  details jsonb not null default '{}'::jsonb, source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100)
);

create table if not exists public.driver_hours (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete set null, driver_reference text not null,
  period_start timestamptz not null, period_end timestamptz not null, driving_minutes integer not null default 0,
  rest_minutes integer not null default 0, status text not null default 'unverified' check (status in ('compliant','warning','exceeded','unverified')),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), created_at timestamptz not null default now()
);

create table if not exists public.customs_operations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  reference text not null, operation_type text not null check (operation_type in ('import','export','interior','border','airport')),
  customs_name text, port_name text, terminal_name text, bonded_warehouse text, broker_name text,
  container_number text, booking text, customs_entry text, status_code text not null default 'documentation_pending',
  status_label text not null default 'Documentación pendiente', status_source text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), next_action text, estimated_at timestamptz,
  free_days_until date, responsible_name text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,reference)
);

create table if not exists public.customs_events (
  id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.customs_operations(id) on delete cascade,
  status_code text not null, status_label text not null, responsible_name text, source_name text not null,
  source_class text not null check (source_class in ('official','third_party','internal','manual')), confidence smallint not null default 0 check (confidence between 0 and 100),
  evidence_path text, comment text, occurred_at timestamptz not null default now(), created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.port_appointments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  customs_operation_id uuid references public.customs_operations(id) on delete set null, port_name text not null, terminal_name text,
  operation_type text not null, container_number text, booking text, customs_entry text, carrier_name text, vehicle_plate text, driver_name text,
  requested_at timestamptz, confirmed_at timestamptz, window_start timestamptz, window_end timestamptz,
  status text not null default 'requested' check (status in ('requested','confirmed','in_queue','entered','completed','rejected','expired','cancelled')),
  queue_minutes integer, accessed_at timestamptz, exited_at timestamptz, rejection_reason text, evidence_path text,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete cascade, customs_operation_id uuid references public.customs_operations(id) on delete cascade,
  alert_type text not null, severity text not null check (severity in ('info','preventive','high','critical')),
  title text not null, message text not null, source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  recommended_action text, created_at timestamptz not null default now(), acknowledged_by uuid references auth.users(id), resolved_at timestamptz
);

create index if not exists idx_route_plans_company_status on public.route_plans(company_id,status,updated_at desc);
create index if not exists idx_route_segments_plan on public.route_segments(route_plan_id,sequence_no);
create index if not exists idx_customs_operations_company_status on public.customs_operations(company_id,status_code,updated_at desc);
create index if not exists idx_customs_events_operation on public.customs_events(operation_id,occurred_at desc);
create index if not exists idx_port_appointments_company_window on public.port_appointments(company_id,window_start,status);
create index if not exists idx_operational_alerts_company on public.operational_alerts(company_id,status,severity,created_at desc);
create index if not exists idx_incidents_company_active on public.road_incidents(company_id,resolved_at,severity);
create index if not exists idx_gps_positions_route_time on public.gps_positions(route_plan_id,recorded_at desc);
create index if not exists idx_route_deviations_company_status on public.route_deviations(company_id,status,detected_at desc);
create index if not exists idx_driver_hours_company_driver on public.driver_hours(company_id,driver_reference,period_start desc);

alter table public.integration_providers enable row level security;
alter table public.integration_logs enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.authorized_stops enable row level security;
alter table public.route_legal_rules enable row level security;
alter table public.route_risk_segments enable row level security;
alter table public.road_incidents enable row level security;
alter table public.route_plans enable row level security;
alter table public.route_segments enable row level security;
alter table public.route_overrides enable row level security;
alter table public.gps_positions enable row level security;
alter table public.route_deviations enable row level security;
alter table public.driver_hours enable row level security;
alter table public.customs_operations enable row level security;
alter table public.customs_events enable row level security;
alter table public.port_appointments enable row level security;
alter table public.operational_alerts enable row level security;

create or replace function public.is_active_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.company_members cm where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active');
$$;

do $$ declare t text; begin
  foreach t in array array['integration_providers','integration_logs','integration_credentials','authorized_stops','route_legal_rules','route_risk_segments','road_incidents','route_plans','gps_positions','route_deviations','driver_hours','customs_operations','port_appointments','operational_alerts']
  loop execute format('drop policy if exists tenant_member_access on public.%I',t);
       execute format('create policy tenant_member_access on public.%I for all using (public.is_active_company_member(company_id)) with check (public.is_active_company_member(company_id))',t);
  end loop;
end $$;

drop policy if exists route_segments_tenant_access on public.route_segments;
create policy route_segments_tenant_access on public.route_segments for all using (
  exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id))
) with check (exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id)));

drop policy if exists route_overrides_tenant_access on public.route_overrides;
create policy route_overrides_tenant_access on public.route_overrides for all using (
  exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id))
) with check (exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id)));

drop policy if exists customs_events_tenant_access on public.customs_events;
create policy customs_events_tenant_access on public.customs_events for all using (
  exists(select 1 from public.customs_operations co where co.id=operation_id and public.is_active_company_member(co.company_id))
) with check (exists(select 1 from public.customs_operations co where co.id=operation_id and public.is_active_company_member(co.company_id)));

grant execute on function public.is_active_company_member(uuid) to authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 019_freight_marketplace.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FARO PORTUARIO · Bolsa de fletes y membresía mensual
insert into public.plans (code,name,audience,description,currency,monthly_price,annual_price,trial_days,is_active,is_featured,sort_order)
values ('freight_membership','Membresía Publicador de Fletes','company','Publicación y administración de cargas dentro de Faro Portuario.','MXN',500,null,0,true,true,25)
on conflict (code) do update set name=excluded.name,description=excluded.description,monthly_price=500,annual_price=null,is_active=true;

insert into public.plan_limits(plan_id,feature_code,limit_value,is_enabled)
select id,'monthly_freight_posts',null,true from public.plans where code='freight_membership'
on conflict(plan_id,feature_code) do update set limit_value=null,is_enabled=true;

alter table public.companies
  add column if not exists legal_entity_type text check(legal_entity_type in ('individual_business','legal_entity'));

create table if not exists public.freight_posts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id), title text not null,
  origin_city text not null, origin_state text not null, origin_postal_code text,
  destination_city text not null, destination_state text not null, destination_postal_code text,
  pickup_date date not null, pickup_window_start time, pickup_window_end time, delivery_date date,
  cargo_type text not null check (cargo_type in ('container','general','refrigerated','hazardous','bulk','oversized','vehicles','other')),
  cargo_description text not null, weight_kg numeric(12,2), volume_m3 numeric(10,2), package_count integer,
  equipment_type text not null, container_type text, container_number text,
  hazardous boolean not null default false, un_number text, target_temperature_c numeric(6,2),
  offered_price numeric(12,2), currency text not null default 'MXN', price_includes_vat boolean not null default false,
  payment_terms text, loading_included boolean not null default false, unloading_included boolean not null default false,
  special_requirements text, visibility text not null default 'public' check (visibility in ('public','members_only')),
  service_contact_name text not null, service_contact_phone text not null, service_contact_whatsapp text,
  contact_preference text not null default 'platform' check (contact_preference in ('platform','phone','whatsapp','email')),
  status text not null default 'draft' check (status in ('draft','published','paused','assigned','completed','cancelled','expired')),
  published_at timestamptz, expires_at timestamptz not null default (now()+interval '30 days'),
  assigned_company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint freight_weight_positive check (weight_kg is null or weight_kg>0),
  constraint freight_volume_positive check (volume_m3 is null or volume_m3>0),
  constraint freight_price_positive check (offered_price is null or offered_price>=0),
  constraint freight_hazardous_un check (not hazardous or nullif(trim(un_number),'') is not null)
);

create table if not exists public.freight_interest_requests (
  id uuid primary key default gen_random_uuid(), freight_id uuid not null references public.freight_posts(id) on delete cascade,
  requester_company_id uuid not null references public.companies(id) on delete cascade, requested_by uuid not null references auth.users(id),
  message text, status text not null default 'sent' check(status in ('sent','viewed','accepted','rejected','cancelled')),
  contact_revealed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(freight_id,requester_company_id)
);

create table if not exists public.freight_status_history (
  id bigint generated always as identity primary key, freight_id uuid not null references public.freight_posts(id) on delete cascade,
  previous_status text, new_status text not null, changed_by uuid not null references auth.users(id), reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  provider text not null, provider_event_id text not null, event_type text not null,
  status text not null default 'processing' check(status in ('processing','processed','failed')),
  error_message text, received_at timestamptz not null default now(), processed_at timestamptz,
  primary key(provider,provider_event_id)
);

create index if not exists idx_freight_posts_public on public.freight_posts(status,pickup_date,created_at desc);
create index if not exists idx_freight_posts_company on public.freight_posts(company_id,status,updated_at desc);
create index if not exists idx_freight_route on public.freight_posts(origin_state,destination_state,pickup_date);
create index if not exists idx_freight_history on public.freight_status_history(freight_id,created_at desc);
create index if not exists idx_freight_interest_owner on public.freight_interest_requests(freight_id,status,created_at desc);

alter table public.freight_posts enable row level security;
alter table public.freight_status_history enable row level security;
alter table public.freight_interest_requests enable row level security;
alter table public.payment_events enable row level security;

-- No se concede lectura anónima sobre la tabla: contiene teléfonos privados.
-- El catálogo público se entrega desde /api/freights con una selección sanitizada.
drop policy if exists freight_public_read on public.freight_posts;
drop policy if exists freight_company_read on public.freight_posts;
create policy freight_company_read on public.freight_posts for select using (public.is_active_company_member(company_id));
drop policy if exists freight_member_write on public.freight_posts;
create policy freight_member_write on public.freight_posts for all using (public.is_active_company_member(company_id)) with check (public.is_active_company_member(company_id));
drop policy if exists freight_history_member_read on public.freight_status_history;
create policy freight_history_member_read on public.freight_status_history for select using (exists(select 1 from public.freight_posts f where f.id=freight_id and public.is_active_company_member(f.company_id)));
drop policy if exists freight_interest_parties on public.freight_interest_requests;
create policy freight_interest_parties on public.freight_interest_requests for select using (
  public.is_active_company_member(requester_company_id) or exists(select 1 from public.freight_posts f where f.id=freight_id and public.is_active_company_member(f.company_id))
);

comment on table public.payment_events is 'Idempotencia de webhooks; acceso exclusivo mediante service role.';


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 020_phone_password_auth.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Preferencias de contacto para cuentas con teléfono verificado.
alter table public.profiles
  add column if not exists sms_notifications_enabled boolean not null default false,
  add column if not exists sms_consent_at timestamptz;

create index if not exists idx_profiles_verified_phone
  on public.profiles(phone)
  where phone is not null and phone_verified_at is not null;

comment on column public.profiles.sms_notifications_enabled is
  'Consentimiento para alertas operativas por SMS/WhatsApp; no habilita publicidad automática.';


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 021_resource_library.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Registro mínimo de descargas gratuitas de la biblioteca Faro Portuario.
-- Los archivos viven en el servidor y siempre se entregan después de validar la sesión.

create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null check (char_length(resource_id) between 3 and 100),
  file_format text not null check (file_format in ('XLSX', 'DOCX', 'PDF')),
  downloaded_at timestamptz not null default now()
);

create index if not exists resource_downloads_user_date_idx
  on public.resource_downloads (user_id, downloaded_at desc);

create index if not exists resource_downloads_resource_date_idx
  on public.resource_downloads (resource_id, downloaded_at desc);

alter table public.resource_downloads enable row level security;

drop policy if exists "Users read own resource downloads" on public.resource_downloads;
create policy "Users read own resource downloads"
  on public.resource_downloads
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Las inserciones se hacen desde el backend con service_role después de validar el token.
revoke insert, update, delete on public.resource_downloads from anon, authenticated;
grant select on public.resource_downloads to authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 022_news_agent.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Faro Portuario · agente editorial de noticias
-- Conserva únicamente metadatos, un resumen editorial propio y la trazabilidad
-- de la fuente. El contenido completo permanece en el medio de origen.

-- Limpieza idempotente del nombre legado: las publicaciones válidas se
-- renombran y cualquier variante residual se desactiva para evitar que vuelva
-- a mostrarse en el portal.
update public.news_items
set content = replace(replace(replace(replace(content,
  'ConnectManzanillo', 'Faro Portuario'),
  'ConectManzanillo', 'Faro Portuario'),
  'Connect Manzanillo', 'Faro Portuario'),
  'Conect Manzanillo', 'Faro Portuario')
where content ilike '%connectmanzanillo%'
   or content ilike '%conectmanzanillo%'
   or content ilike '%connect manzanillo%'
   or content ilike '%conect manzanillo%';

update public.news_items
set is_active = false
where lower(content) like '%connect manzanillo%'
   or lower(content) like '%conect manzanillo%'
   or lower(content) like '%connectmanzanillo%'
   or lower(content) like '%conectmanzanillo%';

-- La policy heredada permitía escrituras demasiado amplias. service_role omite
-- RLS; los usuarios autenticados solo escriben si su perfil es administrador.
drop policy if exists "service_write_news" on public.news_items;
drop policy if exists "public_read_news" on public.news_items;
drop policy if exists "public_read_active_news" on public.news_items;
create policy "public_read_active_news" on public.news_items
  for select using (is_active = true and (expires_at is null or expires_at > now()));
drop policy if exists "admin_write_news_items" on public.news_items;
create policy "admin_write_news_items" on public.news_items
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

create table if not exists public.port_news_sources (
  id                text primary key,
  name              text not null,
  homepage_url      text not null,
  feed_url          text,
  provider_type     text not null default 'rss' check (provider_type in ('rss', 'api')),
  is_enabled        boolean not null default true,
  is_trusted        boolean not null default false,
  allows_image      boolean not null default false,
  auto_publish      boolean not null default false,
  last_checked_at   timestamptz,
  last_success_at   timestamptz,
  last_error        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.port_news (
  id                  uuid primary key default uuid_generate_v4(),
  source_id           text not null references public.port_news_sources(id),
  source_name         text not null,
  source_url          text not null,
  canonical_url       text not null,
  external_id         text,
  fingerprint         text not null unique,
  title               text not null check (char_length(title) between 8 and 300),
  editorial_summary   text not null check (char_length(editorial_summary) between 30 and 500),
  category            text not null default 'sector' check (category in (
                        'accesos', 'puerto', 'aduana', 'transporte', 'comercio_exterior',
                        'clima', 'normatividad', 'empleo', 'sector'
                      )),
  relevance_score     smallint not null default 0 check (relevance_score between 0 and 100),
  relevance_reasons   jsonb not null default '[]'::jsonb,
  status              text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  is_active            boolean not null default true,
  image_url           text,
  image_rights_note   text,
  published_at_source timestamptz,
  published_at_portal timestamptz,
  expires_at           timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid references public.profiles(id),
  rejection_reason    text,
  ingested_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists port_news_public_feed_idx
  on public.port_news(status, is_active, published_at_portal desc, relevance_score desc);
create index if not exists port_news_source_date_idx
  on public.port_news(source_id, published_at_source desc);
create index if not exists port_news_category_idx
  on public.port_news(category, status);

alter table public.port_news_sources enable row level security;
alter table public.port_news enable row level security;

drop policy if exists "public_read_enabled_news_sources" on public.port_news_sources;
create policy "public_read_enabled_news_sources" on public.port_news_sources
  for select using (is_enabled = true);

drop policy if exists "public_read_published_port_news" on public.port_news;
create policy "public_read_published_port_news" on public.port_news
  for select using (
    status = 'published'
    and is_active = true
    and (expires_at is null or expires_at > now())
  );

-- Las escrituras se realizan exclusivamente desde el servidor con service_role.

comment on table public.port_news is
  'Metadatos y resúmenes propios de noticias; nunca almacena el artículo completo.';
comment on column public.port_news.image_rights_note is
  'Base de uso de la imagen. NULL implica que la imagen no debe mostrarse.';


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 023_document_verification_ai.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Expediente documental asistido, confirmable y privado para Faro Portuario.
alter table public.company_documents
  add column if not exists extraction_status text not null default 'uploaded'
    check (extraction_status in ('awaiting_upload','uploaded','processing','suggestions_ready','confirmed','provider_disabled','skipped_by_user','failed')),
  add column if not exists extraction_provider text,
  add column if not exists extracted_fields jsonb not null default '{"fields":[],"warnings":[]}'::jsonb,
  add column if not exists extraction_error text,
  add column if not exists extraction_started_at timestamptz,
  add column if not exists extraction_completed_at timestamptz,
  add column if not exists ai_processing_consent_at timestamptz,
  add column if not exists extraction_confirmed_at timestamptz,
  add column if not exists extraction_confirmed_by uuid references auth.users(id);

alter table public.empresa_perfiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create unique index if not exists idx_empresa_perfiles_company_unique
  on public.empresa_perfiles(company_id);

create table if not exists public.verification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient text not null,
  template text not null check (template in ('submitted','approved','corrections_required')),
  provider text not null,
  delivery_status text not null check (delivery_status in ('sent','provider_disabled','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_documents_extraction
  on public.company_documents(company_id, extraction_status) where deleted_at is null;

alter table public.verification_email_deliveries enable row level security;

comment on column public.company_documents.extracted_fields is
  'Sugerencias de extracción; nunca se aplican al perfil hasta confirmación explícita del usuario.';
comment on table public.verification_email_deliveries is
  'Bitácora sin contenido documental del correo transaccional de verificación.';

update storage.buckets
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=array['application/pdf','image/jpeg','image/png']
where id='company-documents';

create or replace function public.confirm_company_document_extraction(
  p_document_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_updates jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_now timestamptz := now();
begin
  update public.companies set
    legal_name=coalesce(nullif(p_updates->>'legal_name',''),legal_name),
    trade_name=coalesce(nullif(p_updates->>'trade_name',''),trade_name),
    tax_id=coalesce(nullif(upper(p_updates->>'tax_id'),''),tax_id),
    tax_regime=coalesce(nullif(p_updates->>'tax_regime',''),tax_regime),
    fiscal_address=coalesce(nullif(p_updates->>'fiscal_address',''),fiscal_address),
    responsible_name=coalesce(nullif(p_updates->>'responsible_name',''),responsible_name),
    updated_at=v_now
  where id=p_company_id;
  if not found then raise exception 'Empresa no encontrada'; end if;

  update public.company_documents set
    extraction_status='confirmed',
    extraction_confirmed_at=v_now,
    extraction_confirmed_by=p_user_id
  where id=p_document_id and company_id=p_company_id and deleted_at is null and extraction_status='suggestions_ready';
  if not found then raise exception 'Documento sin sugerencias pendientes'; end if;

  return jsonb_build_object('confirmed_at',v_now);
end;
$$;

revoke all on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) to service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 024_community_feed.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FARO PORTUARIO · Comunidad profesional moderada
-- Las fotografías permanecen en un bucket privado. El backend entrega URLs
-- temporales únicamente para contenido aprobado o para el autor/moderador.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null constraint community_posts_author_id_fkey references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  moderation_provider text,
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  storage_path text not null unique,
  alt_text text check (char_length(alt_text) <= 180),
  sort_order smallint not null default 0 check (sort_order between 0 and 3),
  created_at timestamptz not null default now()
);

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null constraint community_comments_author_id_fkey references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  moderation_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('sensitive','sexual','violence','exploitation','harassment','spam','misinformation','other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('pending_review','approved','rejected')),
  provider text not null default 'manual',
  categories text[] not null default '{}',
  reason text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx on public.community_posts(status, created_at desc) where deleted_at is null;
create index if not exists community_posts_author_idx on public.community_posts(author_id, created_at desc);
create index if not exists community_media_post_idx on public.community_media(post_id, sort_order);
create index if not exists community_comments_post_idx on public.community_comments(post_id, status, created_at) where deleted_at is null;
create index if not exists community_reports_open_idx on public.community_reports(status, created_at desc);

alter table public.community_posts enable row level security;
alter table public.community_media enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderation_events enable row level security;

-- Lectura directa mínima; las fotografías siempre se firman desde la API.
create policy "community approved posts are readable"
  on public.community_posts for select using ((status = 'approved' or auth.uid() = author_id) and deleted_at is null);
create policy "community own media metadata"
  on public.community_media for select using (exists (
    select 1 from public.community_posts p where p.id = post_id and (p.status = 'approved' or p.author_id = auth.uid()) and p.deleted_at is null
  ));
create policy "community reactions readable"
  on public.community_reactions for select using (true);
create policy "community approved comments readable"
  on public.community_comments for select using (status = 'approved' and deleted_at is null or auth.uid() = author_id);
create policy "community own reports readable"
  on public.community_reports for select using (auth.uid() = reporter_id);

-- No se crea política pública sobre storage.objects. Las cargas usan tokens
-- firmados y las lecturas URLs temporales generadas por el servidor.


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 025_two_advertising_plans.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 026_port_live_map_coordinates.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FARO PORTUARIO · coordenadas para el mapa operativo.
-- Conserva las coordenadas existentes y garantiza compatibilidad en proyectos
-- donde la migración histórica de zonas ya fue aplicada.
alter table public.sections
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.sections.lat is 'Latitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';
comment on column public.sections.lng is 'Longitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';


-- ────────────────────────────────────────────────────────────────────────────
-- >>> 027_commerce_marketplace_jobs.sql
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- >>> SEED semaforo inicial (Pulso Portuario)
-- ────────────────────────────────────────────────────────────────────────────
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
