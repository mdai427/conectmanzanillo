# Faro Portuario

Ecosistema digital para empresas, profesionales y proveedores de la comunidad logística-portuaria de Manzanillo, Colima.

La plataforma reúne directorio empresarial, empleo, talento, publicidad y una base modular para fletes, marketplace, capacitación, documentos, comunidad y herramientas.

## Tecnologías

- React 18, Vite, React Router, TanStack Query, Zustand y Tailwind CSS.
- Node.js 20, Express y Socket.IO.
- Supabase: PostgreSQL, Auth, Storage, Realtime y Row Level Security.
- Integraciones opcionales: Twilio Verify, Stripe y Anthropic.
- Despliegue preparado para Railway.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Proyecto Supabase para usar autenticación y persistencia real.
- Twilio únicamente si se habilita registro por SMS.

## Instalación

```bash
npm --prefix client ci
npm --prefix server ci
```

Copiar las variables de ejemplo:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

No se deben versionar archivos `.env`, credenciales, documentos empresariales ni archivos subidos por usuarios.

## Base de datos y migraciones

Las migraciones están en `supabase/migrations` y deben ejecutarse en orden numérico.

Para una instalación nueva:

1. Crear un proyecto Supabase.
2. Configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Aplicar `001_initial_schema.sql` hasta la migración más reciente.
4. Confirmar que el bucket `company-documents` sea privado.
5. Revisar las políticas RLS antes de cargar información real.

La migración `015_saas_foundations.sql` introduce el modelo SaaS canónico. Es aditiva y no elimina los modelos empresariales heredados.

## Datos de desarrollo

`supabase/seed.sql` pertenece al esquema inicial. Antes de aplicarlo, revísalo y úsalo únicamente en un proyecto local o de desarrollo.

Los datos demostrativos del cliente aparecen solo cuando faltan credenciales de Supabase y no deben mezclarse con producción.

## Desarrollo local

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

- Cliente: `http://localhost:5173`
- API: `http://localhost:3000`
- Salud: `http://localhost:3000/health`

## Validación

```bash
npm run check
```

Este comando ejecuta validación sintáctica del servidor, pruebas unitarias y build del cliente. El proyecto todavía no usa TypeScript; por ello no existe un typecheck independiente.

## Build y producción

```bash
npm run railway:build
npm start
```

Express sirve los archivos generados en `client/dist` y escucha `process.env.PORT`.

## Variables principales

| Variable | Uso | Requerida |
|---|---|---|
| `SUPABASE_URL` | API de Supabase en servidor | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones seguras del backend | Sí |
| `VITE_SUPABASE_URL` | Supabase público del cliente | Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima protegida por RLS | Sí |
| `CLIENT_URL` | Origen permitido y retornos | Sí en producción |
| `TWILIO_*` | Verificación SMS | Solo si se habilita OTP |
| `ANTHROPIC_API_KEY` | Respuestas avanzadas de Asistente Faro | Opcional |
| `STRIPE_*` | Checkout y webhooks | Opcional; no activar sin webhook |

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_*`.

## Roles y permisos

La autorización canónica usa:

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `company_members`

Los permisos se comprueban en el backend. El campo heredado `profiles.role` se conserva temporalmente para compatibilidad.

## Railway

1. Subir el repositorio a GitHub sin archivos `.env`.
2. Crear un proyecto Railway y conectar el repositorio.
3. Añadir las variables de producción.
4. Configurar un token de proyecto para GitHub Actions si se desea despliegue automático.
5. Aplicar las migraciones en Supabase antes de recibir tráfico.
6. Comprobar que `/health` responda `200`.

`railway.json` configura Railpack, instala las dependencias de cliente y servidor, compila la aplicación y valida `/health` antes de activar una versión.

## Almacenamiento y copias de seguridad

- Los documentos empresariales se guardan en Supabase Storage privado.
- Railway tiene disco efímero: no guardar archivos de usuario localmente.
- Activar backups de PostgreSQL antes del lanzamiento comercial.
- Probar restauración antes de cambios destructivos.

## Arquitectura y fases

- [Diagnóstico técnico](docs/architecture-audit.md)
- [Plan de implementación](docs/implementation-plan.md)
- [Fundamentos SaaS](docs/phase-1-foundations.md)

## Solución de problemas

- Pantalla blanca: comprobar el build del cliente y la consola del navegador.
- API no disponible: revisar `VITE_API_URL`, `CLIENT_URL` y `/health`.
- Registro SMS falla: verificar las tres variables `TWILIO_*`.
- Error de permisos: comprobar migraciones, asignación de roles y políticas RLS.
- Documentos no cargan: confirmar que `company-documents` sea privado y exista la migración 015.
- Publicidad vacía: los carruseles se ocultan si no existen campañas aprobadas y vigentes.

## Estado del producto

Faro Portuario se encuentra en construcción por fases. Fundamentos, registro empresarial y experiencia pública están implementados en código. Los flujos transaccionales completos de fletes, marketplace, mensajería, facturación y administración avanzada continúan pendientes de sus fases correspondientes.
