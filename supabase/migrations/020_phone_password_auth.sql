-- Preferencias de contacto para cuentas con teléfono verificado.
alter table public.profiles
  add column if not exists sms_notifications_enabled boolean not null default false,
  add column if not exists sms_consent_at timestamptz;

create index if not exists idx_profiles_verified_phone
  on public.profiles(phone)
  where phone is not null and phone_verified_at is not null;

comment on column public.profiles.sms_notifications_enabled is
  'Consentimiento para alertas operativas por SMS/WhatsApp; no habilita publicidad automática.';
