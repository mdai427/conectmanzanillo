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
