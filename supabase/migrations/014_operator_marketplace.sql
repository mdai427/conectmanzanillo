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
