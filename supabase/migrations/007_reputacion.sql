-- ─── Sistema de Reputación ────────────────────────────────────────────────────
-- Agrega columnas de reputación a profiles
alter table public.profiles
  add column if not exists puntos            int          not null default 0,
  add column if not exists nivel             text         not null default 'nuevo',
  add column if not exists total_reportes    int          not null default 0,
  add column if not exists reportes_confirmados int       not null default 0,
  add column if not exists reportes_precisos   int        not null default 0,
  add column if not exists racha_dias          int        not null default 0,
  add column if not exists ultimo_reporte_at   timestamptz;

-- Función para calcular el nivel basado en puntos
create or replace function public.calcular_nivel(puntos int)
returns text language plpgsql as $$
begin
  return case
    when puntos >= 5000 then 'elite'
    when puntos >= 2500 then 'embajador'
    when puntos >= 1000 then 'premium'
    when puntos >= 500  then 'experto'
    when puntos >= 100  then 'colaborador'
    else                     'nuevo'
  end;
end;
$$;

-- Función que se llama cuando se crea un reporte: +5 puntos
create or replace function public.otorgar_puntos_reporte()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is not null then
    update public.profiles
    set
      puntos            = puntos + 5,
      total_reportes    = total_reportes + 1,
      ultimo_reporte_at = now(),
      nivel             = public.calcular_nivel(puntos + 5)
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created
  after insert on public.reports
  for each row execute function public.otorgar_puntos_reporte();

-- Función que se llama cuando una reacción confirma un reporte: +10 puntos al autor
create or replace function public.otorgar_puntos_confirmacion()
returns trigger language plpgsql security definer as $$
declare
  report_owner uuid;
begin
  -- Solo procesar reacciones tipo 'confirm'
  if new.type = 'confirm' then
    -- Obtener el dueño del reporte
    select user_id into report_owner from public.reports where id = new.report_id;
    if report_owner is not null and report_owner != new.user_id then
      update public.profiles
      set
        puntos                = puntos + 10,
        reportes_confirmados  = reportes_confirmados + 1,
        nivel                 = public.calcular_nivel(puntos + 10)
      where id = report_owner;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_reaction_confirm on public.reactions;
create trigger on_reaction_confirm
  after insert on public.reactions
  for each row execute function public.otorgar_puntos_confirmacion();
