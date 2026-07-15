# Bolsa de fletes verificada

## Flujo habilitado

1. La persona crea una cuenta y registra una persona física con actividad empresarial o una persona moral.
2. Completa identidad fiscal, responsable y medios de contacto.
3. Carga el expediente legal privado.
4. Un usuario con permiso `company.verify` revisa los archivos en `/admin/verificaciones` y aprueba o solicita correcciones.
5. Una cuenta aprobada puede solicitar fletes. El teléfono y WhatsApp del publicador se revelan únicamente después de registrar ese interés.
6. Para publicar, el propietario o administrador contrata la membresía recurrente de $500 MXN al mes.
7. El webhook de Stripe activa, renueva, vence o cancela la membresía. La publicación se vuelve a validar en el servidor cada vez que se crea o reactiva.

## Expediente requerido

Persona física con actividad empresarial:

- Constancia de situación fiscal.
- Identificación oficial.
- Comprobante de domicilio fiscal.

Persona moral:

- Constancia de situación fiscal.
- Acta constitutiva.
- Identificación del representante legal.
- Comprobante de domicilio fiscal.

Los archivos viven en el bucket privado `company-documents`. El revisor recibe un enlace firmado con vigencia de cinco minutos.

## Publicación

Cada flete guarda origen, destino, fechas, carga, equipo, peso, volumen, contenedor, material peligroso y número UN, precio en MXN, indicador de IVA incluido o precio más IVA, condiciones de pago, responsable, teléfono y WhatsApp.

El catálogo público nunca consulta directamente la tabla y no entrega los campos de contacto. La API solo devuelve la ficha operativa. El contacto se entrega al solicitante después de validar nuevamente su empresa y sus documentos.

## Activación técnica

1. Aplicar las migraciones de Supabase hasta `019_freight_marketplace.sql`.
2. Configurar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `CLIENT_URL` en Railway.
3. Registrar en Stripe el endpoint `https://TU-DOMINIO/api/pagos/webhook`.
4. Suscribir el webhook a:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Ejecutar una compra de prueba y confirmar que la suscripción cambia a `activa` solamente después del pago.

El precio se crea dentro de la sesión de Checkout a partir del plan almacenado en la base. El servidor exige que el plan activo sea exactamente `freight_membership`, en MXN y por $500 mensuales.

## Seguridad

- El servidor vuelve a comprobar membresía, estado de verificación y documentos aprobados; no confía en botones ocultos del navegador.
- Los eventos de Stripe se verifican con la firma del webhook y se registran de forma idempotente.
- Los teléfonos privados no tienen política de lectura pública en Supabase.
- Una cuenta no puede solicitar su propio flete.
- Un rechazo exige instrucciones de corrección y queda en auditoría.
