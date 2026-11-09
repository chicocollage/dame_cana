# DAME CAÑA — Informe de implementación Fase 2 (copia aislada)

Fecha: 2026-08-23

## Dictamen

La parte local y de datos de la Fase 2 está implementada y verificada en copias. Producción no se modificó ni publicó. La activación de autenticación está detenida deliberadamente hasta demostrar desde navegador que una Web App restringida a la cuenta propietaria es accesible desde la PWA y bloquea otras sesiones.

## HECHO

- Rama: `codex/dame-cana-phase02-20260823`.
- Commit base: `a99c5e5d2b6bd37d5a708598e9de861161bc8cde`.
- Commit Fase 2: `2eff136167ec35e71aebb60ae7e6c9c78973b7e2`.
- Árbol de trabajo limpio tras el commit; no se hizo `push`.
- PWA `v41` con transporte rev. 2, `event_id` estable, `record_id` y `updated_at`.
- Los contratos locales `training_log.v1`, `training_history.v1`, `checkin.v1` y `training_active_draft.v1` no cambiaron de forma incompatible.
- `checkin.v1` se guarda localmente antes de añadir el sobre de transporte.
- La cola solo confirma `IMPORTED` o `DUPLICATE`; conserva red/5xx como pendiente y bloquea reintento para `STALE`, `REJECTED` y `FORBIDDEN`.
- La PWA no contiene `auth_token` ni `GOOGLE_SYNC_SECRET`.
- El endpoint de copia está vacío por defecto; así no puede producirse un POST accidental.
- Receptor Apps Script apuntando exclusivamente a las copias de Fase 2.
- Receptor con validación estricta de sobre rev. 2 y compatibilidad con rev. 1, incluida `contract_revision: 1` explícita.
- Actualización confirmada se expresa como `status=IMPORTED`, `action=SESSION_REPLACED`, manteniendo `sessions_updated`.
- El receptor conserva temporalmente la comprobación por token: todavía no se ha reducido la seguridad.

## Archivos modificados

- `integration/apps-script/Code.gs`
- `integration/apps-script/PHASE2_MANUAL_AUTH_TEST.md`
- `integration/PHASE2_COPY_MANIFEST.md`
- `integration/PHASE2_READINESS.md`
- `public/app/sync-config.js`
- `public/app/sync-queue.js`
- `public/app/app.js`
- `public/app/index.html`
- `public/app/checkin.html`
- `public/app/sw.js`
- `tests/sync-queue.test.mjs`
- `tests/apps-script-receiver.test.mjs`
- `tests/checkin-form.test.mjs`
- `tests/rendered-html.test.mjs`

## Drive y rangos afectados

Copias privadas, `shared=false`, permiso único `owner`:

- Operativo: `1XIRU5Ffr41q76GmiuviO36HLeBuIYHV_Qf_I4rXfDlQ`.
- Catálogos: `1PiQjrS4YbedIcb5u2ZlCH8SnkEkuXbI4Lqo4JeKSsUY`.
- Carpeta de ejecución: `1x-zqi-fJoMtkVQytkuAtFde3mD60wNYe`.

Solo se escribieron cabeceras en el Operativo de copia:

- `03_SESIONES!P1:V1`: `updated_at`, `payload_hash`, `event_id`, `session_type`, `template_id`, `template_revision`, `contract_revision`.
- `04_SERIES!V1:Y1`: `completed`, `source_exercise_ref`, `identity_status`, `identity_source`.
- `99_IMPORT_LOG!L1:R1`: `event_id`, `contract_revision`, `record_id`, `record_updated_at`, `action`, `previous_payload_hash`, `retryable`.
- Zona horaria del libro: `Europe/Madrid`.

No se modificaron filas de datos ni fórmulas.

## Pruebas

- Sintaxis de `public/app/sync-queue.js`: correcta.
- Pruebas enfocadas de cola, receptor, check-in y caché: correctas.
- `npm test`: build completo correcto y `137/137` pruebas superadas.
- Casos cubiertos: nuevo, duplicado, actualización, stale, conflicto, inválido, sesión libre, ejercicio no resuelto, fallo parcial con rollback, check-in, 5xx lógico sobre HTTP 200, recarga/reintento y ausencia de endpoint.
- No se ejecutó ningún POST real.

## PENDIENTE

- Pegar manualmente el Apps Script candidato en el proyecto vinculado al Operativo de copia.
- Crear la Web App de prueba con acceso `Solo yo`.
- Verificar GET directo con la cuenta propietaria, bloqueo sin sesión/otra cuenta y `fetch` GET desde el origen de la PWA.
- Si el `fetch` autenticado falla por CORS, redirección o login HTML: detener la opción Web App directa y diseñar un relé privado.
- Solo si las tres pruebas pasan: preparar un segundo cambio en copia que retire el token y ejecutar la matriz POST completa.
- Producción seguirá pendiente de autorización expresa, validación móvil real y plan de despliegue independiente.

## Rollback exacto

Código local:

```powershell
git -C "C:\Users\Daniel\Documents\Codex\2026-08-23\google-drive-plugin-google-drive-openai-2\work\dame-cana-phase01" revert 2eff136167ec35e71aebb60ae7e6c9c78973b7e2
```

Ese comando crea un commit inverso y conserva la trazabilidad. No usar `reset --hard`.

Prueba Web App:

1. Archivar únicamente la implementación `DAME CANA FASE2 AUTH COPY 20260823`.
2. Mantener `public/app/sync-config.js` con endpoint vacío.
3. No borrar copias, logs ni evidencias.

## Integridad de los entregables

- Apps Script en la rama (CRLF): `3DFE00515D8B1A5B270902F516E81F46E41B3691EE5B2E8CBDD77317ABD07C8A`.
- Entregable Apps Script para pegar (LF): `83EC6BE50402E16E5E64B799CBE423749FA99906B8686CBB4C156DF096BEAA27`.
- Cola PWA: `649DABE16F127645E2BA8F58D8E1EAA3276D780C6F3D1390A7B534E591C6A6D6`.
- Configuración PWA: `0D38D483EB7FE5D36FBA051D63AAD5568BAEA721AC143F0BFA0A8B6FFF728683`.
