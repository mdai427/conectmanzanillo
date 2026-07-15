-- Registro mínimo de descargas gratuitas de la biblioteca Faro Portuario.
-- Los archivos viven en el servidor y siempre se entregan después de validar la sesión.

create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null check (char_length(resource_id) between 3 and 100),
  file_format text not null check (file_format in ('XLSX', 'DOCX', 'PDF')),
  downloaded_at timestamptz not null default now()
);

create index if not exists resource_downloads_user_date_idx
  on public.resource_downloads (user_id, downloaded_at desc);

create index if not exists resource_downloads_resource_date_idx
  on public.resource_downloads (resource_id, downloaded_at desc);

alter table public.resource_downloads enable row level security;

drop policy if exists "Users read own resource downloads" on public.resource_downloads;
create policy "Users read own resource downloads"
  on public.resource_downloads
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Las inserciones se hacen desde el backend con service_role después de validar el token.
revoke insert, update, delete on public.resource_downloads from anon, authenticated;
grant select on public.resource_downloads to authenticated;
