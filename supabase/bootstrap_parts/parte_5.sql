-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · Parte 5/6 · migraciones 019-024
-- Ejecutar EN ORDEN. La migracion 001 ya fue aplicada; NO reejecutar.
-- ════════════════════════════════════════════════════════════════════════════

-- >>> 019_freight_marketplace.sql
-- FARO PORTUARIO · Bolsa de fletes y membresía mensual
insert into public.plans (code,name,audience,description,currency,monthly_price,annual_price,trial_days,is_active,is_featured,sort_order)
values ('freight_membership','Membresía Publicador de Fletes','company','Publicación y administración de cargas dentro de Faro Portuario.','MXN',500,null,0,true,true,25)
on conflict (code) do update set name=excluded.name,description=excluded.description,monthly_price=500,annual_price=null,is_active=true;

insert into public.plan_limits(plan_id,feature_code,limit_value,is_enabled)
select id,'monthly_freight_posts',null,true from public.plans where code='freight_membership'
on conflict(plan_id,feature_code) do update set limit_value=null,is_enabled=true;

alter table public.companies
  add column if not exists legal_entity_type text check(legal_entity_type in ('individual_business','legal_entity'));

create table if not exists public.freight_posts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id), title text not null,
  origin_city text not null, origin_state text not null, origin_postal_code text,
  destination_city text not null, destination_state text not null, destination_postal_code text,
  pickup_date date not null, pickup_window_start time, pickup_window_end time, delivery_date date,
  cargo_type text not null check (cargo_type in ('container','general','refrigerated','hazardous','bulk','oversized','vehicles','other')),
  cargo_description text not null, weight_kg numeric(12,2), volume_m3 numeric(10,2), package_count integer,
  equipment_type text not null, container_type text, container_number text,
  hazardous boolean not null default false, un_number text, target_temperature_c numeric(6,2),
  offered_price numeric(12,2), currency text not null default 'MXN', price_includes_vat boolean not null default false,
  payment_terms text, loading_included boolean not null default false, unloading_included boolean not null default false,
  special_requirements text, visibility text not null default 'public' check (visibility in ('public','members_only')),
  service_contact_name text not null, service_contact_phone text not null, service_contact_whatsapp text,
  contact_preference text not null default 'platform' check (contact_preference in ('platform','phone','whatsapp','email')),
  status text not null default 'draft' check (status in ('draft','published','paused','assigned','completed','cancelled','expired')),
  published_at timestamptz, expires_at timestamptz not null default (now()+interval '30 days'),
  assigned_company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint freight_weight_positive check (weight_kg is null or weight_kg>0),
  constraint freight_volume_positive check (volume_m3 is null or volume_m3>0),
  constraint freight_price_positive check (offered_price is null or offered_price>=0),
  constraint freight_hazardous_un check (not hazardous or nullif(trim(un_number),'') is not null)
);

create table if not exists public.freight_interest_requests (
  id uuid primary key default gen_random_uuid(), freight_id uuid not null references public.freight_posts(id) on delete cascade,
  requester_company_id uuid not null references public.companies(id) on delete cascade, requested_by uuid not null references auth.users(id),
  message text, status text not null default 'sent' check(status in ('sent','viewed','accepted','rejected','cancelled')),
  contact_revealed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(freight_id,requester_company_id)
);

create table if not exists public.freight_status_history (
  id bigint generated always as identity primary key, freight_id uuid not null references public.freight_posts(id) on delete cascade,
  previous_status text, new_status text not null, changed_by uuid not null references auth.users(id), reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  provider text not null, provider_event_id text not null, event_type text not null,
  status text not null default 'processing' check(status in ('processing','processed','failed')),
  error_message text, received_at timestamptz not null default now(), processed_at timestamptz,
  primary key(provider,provider_event_id)
);

create index if not exists idx_freight_posts_public on public.freight_posts(status,pickup_date,created_at desc);
create index if not exists idx_freight_posts_company on public.freight_posts(company_id,status,updated_at desc);
create index if not exists idx_freight_route on public.freight_posts(origin_state,destination_state,pickup_date);
create index if not exists idx_freight_history on public.freight_status_history(freight_id,created_at desc);
create index if not exists idx_freight_interest_owner on public.freight_interest_requests(freight_id,status,created_at desc);

alter table public.freight_posts enable row level security;
alter table public.freight_status_history enable row level security;
alter table public.freight_interest_requests enable row level security;
alter table public.payment_events enable row level security;

-- No se concede lectura anónima sobre la tabla: contiene teléfonos privados.
-- El catálogo público se entrega desde /api/freights con una selección sanitizada.
drop policy if exists freight_public_read on public.freight_posts;
drop policy if exists freight_company_read on public.freight_posts;
create policy freight_company_read on public.freight_posts for select using (public.is_active_company_member(company_id));
drop policy if exists freight_member_write on public.freight_posts;
create policy freight_member_write on public.freight_posts for all using (public.is_active_company_member(company_id)) with check (public.is_active_company_member(company_id));
drop policy if exists freight_history_member_read on public.freight_status_history;
create policy freight_history_member_read on public.freight_status_history for select using (exists(select 1 from public.freight_posts f where f.id=freight_id and public.is_active_company_member(f.company_id)));
drop policy if exists freight_interest_parties on public.freight_interest_requests;
create policy freight_interest_parties on public.freight_interest_requests for select using (
  public.is_active_company_member(requester_company_id) or exists(select 1 from public.freight_posts f where f.id=freight_id and public.is_active_company_member(f.company_id))
);

comment on table public.payment_events is 'Idempotencia de webhooks; acceso exclusivo mediante service role.';


-- >>> 020_phone_password_auth.sql
-- Preferencias de contacto para cuentas con teléfono verificado.
alter table public.profiles
  add column if not exists sms_notifications_enabled boolean not null default false,
  add column if not exists sms_consent_at timestamptz;

create index if not exists idx_profiles_verified_phone
  on public.profiles(phone)
  where phone is not null and phone_verified_at is not null;

comment on column public.profiles.sms_notifications_enabled is
  'Consentimiento para alertas operativas por SMS/WhatsApp; no habilita publicidad automática.';


-- >>> 021_resource_library.sql
-- Registro mínimo de descargas gratuitas de la biblioteca Faro Portuario.
-- Los archivos viven en el servidor y siempre se entregan después de validar la sesión.

create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null check (char_length(resource_id) between 3 and 100),
  file_format text not null check (file_format in ('XLSX', 'DOCX', 'PDF')),
  downloaded_at timestamptz not null default now()
);

create index if not exists resource_downloads_user_date_idx
  on public.resource_downloads (user_id, downloaded_at desc);

create index if not exists resource_downloads_resource_date_idx
  on public.resource_downloads (resource_id, downloaded_at desc);

alter table public.resource_downloads enable row level security;

drop policy if exists "Users read own resource downloads" on public.resource_downloads;
create policy "Users read own resource downloads"
  on public.resource_downloads
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Las inserciones se hacen desde el backend con service_role después de validar el token.
revoke insert, update, delete on public.resource_downloads from anon, authenticated;
grant select on public.resource_downloads to authenticated;


-- >>> 022_news_agent.sql
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


-- >>> 023_document_verification_ai.sql
-- Expediente documental asistido, confirmable y privado para Faro Portuario.
alter table public.company_documents
  add column if not exists extraction_status text not null default 'uploaded'
    check (extraction_status in ('awaiting_upload','uploaded','processing','suggestions_ready','confirmed','provider_disabled','skipped_by_user','failed')),
  add column if not exists extraction_provider text,
  add column if not exists extracted_fields jsonb not null default '{"fields":[],"warnings":[]}'::jsonb,
  add column if not exists extraction_error text,
  add column if not exists extraction_started_at timestamptz,
  add column if not exists extraction_completed_at timestamptz,
  add column if not exists ai_processing_consent_at timestamptz,
  add column if not exists extraction_confirmed_at timestamptz,
  add column if not exists extraction_confirmed_by uuid references auth.users(id);

alter table public.empresa_perfiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create unique index if not exists idx_empresa_perfiles_company_unique
  on public.empresa_perfiles(company_id);

create table if not exists public.verification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient text not null,
  template text not null check (template in ('submitted','approved','corrections_required')),
  provider text not null,
  delivery_status text not null check (delivery_status in ('sent','provider_disabled','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_documents_extraction
  on public.company_documents(company_id, extraction_status) where deleted_at is null;

alter table public.verification_email_deliveries enable row level security;

comment on column public.company_documents.extracted_fields is
  'Sugerencias de extracción; nunca se aplican al perfil hasta confirmación explícita del usuario.';
comment on table public.verification_email_deliveries is
  'Bitácora sin contenido documental del correo transaccional de verificación.';

update storage.buckets
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=array['application/pdf','image/jpeg','image/png']
where id='company-documents';

create or replace function public.confirm_company_document_extraction(
  p_document_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_updates jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_now timestamptz := now();
begin
  update public.companies set
    legal_name=coalesce(nullif(p_updates->>'legal_name',''),legal_name),
    trade_name=coalesce(nullif(p_updates->>'trade_name',''),trade_name),
    tax_id=coalesce(nullif(upper(p_updates->>'tax_id'),''),tax_id),
    tax_regime=coalesce(nullif(p_updates->>'tax_regime',''),tax_regime),
    fiscal_address=coalesce(nullif(p_updates->>'fiscal_address',''),fiscal_address),
    responsible_name=coalesce(nullif(p_updates->>'responsible_name',''),responsible_name),
    updated_at=v_now
  where id=p_company_id;
  if not found then raise exception 'Empresa no encontrada'; end if;

  update public.company_documents set
    extraction_status='confirmed',
    extraction_confirmed_at=v_now,
    extraction_confirmed_by=p_user_id
  where id=p_document_id and company_id=p_company_id and deleted_at is null and extraction_status='suggestions_ready';
  if not found then raise exception 'Documento sin sugerencias pendientes'; end if;

  return jsonb_build_object('confirmed_at',v_now);
end;
$$;

revoke all on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) to service_role;


-- >>> 024_community_feed.sql
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

