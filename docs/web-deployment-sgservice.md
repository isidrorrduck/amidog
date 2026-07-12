# Despliegue web publico en sgservice.es

## Arquitectura elegida

La exportacion estatica de Expo se sirve directamente desde el `DocumentRoot` de
`www.sgservice.es`, conviviendo con WordPress:

- Expo genera `dist/cachorros-del-guadarrama-thor-sg-24ad4.html`; el script de
  preparacion lo copia como `dist/cachorros-del-guadarrama-thor-sg-24ad4/index.html`.
  Ese directorio se copia a
  `<DocumentRoot>/cachorros-del-guadarrama-thor-sg-24ad4/index.html`.
- `dist/_expo/` se copia a `<DocumentRoot>/_expo/`.
- `dist/assets/` se copia a `<DocumentRoot>/assets/`; contiene los PNG versionados
  de Dibaq y Santevet que referencia la experiencia.
- `dist/favicon.ico` se puede copiar a `<DocumentRoot>/favicon.ico` solo si no se
  desea conservar el favicon actual de WordPress. No es necesario para que la
  experiencia funcione.
- `deploy/public-route.htaccess` se copia como
  `<DocumentRoot>/cachorros-del-guadarrama-thor-sg-24ad4/.htaccess`.

No se copia `dist/index.html` sobre el `index.php` o el `index.html` de WordPress,
ni se reemplaza el `.htaccess` raiz de WordPress. Al existir un directorio fisico
para el slug, las reglas estandar de WordPress (`!-f` y `!-d`) no capturan la URL.

## Preparacion

1. Ejecutar `npm ci` si se parte de una copia limpia.
2. Configurar solo las variables publicas que ya necesita la aplicacion. No copiar
   `.env`, claves privadas ni secretos al hosting.
3. Ejecutar `npm run typecheck`.
4. Ejecutar `npx expo export --platform web`; la salida queda en `dist/`.
5. Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/prepare-web-deployment.ps1`.
6. Verificar que existe
   `dist/cachorros-del-guadarrama-thor-sg-24ad4/index.html` y que los recursos que
   referencia existen dentro de `dist/`.

## Primera publicacion

1. En WordPress, cambiar la pagina con slug
   `cachorros-del-guadarrama-thor-sg-24ad4` a **borrador**. No usarla como
   redireccion y no eliminarla inicialmente, para conservar una recuperacion facil.
2. En el administrador de archivos o por SFTP, localizar el `DocumentRoot` real de
   `www.sgservice.es` (normalmente `public_html/`, pero debe confirmarse).
3. Crear `<DocumentRoot>/cachorros-del-guadarrama-thor-sg-24ad4/`.
4. Copiar a ese directorio el contenido de
   `dist/cachorros-del-guadarrama-thor-sg-24ad4/`.
5. Copiar `deploy/public-route.htaccess` al mismo directorio con el nombre
   `.htaccess`.
6. Copiar `dist/_expo/` a `<DocumentRoot>/_expo/` y `dist/assets/` a
   `<DocumentRoot>/assets/`, conservando exactamente nombres y subdirectorios.
7. No modificar las reglas raiz si el `.htaccess` de WordPress contiene el patron
   estandar que excluye archivos y directorios existentes. Si usa reglas
   personalizadas, añadir antes del bloque de WordPress:

       RewriteRule ^cachorros-del-guadarrama-thor-sg-24ad4(?:/.*)?$ - [L]

8. Vaciar caches de WordPress, CDN y hosting para esa URL y `/_expo/`.
9. Abrir la URL final con barra, recargarla y probarla en una ventana privada.

## Actualizaciones

1. Generar y validar un nuevo `dist/`.
2. Hacer una copia fechada del directorio publico actual y de `/_expo/`.
3. Subir primero los nuevos assets de `dist/_expo/` sin borrar los anteriores.
4. Sustituir despues el contenido del directorio del slug, conservando su
   `.htaccess` o volviendolo a copiar.
5. Validar la URL y, solo entonces, retirar assets antiguos que ya no use ningun
   despliegue. Esta secuencia evita que el HTML apunte temporalmente a assets que
   aun no existen.

## Rollback

1. Restaurar el directorio fechado del slug.
2. Mantener o restaurar los assets `/_expo/` correspondientes a esa version.
3. Vaciar caches y comprobar URL directa y recarga.
4. Como recuperacion de emergencia, retirar o renombrar el directorio fisico y
   volver a publicar la pagina WordPress que se dejo en borrador.

## Comprobaciones que requieren el hosting

- Confirmar el `DocumentRoot` de `www.sgservice.es` y que Apache permite
  `.htaccess` (`AllowOverride`).
- Confirmar que WordPress usa reglas `!-f`/`!-d` o añadir la exclusion indicada.
- Comprobar HTTPS, cabeceras MIME, cache/CDN y permisos de lectura.
- Confirmar que no exista una redireccion canonica de WordPress para el antiguo
  slug y que el servidor respete la barra final.
