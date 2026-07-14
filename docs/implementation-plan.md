# Plan de implementación

## Fase 1 · Fundamentos

Tipos de cuenta, RBAC, empresas, membresías, documentos privados, verificación, planes, límites y auditoría. Estado: implementado en código; requiere aplicar migración y validar contra un proyecto Supabase de desarrollo.

## Fase 2 · Navegación y portada

Menú responsive, acciones contextuales por permisos, carrusel administrable, contenido dinámico y eliminación de datos simulados en la experiencia pública. Estado: implementado en código. Incluye portada editorial, búsqueda por vertical, navegación móvil, campañas patrocinadas aprobadas, contratación publicitaria por solicitud, páginas de error, carga diferida y healthcheck de despliegue. Requiere aplicar las migraciones 016 y 017 para validar campañas y solicitudes contra Supabase.

## Fase 3 · Fletes

Cargas, unidades, propuestas, comparador, estados, historial, mensajería y notificaciones. La publicación se habilitará únicamente para empresas verificadas.

## Fase 4 · Empresas y directorio

Unificar los tres modelos empresariales, migrar datos, ampliar filtros, sucursales, reseñas verificadas y leads.

## Fase 5 · Suscripciones

Checkout SaaS, precios desde base de datos, Stripe/Mercado Pago mediante adaptadores, webhooks idempotentes, cupones, facturas, reintentos y periodos de gracia.

## Fase 6 · Publicidad avanzada

La base comercial, los planes, las solicitudes, los creativos aprobados, las impresiones y los clics quedaron iniciados en Fase 2. Esta fase completará segmentación avanzada, límites de frecuencia por usuario, cobro, facturación, reportes empresariales y administración visual integral.

## Fase 7 · Administración

Panel lateral independiente con vistas restringidas por permiso, validaciones, pagos, moderación, logs e integraciones.

## Fase 8 · Marketplace, empleo y comunidad

Publicaciones transaccionales, candidaturas, favoritos, conversaciones, reportes y reputación.

## Fase 9 · Seguridad, SEO y pruebas

Hardening, CSP, CSRF según arquitectura final, pruebas E2E, accesibilidad, datos estructurados, sitemap con dominio confirmado, rendimiento y auditoría final.

## Criterio de avance

Una fase no se considera desplegada solo porque compile. Debe contar con migración aplicada, variables configuradas, pruebas sobre datos aislados, revisión de RLS y validación de los flujos autorizados y denegados.
