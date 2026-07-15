-- FARO PORTUARIO · Comunidad profesional moderada
-- Las fotografías permanecen en un bucket privado. El backend entrega URLs
-- temporales únicamente para contenido aprobado o para el autor/moderador.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null constraint community_posts_author_id_fkey references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  moderation_provider text,
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  storage_path text not null unique,
  alt_text text check (char_length(alt_text) <= 180),
  sort_order smallint not null default 0 check (sort_order between 0 and 3),
  created_at timestamptz not null default now()
);

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null constraint community_comments_author_id_fkey references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  moderation_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('sensitive','sexual','violence','exploitation','harassment','spam','misinformation','other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('pending_review','approved','rejected')),
  provider text not null default 'manual',
  categories text[] not null default '{}',
  reason text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx on public.community_posts(status, created_at desc) where deleted_at is null;
create index if not exists community_posts_author_idx on public.community_posts(author_id, created_at desc);
create index if not exists community_media_post_idx on public.community_media(post_id, sort_order);
create index if not exists community_comments_post_idx on public.community_comments(post_id, status, created_at) where deleted_at is null;
create index if not exists community_reports_open_idx on public.community_reports(status, created_at desc);

alter table public.community_posts enable row level security;
alter table public.community_media enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderation_events enable row level security;

-- Lectura directa mínima; las fotografías siempre se firman desde la API.
create policy "community approved posts are readable"
  on public.community_posts for select using ((status = 'approved' or auth.uid() = author_id) and deleted_at is null);
create policy "community own media metadata"
  on public.community_media for select using (exists (
    select 1 from public.community_posts p where p.id = post_id and (p.status = 'approved' or p.author_id = auth.uid()) and p.deleted_at is null
  ));
create policy "community reactions readable"
  on public.community_reactions for select using (true);
create policy "community approved comments readable"
  on public.community_comments for select using (status = 'approved' and deleted_at is null or auth.uid() = author_id);
create policy "community own reports readable"
  on public.community_reports for select using (auth.uid() = reporter_id);

-- No se crea política pública sobre storage.objects. Las cargas usan tokens
-- firmados y las lecturas URLs temporales generadas por el servidor.
