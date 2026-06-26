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
