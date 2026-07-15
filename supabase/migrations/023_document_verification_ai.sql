-- Expediente documental asistido, confirmable y privado para Faro Portuario.
alter table public.company_documents
  add column if not exists extraction_status text not null default 'uploaded'
    check (extraction_status in ('awaiting_upload','uploaded','processing','suggestions_ready','confirmed','provider_disabled','skipped_by_user','failed')),
  add column if not exists extraction_provider text,
  add column if not exists extracted_fields jsonb not null default '{"fields":[],"warnings":[]}'::jsonb,
  add column if not exists extraction_error text,
  add column if not exists extraction_started_at timestamptz,
  add column if not exists extraction_completed_at timestamptz,
  add column if not exists ai_processing_consent_at timestamptz,
  add column if not exists extraction_confirmed_at timestamptz,
  add column if not exists extraction_confirmed_by uuid references auth.users(id);

alter table public.empresa_perfiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create unique index if not exists idx_empresa_perfiles_company_unique
  on public.empresa_perfiles(company_id);

create table if not exists public.verification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient text not null,
  template text not null check (template in ('submitted','approved','corrections_required')),
  provider text not null,
  delivery_status text not null check (delivery_status in ('sent','provider_disabled','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_documents_extraction
  on public.company_documents(company_id, extraction_status) where deleted_at is null;

alter table public.verification_email_deliveries enable row level security;

comment on column public.company_documents.extracted_fields is
  'Sugerencias de extracción; nunca se aplican al perfil hasta confirmación explícita del usuario.';
comment on table public.verification_email_deliveries is
  'Bitácora sin contenido documental del correo transaccional de verificación.';

update storage.buckets
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=array['application/pdf','image/jpeg','image/png']
where id='company-documents';

create or replace function public.confirm_company_document_extraction(
  p_document_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_updates jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_now timestamptz := now();
begin
  update public.companies set
    legal_name=coalesce(nullif(p_updates->>'legal_name',''),legal_name),
    trade_name=coalesce(nullif(p_updates->>'trade_name',''),trade_name),
    tax_id=coalesce(nullif(upper(p_updates->>'tax_id'),''),tax_id),
    tax_regime=coalesce(nullif(p_updates->>'tax_regime',''),tax_regime),
    fiscal_address=coalesce(nullif(p_updates->>'fiscal_address',''),fiscal_address),
    responsible_name=coalesce(nullif(p_updates->>'responsible_name',''),responsible_name),
    updated_at=v_now
  where id=p_company_id;
  if not found then raise exception 'Empresa no encontrada'; end if;

  update public.company_documents set
    extraction_status='confirmed',
    extraction_confirmed_at=v_now,
    extraction_confirmed_by=p_user_id
  where id=p_document_id and company_id=p_company_id and deleted_at is null and extraction_status='suggestions_ready';
  if not found then raise exception 'Documento sin sugerencias pendientes'; end if;

  return jsonb_build_object('confirmed_at',v_now);
end;
$$;

revoke all on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.confirm_company_document_extraction(uuid,uuid,uuid,jsonb) to service_role;
