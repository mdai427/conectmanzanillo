-- Faro Portuario · Directorio Empresarial + Publicidad (extracto idempotente de 013)
-- Depende de: public.profiles (migración 001) + auth.users (provisto por Supabase).
-- Seguro de correr varias veces (drop policy if exists + create ... if not exists).

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
  nombre_comercial text NOT NULL,
  slug             text UNIQUE,
  descripcion      text,
  logo_url         text,
  portada_url      text,
  categoria_slug   text REFERENCES directorio_categorias(slug),
  categorias       text[],
  especialidades   text[],
  servicios        text[],
  certificaciones  text[],
  whatsapp   text,
  telefono   text,
  email      text,
  sitio_web  text,
  direccion  text,
  facebook_url  text,
  instagram_url text,
  linkedin_url  text,
  tiktok_url    text,
  fotos_urls  text[],
  videos_urls text[],
  horarios jsonb,
  ubicacion_lat  double precision,
  ubicacion_lng  double precision,
  empresa_polygon jsonb,
  es_premium    boolean DEFAULT false,
  es_destacado  boolean DEFAULT false,
  es_verificado boolean DEFAULT false,
  is_active     boolean DEFAULT true,
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
  zona text NOT NULL DEFAULT 'global',
  prioridad  int DEFAULT 0,
  fecha_inicio date,
  fecha_fin    date,
  is_active boolean DEFAULT true,
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
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_analytics_empresa ON empresa_analytics(empresa_id, created_at);

-- ── Eventos de publicidad ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicidad_eventos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid REFERENCES publicidad_campanas(id) ON DELETE CASCADE,
  tipo       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_eventos_campana ON publicidad_eventos(campana_id, created_at);

-- ── Función updated_at + triggers ─────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_empresa_perfiles_updated ON empresa_perfiles;
CREATE TRIGGER trg_empresa_perfiles_updated
  BEFORE UPDATE ON empresa_perfiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_publicidad_campanas_updated ON publicidad_campanas;
CREATE TRIGGER trg_publicidad_campanas_updated
  BEFORE UPDATE ON publicidad_campanas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE empresa_perfiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicidad_campanas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_analytics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicidad_eventos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE directorio_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_public_read" ON directorio_categorias;
CREATE POLICY "categorias_public_read" ON directorio_categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "empresa_perfiles_public_read" ON empresa_perfiles;
CREATE POLICY "empresa_perfiles_public_read" ON empresa_perfiles
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "empresa_perfiles_admin_all" ON empresa_perfiles;
CREATE POLICY "empresa_perfiles_admin_all" ON empresa_perfiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
  );

DROP POLICY IF EXISTS "empresa_perfiles_owner_edit" ON empresa_perfiles;
CREATE POLICY "empresa_perfiles_owner_edit" ON empresa_perfiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "publicidad_public_read" ON publicidad_campanas;
CREATE POLICY "publicidad_public_read" ON publicidad_campanas
  FOR SELECT USING (
    is_active = true
    AND (fecha_inicio IS NULL OR fecha_inicio <= current_date)
    AND (fecha_fin    IS NULL OR fecha_fin    >= current_date)
  );

DROP POLICY IF EXISTS "publicidad_admin_all" ON publicidad_campanas;
CREATE POLICY "publicidad_admin_all" ON publicidad_campanas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
  );

DROP POLICY IF EXISTS "empresa_analytics_insert" ON empresa_analytics;
CREATE POLICY "empresa_analytics_insert" ON empresa_analytics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "empresa_analytics_admin" ON empresa_analytics;
CREATE POLICY "empresa_analytics_admin"  ON empresa_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
);
DROP POLICY IF EXISTS "empresa_analytics_owner" ON empresa_analytics;
CREATE POLICY "empresa_analytics_owner"  ON empresa_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM empresa_perfiles ep WHERE ep.id = empresa_id AND ep.user_id = auth.uid())
);

DROP POLICY IF EXISTS "publicidad_eventos_insert" ON publicidad_eventos;
CREATE POLICY "publicidad_eventos_insert" ON publicidad_eventos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "publicidad_eventos_admin" ON publicidad_eventos;
CREATE POLICY "publicidad_eventos_admin"  ON publicidad_eventos FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderador'))
);

-- Verificación:
select
  (select count(*) from public.directorio_categorias) as categorias,
  (select count(*) from public.empresa_perfiles)       as empresas,
  (select count(*) from public.publicidad_campanas)    as campanas;
