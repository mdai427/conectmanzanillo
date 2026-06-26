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
