# Centros operativos de Faro Portuario

## Alcance implementado

- Centro de Rutas Inteligentes y Seguridad en `/rutas-inteligentes`.
- Centro de Control Aduanal y Portuario en `/control-aduanal`.
- Torre de Control unificada en `/torre-control`.
- Separación de datos por empresa y permisos específicos.
- Evaluación determinista de configuración, peso, permisos y reglas por clase carretera.
- Bloqueo preventivo cuando una regla falta o una condición no se cumple.
- Timeline aduanal, citas portuarias, alertas y trazabilidad de fuente/confianza.
- Esquema preparado para GPS, desviaciones de ruta y horas de conducción.

## Activación

1. Aplicar `supabase/migrations/018_operational_control_centers.sql` en el proyecto Supabase.
2. Reiniciar API y cliente.
3. Registrar reglas legales desde el Centro de Rutas antes de evaluar asignaciones.
4. Conectar proveedores externos únicamente con contratos, permisos y credenciales válidas.

## Fuentes y seguridad

Toda información se clasifica como oficial autorizada, tercero, interna o captura manual. La aplicación no presenta una captura empresarial como dato oficial. Las credenciales se guardan en un gestor de secretos; la base conserva solamente una referencia al secreto.

Google Routes, Waze Partner y la autoridad aduanera quedan desactivados por defecto. Cuando no existe integración, la plataforma muestra “no configurado” o “información insuficiente”; nunca genera tráfico, incidencias, posiciones o estados aduanales ficticios.

## API principal

- `GET /api/operations/context`
- `GET|POST /api/operations/companies/:companyId/routes`
- `POST /api/operations/companies/:companyId/routes/:routeId/evaluate`
- `GET /api/operations/companies/:companyId/route-catalogs`
- `POST /api/operations/companies/:companyId/legal-rules`
- `POST /api/operations/companies/:companyId/authorized-stops`
- `GET|POST /api/operations/companies/:companyId/customs`
- `POST /api/operations/companies/:companyId/customs/:operationId/events`
- `GET|POST /api/operations/companies/:companyId/appointments`
- `GET /api/operations/companies/:companyId/tower`

## Pendiente de proveedor externo

La ruta cartográfica real, tráfico, incidentes, telemetría GPS y estados oficiales de puerto/aduana necesitan proveedores autorizados. La estructura y los estados de disponibilidad ya existen, pero no deben activarse hasta contar con esas credenciales y revisar sus condiciones legales.
