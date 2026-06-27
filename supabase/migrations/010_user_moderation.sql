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
