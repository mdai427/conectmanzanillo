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
