-- ─── Tabla de suscripciones de empresas ─────────────────────────────────────
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  tipo          text not null default 'empresa_vacantes',   -- tipo de suscripción
  estatus       text not null default 'pendiente'           -- pendiente | activa | vencida | cancelada
                check (estatus in ('pendiente', 'activa', 'vencida', 'cancelada')),
  monto         numeric(10,2) not null default 500.00,
  moneda        text not null default 'MXN',
  -- Periodo
  starts_at     timestamptz,
  expires_at    timestamptz,
  -- Comprobante de pago (usuario sube imagen/referencia)
  comprobante_url  text,
  referencia_pago  text,                                    -- CLABE / referencia / número de operación
  metodo_pago      text,                                    -- transferencia | oxxo | efectivo | otro
  notas_admin      text,                                    -- notas del admin al activar/rechazar
  -- Auditoría
  activado_por  uuid references auth.users(id),            -- admin que activó
  activado_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índices
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_estatus_idx on public.subscriptions(estatus);

-- RLS
alter table public.subscriptions enable row level security;

-- Usuario ve sus propias suscripciones
create policy "User reads own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Usuario crea solicitud de suscripción (pendiente)
create policy "User inserts own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id and estatus = 'pendiente');

-- Usuario puede actualizar su comprobante si está pendiente
create policy "User updates own pending subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id and estatus = 'pendiente')
  with check (estatus = 'pendiente');

-- Admin puede leer y actualizar todas
create policy "Admin full access subscriptions"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
