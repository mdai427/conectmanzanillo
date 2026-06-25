-- ── Módulo 1: Alertas de Emergencia ─────────────────────────────────────────
create table if not exists public.emergency_alerts (
  id          uuid primary key default uuid_generate_v4(),
  message     text not null,
  is_active   boolean default true,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  resolved_at timestamptz
);
alter table public.emergency_alerts enable row level security;
create policy "public_read_alerts"   on public.emergency_alerts for select using (true);
create policy "service_write_alerts" on public.emergency_alerts for all using (true);

-- ── Módulo 2: Ticker de Noticias ─────────────────────────────────────────────
create table if not exists public.news_items (
  id         uuid primary key default uuid_generate_v4(),
  content    text not null check (char_length(content) <= 200),
  category   text default 'aviso' check (category in ('aviso','cierre','operativo','clima','general')),
  is_active  boolean default true,
  priority   int default 0,
  created_by uuid references public.profiles(id),
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);
alter table public.news_items enable row level security;
create policy "public_read_news"   on public.news_items for select using (true);
create policy "service_write_news" on public.news_items for all using (true);

insert into public.news_items (content, category, priority, expires_at) values
  ('Bienvenido a ConectManzanillo · Reporta el estado de las zonas del puerto en tiempo real', 'general', 10, now() + interval '365 days'),
  ('Para reportar necesitas registrarte · Es gratis · Tarda menos de 1 minuto', 'aviso', 5, now() + interval '365 days');

-- ── Módulo 4: Anuncios Comerciales ───────────────────────────────────────────
create table if not exists public.ads (
  id           uuid primary key default uuid_generate_v4(),
  company_name text not null,
  tagline      text,
  image_url    text,
  cta_text     text default 'Ver más',
  cta_url      text,
  phone        text,
  whatsapp     text,
  plan         text default 'basic' check (plan in ('basic','premium','featured')),
  position     text default 'dashboard' check (position in ('dashboard','sidebar','ticker','all')),
  is_active    boolean default true,
  starts_at    timestamptz default now(),
  ends_at      timestamptz default (now() + interval '30 days'),
  clicks       int default 0,
  impressions  int default 0,
  created_at   timestamptz default now()
);
alter table public.ads enable row level security;
create policy "public_read_ads"   on public.ads for select using (is_active = true and ends_at > now());
create policy "service_write_ads" on public.ads for all using (true);

insert into public.ads (company_name, tagline, cta_text, cta_url, phone, plan, position) values
  ('Tu Empresa Aquí', 'Llega a cientos de transportistas del Puerto de Manzanillo', 'Anúnciate', 'mailto:contacto@conectmanzanillo.com', '3141234567', 'featured', 'dashboard');

-- ── Módulo 6: Directorio de Servicios ────────────────────────────────────────
create table if not exists public.directory_listings (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  category     text not null check (category in (
                 'taller','grua','gasolinera','restaurante','hotel',
                 'agencia_aduanal','refaccionaria','lavado','otro'
               )),
  description  text,
  address      text,
  phone        text,
  whatsapp     text,
  maps_url     text,
  is_featured  boolean default false,
  is_active    boolean default true,
  created_at   timestamptz default now()
);
alter table public.directory_listings enable row level security;
create policy "public_read_directory"   on public.directory_listings for select using (is_active = true);
create policy "service_write_directory" on public.directory_listings for all using (true);

insert into public.directory_listings (name, category, description, phone, is_featured) values
  ('Talleres Puerto', 'taller', 'Servicio diesel y reparación de unidades pesadas cerca del puerto', '3141234567', true),
  ('Grúas Manzanillo 24h', 'grua', 'Servicio de grúa disponible las 24 horas para unidades pesadas', '3149876543', true),
  ('Fonda La Terminal', 'restaurante', 'Comida corrida económica, desayunos desde las 5am para transportistas', '3141112233', false);

-- ── Módulo 7: Chat por Sección ───────────────────────────────────────────────
create table if not exists public.section_messages (
  id         uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 3 and 200),
  created_at timestamptz default now()
);
create index if not exists idx_messages_section on public.section_messages(section_id, created_at desc);
alter table public.section_messages enable row level security;
create policy "public_read_messages" on public.section_messages for select using (true);
create policy "auth_insert_messages" on public.section_messages for insert with check (auth.uid() = user_id);
