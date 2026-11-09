# DAME CAÑA — Resultado de autenticación desde navegador

Fecha: 2026-08-23 21:30:44 +02:00

## HECHO

- Web App de prueba abierta directamente en Chrome con la cuenta propietaria.
- Resultado directo: `ok=true`, `status=PHASE02_AUTH_PROBE`, `code=200`.
- Sesiones no autenticadas/no propietarias observadas anteriormente: acceso bloqueado con página no encontrada.
- PWA de copia servida desde `localhost` y cargada correctamente.
- GET desde la PWA a la URL `/exec`, con `credentials=include` y seguimiento de redirecciones.
- Resultado desde la PWA: `TypeError: Failed to fetch`.
- No se ejecutó ningún POST.
- No se retiró la validación `GOOGLE_SYNC_SECRET`.
- No se configuró el endpoint en la PWA candidata.
- La página temporal de prueba fue retirada, el servidor local detenido y el árbol Git quedó limpio.

## DICTAMEN

La restricción de cuenta de Google protege el endpoint, pero una PWA estática alojada en otro origen no puede leer directamente la respuesta autenticada de esta Web App en el navegador probado. La opción PWA estática → Web App `Solo yo` queda bloqueada y no autoriza retirar el token.

## SIGUIENTE DECISIÓN

Diseñar en una fase separada un relé privado servidor a servidor, con el secreto únicamente en servidor y autenticación de Daniel en el extremo público. No incrustar secretos en JavaScript, HTML, `localStorage`, cola ni exportaciones.
