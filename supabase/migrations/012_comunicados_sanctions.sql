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
