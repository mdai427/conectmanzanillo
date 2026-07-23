-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · Parte 4/6 · migraciones 016-018
-- Ejecutar EN ORDEN. La migracion 001 ya fue aplicada; NO reejecutar.
-- ════════════════════════════════════════════════════════════════════════════

-- >>> 016_public_experience.sql
-- Fase 2 · experiencia pública y métricas publicitarias atómicas

alter table public.publicidad_campanas
  add column if not exists is_demo boolean not null default false,
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft','pending','approved','rejected','paused'));

-- Conserva campañas activas heredadas, pero exige aprobación para nuevas activaciones.
update public.publicidad_campanas set review_status='approved' where is_active=true and review_status='draft';

create or replace function public.increment_ad_metric(p_campaign_id uuid,p_metric text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_metric='impression' then
    update public.publicidad_campanas set impresiones=coalesce(impresiones,0)+1 where id=p_campaign_id;
  elsif p_metric='click' then
    update public.publicidad_campanas set clics=coalesce(clics,0)+1 where id=p_campaign_id;
  else
    raise exception 'Métrica inválida';
  end if;
end; $$;

revoke all on function public.increment_ad_metric(uuid,text) from public;
grant execute on function public.increment_ad_metric(uuid,text) to service_role;

create index if not exists idx_publicidad_public_active
  on public.publicidad_campanas(zona,prioridad desc,fecha_inicio,fecha_fin)
  where is_active=true and review_status='approved' and is_demo=false;


-- >>> 017_advertising_commercial_flow.sql
-- Fase 2 · planes publicitarios administrables y solicitudes comerciales

create table if not exists public.advertising_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  features text[] not null default '{}',
  monthly_price numeric(12,2),
  currency text not null default 'MXN',
  requires_quote boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advertising_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.advertising_plans(id),
  requested_by uuid not null references auth.users(id),
  contact_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','proposal_sent','won','lost','closed')),
  assigned_to uuid references auth.users(id),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.advertising_plans(code,name,description,features,monthly_price,requires_quote,sort_order) values
  ('basic_presence','Presencia Básica','Visibilidad inicial dentro del directorio.',array['Perfil destacado','Logo en directorio','Enlace de contacto','Estadísticas básicas','Vigencia mensual'],null,true,10),
  ('featured_company','Empresa Destacada','Mayor presencia en resultados y espacios editoriales.',array['Carrusel de portada','Prioridad en resultados','Botón de cotización','Estadísticas','Publicación destacada'],null,true,20),
  ('sponsor','Patrocinador','Campaña con presencia preferente en distintas secciones.',array['Banner premium','Presencia multisección','Campaña destacada','Reporte de métricas','Acompañamiento comercial'],null,true,30),
  ('custom_campaign','Campaña Personalizada','Estrategia y duración definidas según objetivos.',array['Creatividad personalizada','Contenido patrocinado','Segmentación','Duración flexible','Canales sujetos a disponibilidad'],null,true,40)
on conflict(code) do update set name=excluded.name,description=excluded.description,features=excluded.features,sort_order=excluded.sort_order;

create index if not exists idx_advertising_leads_company on public.advertising_leads(company_id,status,created_at desc) where deleted_at is null;
create index if not exists idx_advertising_leads_status on public.advertising_leads(status,created_at desc) where deleted_at is null;

alter table public.advertising_plans enable row level security;
alter table public.advertising_leads enable row level security;
create policy "advertising_plans_public_read" on public.advertising_plans for select using (is_active);
create policy "advertising_leads_company_read" on public.advertising_leads for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile'));
create policy "advertising_leads_admin_read" on public.advertising_leads for select using (public.has_permission(auth.uid(),'ad.approve'));

comment on table public.advertising_plans is 'Precios y características editables. NULL indica cotización comercial.';


-- >>> 018_operational_control_centers.sql
-- FARO PORTUARIO · Centros de rutas, seguridad, aduanas y torre de control
-- Las fuentes externas permanecen desactivadas hasta contar con credenciales y autorización.

create extension if not exists pgcrypto;

insert into public.permissions (code, description) values
  ('operations.view','Consultar torre de control y operaciones'),
  ('route.plan','Crear y evaluar planes de ruta'),
  ('route.override','Autorizar excepciones de ruta'),
  ('customs.manage','Administrar operaciones aduanales'),
  ('integrations.manage','Administrar proveedores operativos')
on conflict (code) do update set description=excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code='superadmin' and p.code in ('operations.view','route.plan','route.override','customs.manage','integrations.manage')
on conflict do nothing;

create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  provider_type text not null check (provider_type in ('routing','traffic','incident','gps','weather','customs','port','terminal','customs_broker')),
  code text not null, name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  status text not null default 'disabled' check (status in ('disabled','configured','healthy','degraded','unavailable')),
  configuration jsonb not null default '{}'::jsonb, last_success_at timestamptz, last_error_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,code)
);

create table if not exists public.integration_logs (
  id bigint generated always as identity primary key, company_id uuid not null references public.companies(id) on delete cascade,
  provider_id uuid references public.integration_providers(id) on delete set null, operation text not null,
  status text not null check (status in ('success','retry','failed','fallback')), duration_ms integer,
  request_id text, error_code text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Secrets never live in this table. secret_reference points to the platform secret manager.
create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  provider_id uuid not null references public.integration_providers(id) on delete cascade, secret_reference text not null,
  credential_type text not null, status text not null default 'pending' check (status in ('pending','active','expired','revoked')),
  expires_at timestamptz, last_rotated_at timestamptz, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), unique(provider_id,credential_type)
);

create table if not exists public.authorized_stops (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, stop_type text not null, address text, latitude numeric(10,7), longitude numeric(10,7), radius_m integer not null default 250,
  schedule jsonb not null default '{}'::jsonb, accepts_truck boolean not null default true, accepts_full boolean not null default false,
  overnight boolean not null default false, security_level text not null default 'pending' check (security_level in ('validated','recommended','aid_only','emergency','pending')),
  amenities text[] not null default '{}', max_minutes integer, requires_authorization boolean not null default false,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), validated_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.route_legal_rules (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  road_class text not null check (road_class in ('ET','A','B','C','D','STATE','MUNICIPAL','PORT','CUSTOMS','PRIVATE')),
  allowed_configurations text[] not null default '{}', max_gross_weight_kg numeric(12,2), max_length_m numeric(8,2), max_width_m numeric(8,2), max_height_m numeric(8,2),
  requires_sict_permit boolean not null default false, requires_full_authorization boolean not null default false,
  requires_connectivity boolean not null default false, hazardous_allowed boolean, valid_hours jsonb not null default '{}'::jsonb,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  effective_from date, effective_until date, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.route_risk_segments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  road_name text not null, start_km numeric(9,3), end_km numeric(9,3), direction text, schedule jsonb not null default '{}'::jsonb,
  risk_type text not null, risk_level text not null check (risk_level in ('critical','high','medium','low','reinforced_monitoring','insufficient_information')),
  cargo_types text[] not null default '{}', recommendation text, protocol text, requires_convoy boolean not null default false,
  intensive_monitoring boolean not null default false, no_stop boolean not null default false, daylight_only boolean not null default false,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), reviewed_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.road_incidents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  incident_type text not null, severity text not null check (severity in ('info','preventive','high','critical')),
  road_name text, segment text, kilometer numeric(9,3), direction text, latitude numeric(10,7), longitude numeric(10,7),
  starts_at timestamptz not null, estimated_end_at timestamptz, resolved_at timestamptz, description text not null, evidence_path text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','corroborated','confirmed','dismissed')),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);

create table if not exists public.route_plans (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, origin text not null, destination text not null, waypoints jsonb not null default '[]'::jsonb,
  departure_at timestamptz, vehicle_type text not null, vehicle_configuration text not null, axle_count smallint,
  trailer_count smallint not null default 0, vehicle_weight_kg numeric(12,2), cargo_weight_kg numeric(12,2), gross_weight_kg numeric(12,2),
  total_length_m numeric(8,2), width_m numeric(8,2), height_m numeric(8,2), cargo_type text,
  hazardous_material boolean not null default false, oversized boolean not null default false,
  sict_permit_expires_at date, full_authorization_expires_at date, connectivity_authorization_expires_at date,
  plates jsonb not null default '{}'::jsonb, status text not null default 'draft' check (status in ('draft','evaluating','blocked','conditional','approved','in_progress','completed','cancelled')),
  compliance_result text, risk_level text, blocking_reasons jsonb not null default '[]'::jsonb,
  evaluation_snapshot jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id), approved_by uuid references auth.users(id),
  approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.route_segments (
  id uuid primary key default gen_random_uuid(), route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  sequence_no integer not null, road_name text not null, road_class text not null, start_km numeric(9,3), end_km numeric(9,3), direction text,
  distance_km numeric(10,2), duration_minutes integer, traffic_level text check (traffic_level in ('normal','slow','congested','blocked','unavailable')),
  compliance_status text not null default 'insufficient_information' check (compliance_status in ('authorized','authorized_with_conditions','requires_permit','requires_connectivity','restricted','not_authorized','insufficient_information')),
  compliance_reasons jsonb not null default '[]'::jsonb, risk_level text, source_name text, source_class text check (source_class in ('official','third_party','internal','manual')),
  source_updated_at timestamptz, unique(route_plan_id,sequence_no)
);

create table if not exists public.route_overrides (
  id uuid primary key default gen_random_uuid(), route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  reason text not null, evidence_path text, approved_by uuid not null references auth.users(id), valid_until timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gps_positions (
  id bigint generated always as identity primary key, company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete cascade, asset_reference text not null,
  latitude numeric(10,7) not null, longitude numeric(10,7) not null, speed_kph numeric(7,2), heading smallint,
  accuracy_m numeric(8,2), recorded_at timestamptz not null, received_at timestamptz not null default now(),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100)
);

create table if not exists public.route_deviations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid not null references public.route_plans(id) on delete cascade, deviation_type text not null,
  distance_m numeric(10,2), detected_at timestamptz not null, resolved_at timestamptz, status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  details jsonb not null default '{}'::jsonb, source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100)
);

create table if not exists public.driver_hours (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete set null, driver_reference text not null,
  period_start timestamptz not null, period_end timestamptz not null, driving_minutes integer not null default 0,
  rest_minutes integer not null default 0, status text not null default 'unverified' check (status in ('compliant','warning','exceeded','unverified')),
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), created_at timestamptz not null default now()
);

create table if not exists public.customs_operations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  reference text not null, operation_type text not null check (operation_type in ('import','export','interior','border','airport')),
  customs_name text, port_name text, terminal_name text, bonded_warehouse text, broker_name text,
  container_number text, booking text, customs_entry text, status_code text not null default 'documentation_pending',
  status_label text not null default 'Documentación pendiente', status_source text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), next_action text, estimated_at timestamptz,
  free_days_until date, responsible_name text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,reference)
);

create table if not exists public.customs_events (
  id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.customs_operations(id) on delete cascade,
  status_code text not null, status_label text not null, responsible_name text, source_name text not null,
  source_class text not null check (source_class in ('official','third_party','internal','manual')), confidence smallint not null default 0 check (confidence between 0 and 100),
  evidence_path text, comment text, occurred_at timestamptz not null default now(), created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.port_appointments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  customs_operation_id uuid references public.customs_operations(id) on delete set null, port_name text not null, terminal_name text,
  operation_type text not null, container_number text, booking text, customs_entry text, carrier_name text, vehicle_plate text, driver_name text,
  requested_at timestamptz, confirmed_at timestamptz, window_start timestamptz, window_end timestamptz,
  status text not null default 'requested' check (status in ('requested','confirmed','in_queue','entered','completed','rejected','expired','cancelled')),
  queue_minutes integer, accessed_at timestamptz, exited_at timestamptz, rejection_reason text, evidence_path text,
  source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid references public.route_plans(id) on delete cascade, customs_operation_id uuid references public.customs_operations(id) on delete cascade,
  alert_type text not null, severity text not null check (severity in ('info','preventive','high','critical')),
  title text not null, message text not null, source_name text not null, source_class text not null check (source_class in ('official','third_party','internal','manual')),
  confidence smallint not null default 0 check (confidence between 0 and 100), status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  recommended_action text, created_at timestamptz not null default now(), acknowledged_by uuid references auth.users(id), resolved_at timestamptz
);

create index if not exists idx_route_plans_company_status on public.route_plans(company_id,status,updated_at desc);
create index if not exists idx_route_segments_plan on public.route_segments(route_plan_id,sequence_no);
create index if not exists idx_customs_operations_company_status on public.customs_operations(company_id,status_code,updated_at desc);
create index if not exists idx_customs_events_operation on public.customs_events(operation_id,occurred_at desc);
create index if not exists idx_port_appointments_company_window on public.port_appointments(company_id,window_start,status);
create index if not exists idx_operational_alerts_company on public.operational_alerts(company_id,status,severity,created_at desc);
create index if not exists idx_incidents_company_active on public.road_incidents(company_id,resolved_at,severity);
create index if not exists idx_gps_positions_route_time on public.gps_positions(route_plan_id,recorded_at desc);
create index if not exists idx_route_deviations_company_status on public.route_deviations(company_id,status,detected_at desc);
create index if not exists idx_driver_hours_company_driver on public.driver_hours(company_id,driver_reference,period_start desc);

alter table public.integration_providers enable row level security;
alter table public.integration_logs enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.authorized_stops enable row level security;
alter table public.route_legal_rules enable row level security;
alter table public.route_risk_segments enable row level security;
alter table public.road_incidents enable row level security;
alter table public.route_plans enable row level security;
alter table public.route_segments enable row level security;
alter table public.route_overrides enable row level security;
alter table public.gps_positions enable row level security;
alter table public.route_deviations enable row level security;
alter table public.driver_hours enable row level security;
alter table public.customs_operations enable row level security;
alter table public.customs_events enable row level security;
alter table public.port_appointments enable row level security;
alter table public.operational_alerts enable row level security;

create or replace function public.is_active_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.company_members cm where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active');
$$;

do $$ declare t text; begin
  foreach t in array array['integration_providers','integration_logs','integration_credentials','authorized_stops','route_legal_rules','route_risk_segments','road_incidents','route_plans','gps_positions','route_deviations','driver_hours','customs_operations','port_appointments','operational_alerts']
  loop execute format('drop policy if exists tenant_member_access on public.%I',t);
       execute format('create policy tenant_member_access on public.%I for all using (public.is_active_company_member(company_id)) with check (public.is_active_company_member(company_id))',t);
  end loop;
end $$;

drop policy if exists route_segments_tenant_access on public.route_segments;
create policy route_segments_tenant_access on public.route_segments for all using (
  exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id))
) with check (exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id)));

drop policy if exists route_overrides_tenant_access on public.route_overrides;
create policy route_overrides_tenant_access on public.route_overrides for all using (
  exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id))
) with check (exists(select 1 from public.route_plans rp where rp.id=route_plan_id and public.is_active_company_member(rp.company_id)));

drop policy if exists customs_events_tenant_access on public.customs_events;
create policy customs_events_tenant_access on public.customs_events for all using (
  exists(select 1 from public.customs_operations co where co.id=operation_id and public.is_active_company_member(co.company_id))
) with check (exists(select 1 from public.customs_operations co where co.id=operation_id and public.is_active_company_member(co.company_id)));

grant execute on function public.is_active_company_member(uuid) to authenticated;

