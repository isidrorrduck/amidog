# Infraestructura de experiencias de cachorro

Este bloque conecta una reserva con una identidad pública permanente sin copiar los
datos de `puppies`, `clients`, `litters`, `kennels`, fotografías o documentos.

## Despliegue en Supabase

1. Aplicar `supabase/migrations/20260713120000_puppy_experience_infrastructure.sql`.
2. Configurar los secretos de la función Edge:
   - `RESEND_API_KEY`: clave del proveedor de correo.
   - `EXPERIENCE_REQUEST_FROM_EMAIL`: remitente verificado, por ejemplo
     `AmiDog <amidog@sgservice.es>`.
   - `PUBLIC_PUPPY_ORIGIN`: origen público canónico. Si se omite se usa
     `https://www.sgservice.es`.
3. Desplegar `send-experience-preparation-request` con la verificación JWT activada.
4. Configurar `EXPO_PUBLIC_PUPPY_ORIGIN` con el mismo origen al compilar la app.

Supabase aporta automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` a la función Edge. La clave de servicio nunca se expone
al cliente Expo.

## Contrato operativo

- Cada cachorro tiene exactamente una fila en `puppy_experiences`.
- `public_id` no se puede modificar; la URL y el contenido del QR se derivan de él.
- Una reserva crea exactamente una fila en `experience_preparation_requests`.
- El correo se reclama de forma atómica y usa el identificador de la reserva como
  clave de idempotencia de Resend.
- Si el envío falla, la solicitud queda en `failed` y puede reintentarse llamando de
  nuevo a la misma función con `{ "reservationId": "..." }`.
- La RPC pública no expone datos del propietario ni las notas internas del cachorro.

## Despliegue de la ruta pública

Ejecutar `npm run export:web` y `npm run prepare:puppy-route`. El segundo comando
deja `dist/public/puppies/index.html` y su `.htaccess`; se debe subir ese directorio,
además de los assets de Expo, a `<DocumentRoot>/public/puppies/`.

La regla sirve el mismo HTML para cualquier UUID sin cambiar la URL del navegador.
Si Apache no permite `.htaccess`, la regla de `deploy/public-puppies.htaccess` debe
añadirse a la configuración del host antes del bloque de WordPress.

La página existe desde el estado `preparing`; solo monta la experiencia actual
cuando el estado pasa a `published`.
