-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · Parte 2/6 · migraciones 008-013
-- Ejecutar EN ORDEN. La migracion 001 ya fue aplicada; NO reejecutar.
-- ════════════════════════════════════════════════════════════════════════════

-- >>> 008_analytics_alerts.sql
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
  for each row execute function public.set_updated_at();

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


-- >>> 009_enable_realtime.sql
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


-- >>> 010_user_moderation.sql
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


-- >>> 011_empresa_polygon.sql
-- 011_empresa_polygon.sql
alter table public.profiles
  add column if not exists empresa_polygon  jsonb,
  add column if not exists empresa_name     text,
  add column if not exists empresa_address  text;


-- >>> 012_comunicados_sanctions.sql
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


-- >>> 013_directorio_empresarial.sql
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

