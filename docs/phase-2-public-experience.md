# Fase 2 · Experiencia pública

## Resultado

La portada de Faro Portuario ahora presenta una plataforma informativa y de oportunidades para el ecosistema logístico de Manzanillo. La interfaz evita cifras simuladas y oculta los módulos dinámicos cuando no existen registros reales aprobados.

## Implementado

- Hero editorial con búsqueda por empresas, fletes, vacantes, proveedores, servicios y noticias.
- Navegación responsive de escritorio y móvil con rutas activas y menú secundario.
- Carrusel de empresas patrocinadas conectado a campañas activas y aprobadas.
- Registro separado de impresiones y clics, con incremento atómico en base de datos.
- Página comercial de publicidad sin precios ni resultados inventados.
- Solicitudes de contratación asociadas a empresas autenticadas.
- Portada sin panel operativo ficticio ni métricas de demostración.
- Contenido de empresas y vacantes únicamente cuando el backend devuelve datos reales.
- Asistente de orientación con límites explícitos y respuestas locales de respaldo.
- Páginas 403, 404 y 500, además de una barrera global ante errores de interfaz.
- Carga diferida de rutas para reducir el JavaScript inicial.
- Endpoint `/health` y configuración de Railway para verificar despliegues.
- Flujo de CI para validar servidor, pruebas y compilación antes de desplegar.

## Base de datos

- `016_public_experience.sql`: revisión de campañas, exclusión de demostraciones y métricas atómicas.
- `017_advertising_commercial_flow.sql`: planes publicitarios y solicitudes comerciales con políticas RLS.

Estas migraciones deben aplicarse después de `015_saas_foundations.sql`.

## Verificación local

- Validación de sintaxis del servidor: 24 archivos.
- Pruebas automatizadas: 4 aprobadas.
- Compilación de producción del cliente: aprobada.
- Validación de diferencias: aprobada.

## Pendiente para considerar la fase desplegada

Configurar un proyecto Supabase de desarrollo, aplicar las migraciones 015 a 017 y comprobar los flujos autorizados y denegados con cuentas aisladas de cada tipo. La ausencia de credenciales locales impide afirmar que la fase ya está desplegada, aunque el código y la compilación estén listos.
