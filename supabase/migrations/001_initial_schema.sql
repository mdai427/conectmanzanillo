-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- =============================================
-- SECTIONS — zonas del puerto
-- =============================================
create table public.sections (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  icon        text default 'map-pin',
  is_active   boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- =============================================
-- PROFILES — extiende auth.users
-- =============================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  full_name     text,
  phone         text,
  role          text default 'operator_free'
                  check (role in ('operator_free','operator_premium','company','admin')),
  reputation    numeric(4,2) default 1.00,
  reports_count int default 0,
  is_verified   boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- =============================================
-- REPORTS — núcleo del sistema de votos
-- =============================================
create type status_level as enum ('free','moderate','congested','closed');

create table public.reports (
  id             uuid primary key default uuid_generate_v4(),
  section_id     uuid not null references public.sections(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  status         status_level not null,
  comment        text check (char_length(comment) <= 140),
  weight         numeric(4,2) default 1.00,
  confirmations  int default 0,
  contradictions int default 0,
  expires_at     timestamptz not null,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

create index idx_reports_section_active on public.reports(section_id, is_active, expires_at desc);
create index idx_reports_user on public.reports(user_id, created_at desc);

-- =============================================
-- VOTE_REACTIONS — confirmar o contradecir
-- =============================================
create table public.vote_reactions (
  id         uuid primary key default uuid_generate_v4(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reaction   text not null check (reaction in ('confirm','contradict')),
  created_at timestamptz default now(),
  unique(report_id, user_id)
);

-- =============================================
-- SECTION_STATUS_CACHE — estado calculado
-- =============================================
create table public.section_status_cache (
  section_id      uuid primary key references public.sections(id),
  current_status  status_level default 'free',
  active_reports  int default 0,
  confidence      numeric(4,2) default 0,
  last_calculated timestamptz default now(),
  last_report_at  timestamptz
);

-- =============================================
-- FUNCIÓN: calcular estado con decaimiento temporal
-- =============================================
create or replace function calculate_section_status(p_section_id uuid)
returns void as $$
declare
  v_now          timestamptz := now();
  w_free         numeric := 0;
  w_moderate     numeric := 0;
  w_congested    numeric := 0;
  w_closed       numeric := 0;
  v_total        numeric := 0;
  v_count        int := 0;
  v_status       status_level := 'free';
  v_confidence   numeric := 0;
begin
  select
    coalesce(sum(case when r.status = 'free' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'moderate' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'congested' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    coalesce(sum(case when r.status = 'closed' then
      r.weight
      * greatest(0.1, 1 - extract(epoch from (v_now - r.created_at))
                       / extract(epoch from (r.expires_at - r.created_at)))
      * (1 + r.confirmations * 0.1 - r.contradictions * 0.15)
    end), 0),
    count(*)
  into w_free, w_moderate, w_congested, w_closed, v_count
  from public.reports r
  where r.section_id = p_section_id
    and r.is_active = true
    and r.expires_at > v_now;

  v_total := w_free + w_moderate + w_congested + w_closed;

  if v_total > 0 then
    if w_closed >= greatest(w_free, w_moderate, w_congested) then
      v_status := 'closed';     v_confidence := w_closed / v_total;
    elsif w_congested >= greatest(w_free, w_moderate) then
      v_status := 'congested';  v_confidence := w_congested / v_total;
    elsif w_moderate >= w_free then
      v_status := 'moderate';   v_confidence := w_moderate / v_total;
    else
      v_status := 'free';       v_confidence := w_free / v_total;
    end if;
  end if;

  insert into public.section_status_cache
    (section_id, current_status, active_reports, confidence, last_calculated, last_report_at)
  values (
    p_section_id, v_status, v_count, v_confidence, v_now,
    (select max(created_at) from public.reports
     where section_id = p_section_id and is_active = true and expires_at > v_now)
  )
  on conflict (section_id) do update set
    current_status  = excluded.current_status,
    active_reports  = excluded.active_reports,
    confidence      = excluded.confidence,
    last_calculated = excluded.last_calculated,
    last_report_at  = excluded.last_report_at;
end;
$$ language plpgsql security definer;

-- TRIGGER: recalcular al insertar reporte
create or replace function trg_recalculate() returns trigger as $$
begin perform calculate_section_status(NEW.section_id); return NEW; end;
$$ language plpgsql security definer;

create trigger on_report_insert
  after insert on public.reports for each row execute function trg_recalculate();

-- TRIGGER: crear profile al registrar usuario
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- RLS
alter table public.sections            enable row level security;
alter table public.profiles            enable row level security;
alter table public.reports             enable row level security;
alter table public.vote_reactions      enable row level security;
alter table public.section_status_cache enable row level security;

create policy "public_read_sections"  on public.sections            for select using (true);
create policy "public_read_profiles"  on public.profiles            for select using (true);
create policy "own_write_profiles"    on public.profiles            for all    using (auth.uid() = id);
create policy "public_read_reports"   on public.reports             for select using (true);
create policy "auth_insert_reports"   on public.reports             for insert with check (auth.uid() = user_id);
create policy "own_update_reports"    on public.reports             for update using (auth.uid() = user_id);
create policy "public_read_reactions" on public.vote_reactions      for select using (true);
create policy "auth_write_reactions"  on public.vote_reactions      for all    using (auth.uid() = user_id);
create policy "public_read_cache"     on public.section_status_cache for select using (true);
create policy "service_write_cache"   on public.section_status_cache for all    using (true);
