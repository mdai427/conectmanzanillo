# Diagnóstico técnico de Faro Portuario

Fecha: 14 de julio de 2026

## Resumen ejecutivo

El proyecto cuenta con una aplicación funcional y una base útil para validación de producto, pero antes de esta fase no tenía un núcleo SaaS consistente. La mayor deuda era la coexistencia de modelos heredados orientados a reportes portuarios con los nuevos módulos empresariales, además de autorización basada en un único campo `profiles.role`.

La Fase 1 introduce un modelo canónico aditivo. No elimina tablas ni datos anteriores; permite migrarlos gradualmente.

## Stack

- Cliente: React 18, Vite 5, React Router, TanStack Query, Zustand y Tailwind CSS.
- Servidor: Node.js 20, Express 4 y Socket.IO.
- Datos y autenticación: Supabase Auth, PostgreSQL, Storage, Realtime y RLS.
- Pagos: integración inicial con Stripe.
- Comunicaciones: Twilio Verify.
- IA: Anthropic, detrás del servidor.

## Arquitectura actual

- SPA React servida por Express en producción.
- API REST en `server/src/routes`.
- Acceso a Supabase tanto desde el cliente con clave anónima como desde el servidor con service role.
- Migraciones SQL incrementales en `supabase/migrations`.
- Procesamiento en memoria para colas, predicciones y tareas programadas.

## Autenticación y autorización

Antes de Fase 1:

- Inicio de sesión por Supabase y OTP de Twilio.
- Roles rígidos en `profiles.role`.
- Rutas administrativas protegidas principalmente con `requireRole('admin')`.
- Sin permisos granulares, membresías empresariales ni separación de funciones administrativas.

Después de Fase 1:

- Tipos de cuenta persona/empresa con actividad específica.
- RBAC con `roles`, `permissions`, `role_permissions` y `user_roles`.
- Permisos verificados en backend mediante funciones SQL.
- Membresías de empresa con propietario, administrador y colaborador.
- Compatibilidad temporal con roles heredados.

## Base de datos

Riesgo principal: existen tres representaciones empresariales (`company_profiles`, `empresa_perfiles` y ahora el modelo canónico `companies`). No se eliminan las anteriores porque contienen o pueden contener datos. Debe realizarse una migración controlada en una fase posterior.

El modelo canónico agrega:

- Tipos de cuenta.
- Empresas, miembros, documentos y verificaciones.
- Planes y límites configurables.
- Suscripciones relacionadas con plan y empresa.
- Auditoría.

## Rutas y componentes

La aplicación dispone de inicio, directorio, vacantes, talento, marketplace, fletes, actualidad, capacitación, comunidad, documentos, herramientas, publicidad y administración. Varios módulos nuevos son todavía interfaces preparadas para datos; no deben considerarse productos transaccionales hasta sus fases correspondientes.

Los archivos `Admin.jsx`, `Analitica.jsx`, `Vacantes.jsx` y `Posturas.jsx` superan un tamaño recomendable y requieren separación por dominio.

## Riesgos prioritarios encontrados

1. Modelos empresariales duplicados y vocabulario español/inglés inconsistente.
2. Autorización heredada demasiado amplia.
3. Checkout publicitario previamente accesible sin autenticación.
4. Paquetes publicitarios codificados en servidor y cliente; migrarlos a base de datos corresponde a Fase 6.
5. No existía suite de pruebas ni comando de lint.
6. No existe tipado estático.
7. Bundle principal superior a 700 kB; requiere división por rutas.
8. Algunas rutas heredadas usan `req.body` sin lista exhaustiva de campos.
9. Colas en memoria no son adecuadas para escalado horizontal.
10. El modo demostración debe permanecer separado de producción.

## Funcionalidad simulada o incompleta

- Estado operativo del puerto sin fuentes conectadas.
- Marketplace, fletes, salarios, calculadoras, comunidad, reseñas e IA como estructura visual inicial.
- Datos demostrativos en empleo y talento.
- Precios e impresiones de publicidad heredados.
- Pagos sin ciclo completo de suscripción SaaS.

## Funcionalidad faltante por fases

- Fletes, unidades, propuestas, comparador y mensajería.
- Motor de consumo de límites por cada publicación.
- Gestión completa de pagos, cupones y facturación.
- Panel administrativo por permisos.
- Moderación, privacidad, exportación y borrado.
- Pruebas integrales con una instancia de base de datos de prueba.
