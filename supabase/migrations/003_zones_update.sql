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
