-- FARO PORTUARIO · Fase 1: fundamentos SaaS
-- Migración aditiva: conserva profiles, company_profiles, empresa_perfiles y subscriptions.
-- El nuevo modelo canónico puede convivir con los datos heredados durante la transición.

create extension if not exists pgcrypto;

-- ── Catálogos de cuenta ────────────────────────────────────────────────────
create table if not exists public.account_types (
  code text primary key,
  account_kind text not null check (account_kind in ('person', 'company')),
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.account_types (code, account_kind, name, sort_order) values
  ('candidate','person','Candidato',10), ('operator','person','Operador',20),
  ('traffic_executive','person','Ejecutivo de tráfico',30), ('documenter','person','Documentador',40),
  ('customs_reviewer','person','Glosador',50), ('sales_executive','person','Ejecutivo comercial',60),
  ('rigger','person','Maniobrista',70), ('mechanic','person','Mecánico',80),
  ('technician','person','Técnico',90), ('warehouse_staff','person','Personal de almacén',100),
  ('independent_professional','person','Profesional independiente',110), ('other_logistics_profile','person','Otro perfil logístico',120),
  ('carrier','company','Transportista',10), ('owner_operator','company','Hombre-camión',20),
  ('customs_broker','company','Agente aduanal',30), ('freight_forwarder','company','Freight forwarder',40),
  ('importer','company','Importador',50), ('exporter','company','Exportador',60),
  ('logistics_operator','company','Operador logístico',70), ('warehouse','company','Almacén',80),
  ('yard','company','Patio',90), ('rigging_company','company','Empresa de maniobras',100),
  ('shipping_line','company','Naviera',110), ('bonded_warehouse','company','Recinto fiscalizado',120),
  ('supplier','company','Proveedor',130), ('workshop','company','Taller',140),
  ('tire_shop','company','Llantera',150), ('crane_company','company','Empresa de grúas',160),
  ('gps_company','company','Empresa de GPS',170), ('security_company','company','Seguridad o custodia',180),
  ('insurer','company','Aseguradora',190), ('financial_company','company','Financiera',200),
  ('training_center','company','Centro de capacitación',210), ('trading_company','company','Comercializadora',220),
  ('other_logistics_provider','company','Otro proveedor logístico',230)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

alter table public.profiles
  add column if not exists account_kind text check (account_kind in ('person','company')),
  add column if not exists account_type text references public.account_types(code),
  add column if not exists onboarding_status text not null default 'account_pending'
    check (onboarding_status in ('account_pending','profile_pending','company_pending','plan_pending','complete')),
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- ── RBAC granular ───────────────────────────────────────────────────────────
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  scope text not null default 'platform' check (scope in ('platform','company')),
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

insert into public.roles (code, name, scope) values
  ('person_user','Usuario persona','platform'), ('professional_user','Usuario profesional','platform'),
  ('company_unverified','Empresa no verificada','platform'), ('company_verified','Empresa verificada','platform'),
  ('carrier_verified','Transportista verificado','platform'), ('superadmin','Superadministrador','platform'),
  ('general_admin','Administrador general','platform'), ('moderator','Moderador','platform'),
  ('company_validator','Validador de empresas','platform'), ('sales_executive','Ejecutivo de ventas','platform'),
  ('advertising_admin','Administrador de publicidad','platform'), ('finance_admin','Administrador financiero','platform'),
  ('content_editor','Editor de contenido','platform'), ('support','Soporte','platform')
on conflict (code) do update set name = excluded.name;

insert into public.permissions (code, description) values
  ('freight.create','Publicar cargas'), ('freight.view_private_data','Ver datos privados de fletes'),
  ('freight.submit_quote','Enviar cotizaciones'), ('freight.manage_quotes','Administrar cotizaciones recibidas'),
  ('company.manage_profile','Administrar perfil de empresa'), ('company.manage_team','Administrar equipo de empresa'),
  ('company.verify','Validar empresas'), ('job.create','Publicar vacantes'),
  ('marketplace.create','Publicar en marketplace'), ('ad.create','Crear campañas publicitarias'),
  ('ad.approve','Aprobar campañas'), ('subscription.manage','Administrar suscripciones'),
  ('moderation.manage','Moderar contenido'), ('admin.analytics','Consultar analítica administrativa'),
  ('admin.audit.read','Consultar auditoría'), ('content.manage','Administrar contenido')
  ,('admin.users.manage','Administrar usuarios'), ('admin.roles.manage','Administrar roles y permisos')
on conflict (code) do update set description = excluded.description;

-- El superadministrador recibe todos los permisos.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'superadmin'
on conflict do nothing;

-- Permisos administrativos acotados.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(case r.code
  when 'general_admin' then array['company.verify','ad.approve','subscription.manage','moderation.manage','admin.analytics','admin.audit.read','content.manage','admin.users.manage']
  when 'moderator' then array['moderation.manage']
  when 'company_validator' then array['company.verify']
  when 'advertising_admin' then array['ad.approve','admin.analytics']
  when 'finance_admin' then array['subscription.manage','admin.analytics']
  when 'content_editor' then array['content.manage']
  when 'support' then array['moderation.manage']
  else array[]::text[] end)
where r.code in ('general_admin','moderator','company_validator','advertising_admin','finance_admin','content_editor','support')
on conflict do nothing;

-- ── Empresa canónica y membresías ──────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  company_type text not null references public.account_types(code),
  status text not null default 'draft' check (status in ('draft','incomplete','pending_verification','corrections_required','verified','suspended','rejected','blocked')),
  trust_level smallint not null default 0 check (trust_level between 0 and 3),
  legal_name text not null,
  trade_name text not null,
  slug text unique,
  tax_id text,
  tax_regime text,
  fiscal_address text,
  founded_year smallint,
  responsible_name text,
  responsible_title text,
  business_email text,
  phone text,
  whatsapp text,
  website text,
  description text,
  services text[] not null default '{}',
  coverage text[] not null default '{}',
  ports_served text[] not null default '{}',
  states_served text[] not null default '{}',
  business_hours jsonb not null default '{}'::jsonb,
  badges text[] not null default '{}',
  submitted_at timestamptz,
  verified_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint companies_tax_id_format check (tax_id is null or tax_id ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$')
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('owner','admin','collaborator')),
  status text not null default 'active' check (status in ('invited','active','suspended','removed')),
  permissions text[] not null default '{}',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  expires_at date,
  uploaded_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint company_document_size check (size_bytes is null or size_bytes between 1 and 10485760),
  constraint company_document_mime check (mime_type is null or mime_type in ('application/pdf','image/jpeg','image/png','image/webp'))
);

create table if not exists public.company_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  status text not null default 'pending' check (status in ('pending','in_review','corrections_required','approved','rejected','revoked')),
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  checklist jsonb not null default '{}'::jsonb,
  internal_notes text,
  applicant_notes text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (company_id, level, status)
);

-- ── Planes y límites configurables ─────────────────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  audience text not null check (audience in ('person','carrier','company','provider')),
  description text,
  currency text not null default 'MXN',
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12,2) check (annual_price is null or annual_price >= 0),
  trial_days integer not null default 0 check (trial_days between 0 and 90),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_limits (
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_code text not null,
  limit_value integer,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  primary key (plan_id, feature_code),
  constraint plan_limit_value check (limit_value is null or limit_value >= 0)
);

insert into public.plans (code,name,audience,monthly_price,annual_price,sort_order,is_featured) values
  ('candidate_free','Candidato gratuito','person',0,0,10,false),
  ('professional','Profesional','person',99,990,20,true),
  ('carrier_essential','Transportista esencial','carrier',599,5990,30,false),
  ('carrier_pro','Transportista Pro','carrier',1499,14990,40,true),
  ('carrier_corporate','Transportista corporativo','carrier',3990,null,50,false),
  ('company_free','Empresa gratuita','company',0,0,10,false),
  ('company_essential','Empresa esencial','company',899,8990,20,false),
  ('company_pro','Empresa Pro','company',1999,19990,30,true),
  ('company_corporate','Empresa corporativa','company',4990,null,40,false),
  ('provider_local','Proveedor local','provider',399,3990,10,false),
  ('provider_featured','Proveedor destacado','provider',999,9990,20,true),
  ('provider_premium','Proveedor premium','provider',1999,null,30,false)
on conflict (code) do update set name=excluded.name, monthly_price=excluded.monthly_price, annual_price=excluded.annual_price;

insert into public.plan_limits (plan_id, feature_code, limit_value, is_enabled)
select p.id, x.feature_code, x.limit_value, true from public.plans p join (values
  ('candidate_free','active_jobs',0), ('professional','active_jobs',0),
  ('company_free','active_jobs',1), ('company_free','freight_posts',0), ('company_free','company_users',1), ('company_free','commercial_posts',1),
  ('carrier_essential','vehicles',3), ('carrier_essential','monthly_quotes',10), ('carrier_essential','active_jobs',1),
  ('carrier_pro','vehicles',20), ('carrier_pro','monthly_quotes',null), ('carrier_pro','active_jobs',5),
  ('carrier_corporate','vehicles',null), ('carrier_corporate','company_users',null),
  ('company_essential','monthly_freight_posts',10), ('company_essential','active_jobs',2),
  ('company_pro','monthly_freight_posts',null), ('company_pro','active_jobs',10), ('company_pro','company_users',null),
  ('provider_local','monthly_promotions',1), ('provider_featured','monthly_promotions',5), ('provider_featured','active_jobs',3),
  ('provider_premium','company_users',null), ('provider_premium','branches',null)
) as x(plan_code,feature_code,limit_value) on p.code=x.plan_code
on conflict (plan_id,feature_code) do update set limit_value=excluded.limit_value, is_enabled=excluded.is_enabled;

alter table public.subscriptions
  add column if not exists plan_id uuid references public.plans(id),
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists billing_period text check (billing_period in ('monthly','annual')),
  add column if not exists provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists grace_period_ends_at timestamptz;

-- ── Auditoría ───────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Índices ─────────────────────────────────────────────────────────────────
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_companies_owner on public.companies(owner_user_id) where deleted_at is null;
create index if not exists idx_companies_type_status on public.companies(company_type,status) where deleted_at is null;
create index if not exists idx_company_members_user on public.company_members(user_id,status);
create index if not exists idx_company_documents_company on public.company_documents(company_id,status) where deleted_at is null;
create index if not exists idx_company_verifications_status on public.company_verifications(status,requested_at);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan_id,estatus);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type,entity_id,created_at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id,created_at desc);

-- ── Funciones de autorización ──────────────────────────────────────────────
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions p on p.id=rp.permission_id
    where ur.user_id=p_user_id and p.code=p_permission
      and (ur.expires_at is null or ur.expires_at>now())
  );
$$;

create or replace function public.get_user_permissions(p_user_id uuid)
returns table(code text) language sql stable security definer set search_path=public as $$
  select distinct p.code from public.user_roles ur
  join public.role_permissions rp on rp.role_id=ur.role_id
  join public.permissions p on p.id=rp.permission_id
  where ur.user_id=p_user_id and (ur.expires_at is null or ur.expires_at>now());
$$;

create or replace function public.company_member_has_permission(p_user_id uuid,p_company_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_permission(p_user_id,p_permission) or exists (
    select 1 from public.company_members cm where cm.user_id=p_user_id and cm.company_id=p_company_id
      and cm.status='active' and (cm.member_role in ('owner','admin') or p_permission=any(cm.permissions))
  );
$$;

create or replace function public.create_company_draft(p_owner_id uuid,p_company_type text,p_legal_name text,p_trade_name text)
returns public.companies language plpgsql security definer set search_path=public as $$
declare v_company public.companies;
begin
  if auth.uid() is not null and auth.uid()<>p_owner_id then raise exception 'No autorizado'; end if;
  if not exists(select 1 from public.account_types where code=p_company_type and account_kind='company' and is_active) then raise exception 'Tipo de empresa inválido'; end if;
  insert into public.companies(owner_user_id,company_type,legal_name,trade_name,status)
  values(p_owner_id,p_company_type,p_legal_name,p_trade_name,'draft') returning * into v_company;
  insert into public.company_members(company_id,user_id,member_role,status,joined_at) values(v_company.id,p_owner_id,'owner','active',now());
  update public.profiles set account_kind='company',account_type=p_company_type,onboarding_status='company_pending',updated_at=now() where id=p_owner_id;
  return v_company;
end; $$;

create or replace function public.get_company_entitlements(p_company_id uuid)
returns table(feature_code text,limit_value integer,is_enabled boolean) language sql stable security definer set search_path=public as $$
  select pl.feature_code,pl.limit_value,pl.is_enabled from public.subscriptions s
  join public.plan_limits pl on pl.plan_id=s.plan_id
  where s.company_id=p_company_id and s.estatus='activa' and (s.expires_at is null or s.expires_at>now())
  order by pl.feature_code;
$$;

-- Mantiene compatibilidad con el trigger histórico y asigna el rol canónico.
create or replace function public.handle_new_user() returns trigger as $$
declare
  v_kind text := nullif(new.raw_user_meta_data->>'account_kind','');
  v_type text := nullif(new.raw_user_meta_data->>'account_type','');
  v_role text;
begin
  if v_kind not in ('person','company') then v_kind := 'person'; end if;
  if not exists(select 1 from public.account_types where code=v_type and account_kind=v_kind) then
    v_type := case when v_kind='company' then 'other_logistics_provider' else 'candidate' end;
  end if;
  insert into public.profiles(id,full_name,phone,role,tipo_usuario,account_kind,account_type,onboarding_status,phone_verified_at)
  values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'phone',case when v_kind='company' then 'company' else 'operator_free' end,case when v_kind='company' then 'empresa' else 'operador' end,v_kind,v_type,case when v_kind='company' then 'company_pending' else 'profile_pending' end,case when new.raw_user_meta_data ? 'phone' then now() else null end)
  on conflict(id) do update set account_kind=excluded.account_kind,account_type=excluded.account_type;
  v_role := case when v_kind='company' then 'company_unverified' else 'person_user' end;
  insert into public.user_roles(user_id,role_id) select new.id,id from public.roles where code=v_role on conflict do nothing;
  return new;
end; $$ language plpgsql security definer set search_path=public;

-- Roles iniciales para cuentas existentes sin borrar su rol heredado.
insert into public.user_roles(user_id,role_id)
select p.id,r.id from public.profiles p join public.roles r on r.code=case
  when p.role='admin' then 'superadmin'
  when p.role='moderador' then 'moderator'
  when p.role='company' then 'company_unverified'
  else 'person_user' end
on conflict do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.account_types enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_documents enable row level security;
alter table public.company_verifications enable row level security;
alter table public.plans enable row level security;
alter table public.plan_limits enable row level security;
alter table public.audit_logs enable row level security;

create policy "account_types_public_read" on public.account_types for select using (is_active);
create policy "plans_public_read" on public.plans for select using (is_active);
create policy "plan_limits_authenticated_read" on public.plan_limits for select to authenticated using (true);
create policy "roles_own_read" on public.user_roles for select using (user_id=auth.uid());
create policy "companies_member_read" on public.companies for select using (exists(select 1 from public.company_members cm where cm.company_id=id and cm.user_id=auth.uid() and cm.status='active'));
create policy "companies_public_verified" on public.companies for select using (status='verified' and deleted_at is null);
create policy "companies_member_update" on public.companies for update using (public.company_member_has_permission(auth.uid(),id,'company.manage_profile'));
create policy "company_members_own_read" on public.company_members for select using (user_id=auth.uid() or public.company_member_has_permission(auth.uid(),company_id,'company.manage_team'));
create policy "company_documents_member" on public.company_documents for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') or public.has_permission(auth.uid(),'company.verify'));
create policy "company_documents_member_insert" on public.company_documents for insert with check (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') and uploaded_by=auth.uid());
create policy "company_verifications_member_read" on public.company_verifications for select using (public.company_member_has_permission(auth.uid(),company_id,'company.manage_profile') or public.has_permission(auth.uid(),'company.verify'));
create policy "audit_authorized_read" on public.audit_logs for select using (public.has_permission(auth.uid(),'admin.audit.read'));

revoke all on function public.has_permission(uuid,text) from public;
grant execute on function public.has_permission(uuid,text) to authenticated,service_role;
revoke all on function public.get_user_permissions(uuid) from public;
grant execute on function public.get_user_permissions(uuid) to authenticated,service_role;
revoke all on function public.company_member_has_permission(uuid,uuid,text) from public;
grant execute on function public.company_member_has_permission(uuid,uuid,text) to authenticated,service_role;
revoke all on function public.create_company_draft(uuid,text,text,text) from public;
grant execute on function public.create_company_draft(uuid,text,text,text) to authenticated,service_role;
revoke all on function public.get_company_entitlements(uuid) from public;
grant execute on function public.get_company_entitlements(uuid) to authenticated,service_role;

comment on table public.companies is 'Modelo empresarial canónico de Faro Portuario. Los modelos heredados se migrarán gradualmente.';
comment on table public.company_documents is 'Solo contiene rutas privadas; los archivos deben almacenarse en un bucket privado y servirse con URL firmada.';

-- Bucket privado para expedientes empresariales. Nunca usar URLs públicas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('company-documents','company-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
