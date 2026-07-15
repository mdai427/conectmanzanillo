-- Faro Portuario · agente editorial de noticias
-- Conserva únicamente metadatos, un resumen editorial propio y la trazabilidad
-- de la fuente. El contenido completo permanece en el medio de origen.

-- Limpieza idempotente del nombre legado: las publicaciones válidas se
-- renombran y cualquier variante residual se desactiva para evitar que vuelva
-- a mostrarse en el portal.
update public.news_items
set content = replace(replace(replace(replace(content,
  'ConnectManzanillo', 'Faro Portuario'),
  'ConectManzanillo', 'Faro Portuario'),
  'Connect Manzanillo', 'Faro Portuario'),
  'Conect Manzanillo', 'Faro Portuario')
where content ilike '%connectmanzanillo%'
   or content ilike '%conectmanzanillo%'
   or content ilike '%connect manzanillo%'
   or content ilike '%conect manzanillo%';

update public.news_items
set is_active = false
where lower(content) like '%connect manzanillo%'
   or lower(content) like '%conect manzanillo%'
   or lower(content) like '%connectmanzanillo%'
   or lower(content) like '%conectmanzanillo%';

-- La policy heredada permitía escrituras demasiado amplias. service_role omite
-- RLS; los usuarios autenticados solo escriben si su perfil es administrador.
drop policy if exists "service_write_news" on public.news_items;
drop policy if exists "public_read_news" on public.news_items;
drop policy if exists "public_read_active_news" on public.news_items;
create policy "public_read_active_news" on public.news_items
  for select using (is_active = true and (expires_at is null or expires_at > now()));
drop policy if exists "admin_write_news_items" on public.news_items;
create policy "admin_write_news_items" on public.news_items
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

create table if not exists public.port_news_sources (
  id                text primary key,
  name              text not null,
  homepage_url      text not null,
  feed_url          text,
  provider_type     text not null default 'rss' check (provider_type in ('rss', 'api')),
  is_enabled        boolean not null default true,
  is_trusted        boolean not null default false,
  allows_image      boolean not null default false,
  auto_publish      boolean not null default false,
  last_checked_at   timestamptz,
  last_success_at   timestamptz,
  last_error        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.port_news (
  id                  uuid primary key default uuid_generate_v4(),
  source_id           text not null references public.port_news_sources(id),
  source_name         text not null,
  source_url          text not null,
  canonical_url       text not null,
  external_id         text,
  fingerprint         text not null unique,
  title               text not null check (char_length(title) between 8 and 300),
  editorial_summary   text not null check (char_length(editorial_summary) between 30 and 500),
  category            text not null default 'sector' check (category in (
                        'accesos', 'puerto', 'aduana', 'transporte', 'comercio_exterior',
                        'clima', 'normatividad', 'empleo', 'sector'
                      )),
  relevance_score     smallint not null default 0 check (relevance_score between 0 and 100),
  relevance_reasons   jsonb not null default '[]'::jsonb,
  status              text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  is_active            boolean not null default true,
  image_url           text,
  image_rights_note   text,
  published_at_source timestamptz,
  published_at_portal timestamptz,
  expires_at           timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid references public.profiles(id),
  rejection_reason    text,
  ingested_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists port_news_public_feed_idx
  on public.port_news(status, is_active, published_at_portal desc, relevance_score desc);
create index if not exists port_news_source_date_idx
  on public.port_news(source_id, published_at_source desc);
create index if not exists port_news_category_idx
  on public.port_news(category, status);

alter table public.port_news_sources enable row level security;
alter table public.port_news enable row level security;

drop policy if exists "public_read_enabled_news_sources" on public.port_news_sources;
create policy "public_read_enabled_news_sources" on public.port_news_sources
  for select using (is_enabled = true);

drop policy if exists "public_read_published_port_news" on public.port_news;
create policy "public_read_published_port_news" on public.port_news
  for select using (
    status = 'published'
    and is_active = true
    and (expires_at is null or expires_at > now())
  );

-- Las escrituras se realizan exclusivamente desde el servidor con service_role.

comment on table public.port_news is
  'Metadatos y resúmenes propios de noticias; nunca almacena el artículo completo.';
comment on column public.port_news.image_rights_note is
  'Base de uso de la imagen. NULL implica que la imagen no debe mostrarse.';
