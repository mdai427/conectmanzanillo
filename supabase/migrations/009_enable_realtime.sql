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
