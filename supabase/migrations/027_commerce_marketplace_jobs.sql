-- FARO PORTUARIO · membresías comerciales y Marketplace

insert into public.plans (code,name,audience,description,currency,monthly_price,annual_price,trial_days,is_active,is_featured,sort_order) values
  ('job_membership','Talento Faro','company','Publicación de vacantes durante 30 días.','MXN',599,null,0,true,false,61),
  ('marketplace_starter','Vitrina 3','provider','Publicación de hasta 3 productos.','MXN',599,null,0,true,false,62),
  ('marketplace_growth','Catálogo 10','provider','Publicación de 4 a 10 productos.','MXN',799,null,0,true,true,63),
  ('marketplace_scale','Escala','provider','Publicación desde 11 productos sin límite máximo.','MXN',1399,null,0,true,false,64)
on conflict (code) do update set name=excluded.name,description=excluded.description,currency='MXN',monthly_price=excluded.monthly_price,annual_price=null,is_active=true,is_featured=excluded.is_featured,sort_order=excluded.sort_order;

insert into public.plan_limits (plan_id,feature_code,limit_value,is_enabled)
select id,'active_jobs',null,true from public.plans where code='job_membership'
on conflict (plan_id,feature_code) do update set limit_value=null,is_enabled=true;

insert into public.plan_limits (plan_id,feature_code,limit_value,is_enabled)
select id,'marketplace_products',case code when 'marketplace_starter' then 3 when 'marketplace_growth' then 10 else null end,true
from public.plans where code in ('marketplace_starter','marketplace_growth','marketplace_scale')
on conflict (plan_id,feature_code) do update set limit_value=excluded.limit_value,is_enabled=true;

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null default 'otros',
  listing_type text not null default 'sale' check (listing_type in ('sale','rent','service')),
  price numeric(12,2) check (price is null or price >= 0),
  currency text not null default 'MXN' check (currency='MXN'),
  price_includes_vat boolean not null default false,
  city text not null default 'Manzanillo',
  state text not null default 'Colima',
  image_urls text[] not null default '{}',
  contact_phone text,
  contact_whatsapp text,
  status text not null default 'draft' check (status in ('draft','published','paused','sold','expired')),
  published_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint marketplace_images_limit check (cardinality(image_urls) <= 4)
);

create index if not exists marketplace_products_public_idx on public.marketplace_products(status,created_at desc) where deleted_at is null;
create index if not exists marketplace_products_company_idx on public.marketplace_products(company_id,status,created_at desc) where deleted_at is null;
alter table public.marketplace_products enable row level security;

drop policy if exists "marketplace_public_read" on public.marketplace_products;
create policy "marketplace_public_read" on public.marketplace_products for select
using (status='published' and deleted_at is null and expires_at > now());

drop policy if exists "marketplace_company_manage" on public.marketplace_products;
create policy "marketplace_company_manage" on public.marketplace_products for all
using (exists(select 1 from public.company_members cm where cm.company_id=marketplace_products.company_id and cm.user_id=auth.uid() and cm.status='active' and cm.member_role in ('owner','admin')))
with check (exists(select 1 from public.company_members cm where cm.company_id=marketplace_products.company_id and cm.user_id=auth.uid() and cm.status='active' and cm.member_role in ('owner','admin')));

drop trigger if exists marketplace_products_updated_at on public.marketplace_products;
create trigger marketplace_products_updated_at before update on public.marketplace_products for each row execute function public.set_updated_at();
