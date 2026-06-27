-- 011_empresa_polygon.sql
alter table public.profiles
  add column if not exists empresa_polygon  jsonb,
  add column if not exists empresa_name     text,
  add column if not exists empresa_address  text;
