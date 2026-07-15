-- FARO PORTUARIO · coordenadas para el mapa operativo.
-- Conserva las coordenadas existentes y garantiza compatibilidad en proyectos
-- donde la migración histórica de zonas ya fue aplicada.
alter table public.sections
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.sections.lat is 'Latitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';
comment on column public.sections.lng is 'Longitud pública aproximada del punto operativo; debe verificarse antes de publicarse.';
