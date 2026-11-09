# DAME CAÑA — Fase 2, relé privado candidato

Fecha: 2026-08-23
Estado: implementado y validado en rama aislada; no publicado; producción sin cambios.

## Dictamen

La PWA no debe llamar directamente a Apps Script ni contener `GOOGLE_SYNC_SECRET`. El candidato v42 usa este flujo:

`PWA local-first → /api/training-sync (mismo origen privado) → Apps Script de copia → Operativo de copia`.

El relé comprueba la identidad privada de Sites, limita el acceso al identificador estable de Daniel, valida origen y sobre rev. 2, y añade el secreto únicamente en memoria durante el salto servidor a servidor.

## HECHO

- Rama aislada: `codex/dame-cana-phase02-20260823`.
- Producción, Apps Script de producción, Drive histórico y despliegue actual: sin cambios.
- El proyecto Sites actual se comprobó en modo lectura:
  - propietario: Daniel;
  - acceso `custom`;
  - una sola cuenta autorizada;
  - cero visitantes externos;
  - cero grupos de Workspace o tenant.
- Sites admite variables de ejecución y secretos separados de `.openai/hosting.json` y del código cliente.
- El receptor Apps Script conserva la validación `GOOGLE_SYNC_SECRET`; no se debilitó.
- La PWA conserva `training_log.v1`, `training_history.v1`, `checkin.v1` y `training_active_draft.v1`.
- PWA/caché/recursos sincronizados como candidato `v42`.

## Archivos modificados

- `app/api/training-sync/route.ts`: obtiene identidad de Sites y valores privados de ejecución.
- `app/api/training-sync/handler.mjs`: autorización, CSRF, límite de tamaño, validación rev. 2, inyección efímera del secreto, timeout, redirección permitida y normalización de respuesta.
- `public/app/sync-config.js`: endpoint público fijo `/api/training-sync`.
- `public/app/sync-queue.js`: POST JSON al mismo origen, marcador CSRF y credenciales de mismo origen; sin `auth_token`.
- `public/app/app.js`, `index.html`, `checkin.html`, `sw.js`: versión coherente v42.
- `tests/training-sync-relay.test.mjs`, `sync-queue.test.mjs`, `checkin-form.test.mjs`, `rendered-html.test.mjs`: cobertura del relé y del versionado.

Apps Script y rangos de Sheets modificados en esta intervención: ninguno.

## Controles de seguridad

- Falla cerrado si falta configuración privada.
- Solo acepta la cuenta cuyo `oai-authenticated-user-id` coincide con el valor de servidor.
- Requiere origen exacto, `Sec-Fetch-Site` compatible y marcador de petición propio.
- Solo acepta `application/json`, máximo 256 KiB y esquemas `training_log.v1` o `checkin.v1` con revisión 2.
- Rechaza cualquier `auth_token` procedente del navegador.
- El destino Apps Script es fijo y debe ser `https://script.google.com/macros/s/.../exec`.
- Sigue únicamente la redirección de respuesta esperada a `script.googleusercontent.com`, mediante GET sin cuerpo ni secreto.
- Timeout de 15 segundos, respuestas `no-store` y sin registrar payloads o secretos.

## Pruebas ejecutadas

- Sintaxis enfocada: correcta.
- Pruebas enfocadas de cola, check-in y relé: 22/22.
- `npm test`: build correcto y 147/147 pruebas superadas.
- Lint enfocado de los archivos tocados: 0 errores; tres avisos preexistentes de variables `_` en `sync-queue.js`.
- Lint global: no es una puerta válida todavía; falla por 13 errores preexistentes en `pdf-export.js` y la copia minificada de `pdf-lib`, además de avisos heredados.
- `git diff --check`: sin errores; solo avisos de normalización LF/CRLF de Windows.

## PENDIENTE antes de una prueba real

No se ha creado ni desplegado un Site de prueba. Para mantener producción intacta hace falta autorización explícita para crear un proyecto Sites privado separado y asociarlo a esta rama.

En ese Site de prueba deberán configurarse, fuera del repositorio:

- `DAME_CANA_APP_ORIGIN`: URL exacta del Site privado de prueba.
- `DAME_CANA_ALLOWED_USER_ID`: identificador estable de la única cuenta permitida.
- `DAME_CANA_APPS_SCRIPT_URL`: URL `/exec` del Apps Script de copia.
- `DAME_CANA_SYNC_SECRET`: secreto marcado como secreto; debe coincidir con la propiedad homónima del Apps Script de copia.

No pegar el secreto en el chat, código, HTML, JavaScript, localStorage, cola, informes ni Git.

Después del despliegue privado de prueba: ejecutar en navegador autenticado los casos nuevo, duplicado, actualización, stale, rejected, ejercicio no resuelto, sesión libre, fallo temporal, check-in y cuenta no autorizada. No usar datos históricos ni producción.

## Rollback

- Código: revertir el commit del relé en esta rama; la rama base segura anterior es `2eff136167ec35e71aebb60ae7e6c9c78973b7e2`.
- PWA de prueba: volver a la versión v41 con endpoint vacío; la cola local conserva los registros no confirmados.
- Sites de prueba: retirar el despliegue de prueba o volver a su versión anterior; no tocar el Site productivo.
- Apps Script de copia: eliminar solo las cuatro variables del Site de prueba no altera Apps Script; para invalidar el puente, rotar o borrar `GOOGLE_SYNC_SECRET` en la copia.
- Drive: no borrar copias ni evidencias; no forman parte del rollback funcional.

## Condición de producción

No promover hasta que la matriz real de navegador pase sobre copias, el Site de prueba quede verificado como owner-only, los secretos estén marcados como secretos, se confirme cero datos históricos afectados y Daniel autorice explícitamente la publicación de producción.

