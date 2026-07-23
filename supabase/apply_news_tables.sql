-- Faro Portuario · tablas del agente de noticias (extracto idempotente de 022)
-- Solo depende de public.profiles (migración 001) + extensión uuid-ossp.
-- Seguro de correr varias veces.

create extension if not exists "uuid-ossp";

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

-- Verificación:
select
  (select count(*) from public.port_news_sources) as fuentes,
  (select count(*) from public.port_news)          as noticias;
