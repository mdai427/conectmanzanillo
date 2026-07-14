# Fase 1 · Fundamentos SaaS

## Archivos principales

- `supabase/migrations/015_saas_foundations.sql`: modelo canónico y RLS.
- `server/src/security/catalog.js`: catálogo validado de cuentas y permisos.
- `server/src/middleware/auth.js`: autorización granular.
- `server/src/routes/foundations.js`: API de onboarding, planes, documentos y verificación.
- `client/src/pages/Register.jsx`: alta por tipo de cuenta.
- `client/src/pages/CompanyOnboarding.jsx`: onboarding empresarial en siete pasos.
- `client/src/lib/foundationsApi.js`: cliente autenticado.

## Cómo probar

1. Crear un proyecto Supabase de desarrollo o respaldar la base existente.
2. Aplicar migraciones en orden hasta `015_saas_foundations.sql`.
3. Crear el bucket privado mediante la migración y confirmar que `company-documents` no sea público.
4. Configurar las variables de `server/.env.example` y `client/.env.example`.
5. Iniciar servidor y cliente.
6. Registrar una cuenta empresarial.
7. Completar `/empresa/onboarding`, cargar una constancia y seleccionar un plan.
8. Enviar a validación y comprobar los estados en `companies` y `company_verifications`.
9. Confirmar que otro usuario no pueda editar ni leer documentos de esa empresa.

## Compatibilidad

No se eliminan `company_profiles`, `empresa_perfiles`, el campo heredado `profiles.role` ni las suscripciones anteriores. La unificación de datos se realizará después de medir contenido real y preparar un respaldo.

## Pendiente para considerar Fase 1 desplegada

- Ejecutar la migración en una instancia Supabase de desarrollo; el entorno local actual no incluye credenciales.
- Agregar pruebas de integración RLS con dos usuarios reales.
- Conectar la revisión de empresas al panel administrativo.
- Definir requisitos documentales exactos por tipo de empresa con asesoría jurídica/operativa.
