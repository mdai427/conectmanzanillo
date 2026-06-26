-- ================================================================
-- 008_analytics_alerts.sql
-- Tablas para: historial de estado de zonas, alertas configurables,
-- evidencia de reportes, eventos de línea del tiempo, simulaciones de costo
-- ================================================================

-- ── 1. Historial de estado de zonas ─────────────────────────────
create table if not exists public.zone_status_history (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid references public.sections(id) on delete cascade,
  status        text not null,
  active_reports int not null default 0,
  confidence    float8 not null default 0,
  recorded_at   timestamptz not null default now()
);

create index if not exists zone_status_history_section_id_idx on public.zone_status_history(section_id);
create index if not exists zone_status_history_recorded_at_idx on public.zone_status_history(recorded_at desc);

-- RLS: lectura pública, escritura solo servidor
alter table public.zone_status_history enable row level security;
create policy "Public read zone_status_history"
  on public.zone_status_history for select using (true);

-- ── 2. Evidencia de reportes ─────────────────────────────────────
create table if not exists public.report_evidence (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.reports(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  tipo        text not null check (tipo in ('foto','video','audio','documento')),
  url         text not null,
  thumbnail   text,
  created_at  timestamptz not null default now()
);

alter table public.report_evidence enable row level security;
create policy "Public read report_evidence"
  on public.report_evidence for select using (true);
create policy "Users insert own evidence"
  on public.report_evidence for insert
  with check (auth.uid() = user_id);

-- ── 3. Alertas configurables ─────────────────────────────────────
create table if not exists public.user_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  section_id    uuid references public.sections(id) on delete cascade,
  tipo          text not null check (tipo in ('saturacion','cierre','operativo','cambio','fila_alta','zona_libre')),
  nivel_minimo  text not null default 'congested' check (nivel_minimo in ('moderate','congested','closed')),
  canal         text not null default 'portal' check (canal in ('portal','whatsapp','email')),
  activa        boolean not null default true,
  ultimo_envio  timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.user_alerts enable row level security;
create policy "Users manage own alerts"
  on public.user_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. Eventos de línea del tiempo ──────────────────────────────
create table if not exists public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid references public.sections(id) on delete cascade,
  report_id   uuid references public.reports(id) on delete set null,
  tipo        text not null check (tipo in (
    'reporte_recibido','confirmacion','cambio_estado','alerta_generada',
    'congestion_detectada','incidente','zona_normalizada','cierre','apertura'
  )),
  severidad   text not null default 'normal' check (severidad in ('normal','media','alta','critica')),
  descripcion text,
  fuente      text not null default 'comunidad' check (fuente in ('comunidad','ia','sistema','admin')),
  created_at  timestamptz not null default now()
);

create index if not exists timeline_events_section_id_idx on public.timeline_events(section_id);
create index if not exists timeline_events_created_at_idx on public.timeline_events(created_at desc);

alter table public.timeline_events enable row level security;
create policy "Public read timeline_events"
  on public.timeline_events for select using (true);

-- ── 5. Simulaciones de costo ─────────────────────────────────────
create table if not exists public.cost_simulations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete cascade,
  unidades          int not null,
  costo_por_hora    numeric(10,2) not null,
  horas_espera      numeric(5,2) not null,
  dias_mes          int not null,
  costo_diario      numeric(12,2) not null,
  costo_mensual     numeric(12,2) not null,
  costo_anual       numeric(14,2) not null,
  ahorro_20pct      numeric(12,2) not null,
  ahorro_35pct      numeric(12,2) not null,
  created_at        timestamptz not null default now()
);

alter table public.cost_simulations enable row level security;
create policy "Users manage own simulations"
  on public.cost_simulations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. Perfiles de empresa ───────────────────────────────────────
create table if not exists public.company_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete cascade unique,
  nombre_empresa    text not null,
  tipo_empresa      text check (tipo_empresa in ('transportista','naviera','patio','terminal','agente_aduanal','cliente_logistico','otro')),
  num_unidades      int,
  zonas_favoritas   text[],
  telefono_whatsapp text,
  recibir_reportes  boolean default true,
  plan_activo       text default 'gratuito' check (plan_activo in ('gratuito','operador_pro','empresa','empresa_pro','patio_terminal','enterprise')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.company_profiles enable row level security;
create policy "Users manage own company profile"
  on public.company_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admin read all company profiles"
  on public.company_profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- updated_at trigger
create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function update_updated_at_column();

-- ── 7. Trigger: registrar evento de timeline al crear reporte ────
create or replace function public.crear_evento_timeline()
returns trigger language plpgsql security definer as $$
begin
  insert into public.timeline_events (section_id, report_id, tipo, severidad, descripcion, fuente)
  values (
    new.section_id,
    new.id,
    'reporte_recibido',
    case new.status
      when 'congested' then 'alta'
      when 'moderate'  then 'media'
      when 'closed'    then 'critica'
      else 'normal'
    end,
    case new.status
      when 'free'      then 'Reporte: flujo libre'
      when 'moderate'  then 'Reporte: tráfico moderado'
      when 'congested' then 'Reporte: zona saturada'
      when 'closed'    then 'Reporte: zona cerrada'
      else 'Reporte recibido'
    end,
    'comunidad'
  );
  return new;
end;
$$;

drop trigger if exists on_report_insert_timeline on public.reports;
create trigger on_report_insert_timeline
  after insert on public.reports
  for each row execute function public.crear_evento_timeline();

-- ── 8. Trigger: detectar congestión y crear evento alerta ────────
create or replace function public.detectar_congestion()
returns trigger language plpgsql security definer as $$
begin
  -- Si el nuevo estado de caché es 'congested', registrar evento de alerta
  if new.current_status = 'congested' and
     (old.current_status is null or old.current_status != 'congested') then
    insert into public.timeline_events (section_id, tipo, severidad, descripcion, fuente)
    values (
      new.section_id,
      'congestion_detectada',
      'critica',
      'Saturación detectada por sistema de monitoreo',
      'sistema'
    );
  end if;

  -- Si el estado mejora (de congested a free), registrar normalización
  if old.current_status = 'congested' and new.current_status = 'free' then
    insert into public.timeline_events (section_id, tipo, severidad, descripcion, fuente)
    values (
      new.section_id,
      'zona_normalizada',
      'normal',
      'Zona normalizada: flujo libre detectado',
      'sistema'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_status_cache_change on public.section_status_cache;
create trigger on_status_cache_change
  after update of current_status on public.section_status_cache
  for each row execute function public.detectar_congestion();

-- ── Índices de eficiencia ────────────────────────────────────────
create index if not exists user_alerts_user_id_idx on public.user_alerts(user_id);
create index if not exists report_evidence_report_id_idx on public.report_evidence(report_id);
create index if not exists cost_simulations_user_id_idx on public.cost_simulations(user_id);
create index if not exists company_profiles_user_id_idx on public.company_profiles(user_id);
