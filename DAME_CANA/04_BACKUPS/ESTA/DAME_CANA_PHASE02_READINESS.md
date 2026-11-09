# DAME CAÑA — Preparación de Fase 2

Estado: preparada, sin cambios funcionales ni despliegues de producción.

## Cierre del entorno de prueba

HECHO local:

- Se retiraron del árbol de trabajo los dos archivos exclusivamente temporales: `COPY_TEST_AUTH_HELPER.gs` y `Code.copy-test.gs`.
- Se conservan sin modificación los informes, el candidato de Fase 1, el original v3.2 y la evidencia en la copia de Drive.

PENDIENTE manual en el proyecto Apps Script de la copia:

1. En `Code.gs`, borrar las funciones `runCopyTestForbiddenPost`, `runCopyTestAuthenticatedPost` y `buildCopyTestAuthenticatedPayload_` que se pegaron temporalmente.
2. Guardar el proyecto de prueba.
3. En **Configuración del proyecto > Propiedades de la secuencia de comandos**, borrar solo la propiedad `GOOGLE_SYNC_SECRET` de prueba.
4. Ejecutar `validateIntegrity` una vez; debe completar sin error.

No borrar los libros de copia, la carpeta de ejecución, los JSON procesados ni las filas de prueba: son evidencia de aceptación y rollback de Fase 1.

## Hecho que bloquea la Fase 2

La PWA actual hace `POST` a Apps Script desde `public/app/sync-queue.js` sin `auth_token`. El receptor endurecido v3.3-rc1 exige `payload.auth_token` igual a `GOOGLE_SYNC_SECRET`.

Una PWA estática no puede conservar ese secreto: cualquier persona con acceso al navegador puede extraerlo. Por tanto, no se implementará la opción de incrustar el secreto en JavaScript, `localStorage`, HTML ni configuración pública.

## Decisión humana P0 necesaria

| Opción | Seguridad | Experiencia | Recomendación |
|---|---|---|---|
| A. Acceso con cuenta Google y Web App restringida | Alta | Requiere iniciar sesión con una cuenta permitida | Válida si Daniel es el único usuario. |
| B. Relé servidor a servidor con secreto privado | Alta | Transparente para la PWA | Preferida si habrá más de un dispositivo/usuario; requiere autorizar infraestructura adicional. |
| C. Secreto embebido en la PWA | Baja | Transparente | Rechazada. |

La Fase 2 no empieza hasta que se confirme A o B, el propietario del despliegue y quién puede sincronizar.

## Alcance propuesto de Fase 2, tras la decisión

P0 — Transporte autenticado y contrato rev. 2:

1. Crear un adaptador de salida en `public/app/sync-queue.js`; no cambiar las claves locales `training_log.v1`, `training_history.v1`, `checkin.v1` ni `training_active_draft.v1`.
2. Para sincronización, añadir al sobre de transporte `contract_revision: 2`, `event_id` estable, `record_id` y `updated_at` ISO. La sesión mantiene el identificador local como `record_id`.
3. Aplicar la autenticación elegida fuera de los datos persistidos locales y verificar que `auth_token` nunca llegue a la cola, al historial ni a las exportaciones.
4. Interpretar respuestas: `IMPORTED` y `DUPLICATE` confirman la cola; `STALE`, `REJECTED` y `FORBIDDEN` la dejan visible como error no reintentable; `TEMPORARY`/5xx continúa pendiente.

P1 — Compatibilidad y observabilidad:

1. Mantener importación legacy rev. 1 en Apps Script.
2. Añadir pruebas de contrato PWA para rev. 2 sin alterar la estructura de los cuatro contratos existentes.
3. Confirmar una sola vez que `checkin.v1` usa el mismo transporte y que no hay doble envío al recuperar conexión.
4. Registrar en `99_IMPORT_LOG` el evento, versión de contrato, decisión de conflicto y reintentabilidad, sin secretos.

P2 — Activación controlada:

1. Probar PWA real contra el entorno aislado con sesión nueva, duplicado, actualización, obsoleto, inválido, ejercicio no resuelto, sesión libre, fallo parcial y autenticación.
2. Crear una lista de despliegue de producción independiente; no reutilizar esta copia como producción.

## Pruebas de aceptación de Fase 2

| Caso | Resultado mínimo |
|---|---|
| Nueva sesión rev. 2 | Una sesión y sus series, estado local `synced`. |
| Reintento mismo evento | `DUPLICATE`, sin nuevas filas. |
| Misma sesión más nueva | `UPDATED`, sin duplicar series. |
| Misma sesión más antigua | `STALE`, sin sobrescritura. |
| Igual `updated_at`, hash distinto | `REJECTED`, cola conserva el detalle. |
| Token/cuenta inválidos | `FORBIDDEN`, cero escrituras. |
| Sin conexión o 5xx | Registro sigue pendiente y se puede reintentar. |
| Ejercicio no resuelto | `identity_status=UNRESOLVED`, sin inventar `exercise_id`. |
| Check-in parcial válido | Se registra sin forzar campos ausentes. |
| Recarga de PWA | Las cuatro claves locales conservan su semántica y el evento no se duplica. |

## Orden de ejecución y rollback

1. Confirmar A o B.
2. Crear una nueva copia de PWA y una nueva copia de Operativo; no reutilizar las filas de prueba de Fase 1 para aceptación final.
3. Implementar y probar el adaptador PWA primero contra esa copia.
4. Aplicar el receptor v3.3-rc1 a una copia limpia, verificar cabeceras y ejecutar la matriz completa.
5. Presentar diff, hashes y manifiesto; pedir autorización explícita antes de producción.

Rollback de Fase 2: desactivar la nueva URL/configuración de transporte en la PWA y volver al artefacto/versionado previo; la cola local conserva registros no confirmados. No borrar columnas, logs ni filas como mecanismo de rollback.
