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
