# Aplicación manual de DAME CAÑA v3.3-rc1

Estado: **NO APLICAR TODAVÍA EN PRODUCCIÓN**. Este paquete corresponde a Fase 0 y Fase 1 en copia aislada. No se ha publicado ni guardado código remoto.

## Archivo que sustituirá a `Code.gs`

- Candidato: `DAME_CANA_Apps_Script_v3.3-rc1_PHASE01.gs`
- SHA-256: `3315A15E3E75011342FAE4BCB7AFEFA9E771D6D7CB0A1E5F14952A2C71C0F002`
- Original conservado: `DAME_CANA_Apps_Script_v3.2_ORIGINAL_BACKUP.gs`
- SHA-256 original: `5CBC664AA8DD1D6734F6DFFE7FAB31237118E4003CED02F4003521EA3B20D204`

## Orden obligatorio cuando se autorice producción

1. Confirmar que las copias de Drive del manifiesto siguen accesibles.
2. Confirmar manualmente el número de versión/despliegue activo del proyecto Apps Script vinculado y anotarlo.
3. Cambiar la zona horaria del libro operativo a `Europe/Madrid`.
4. Añadir exactamente estas cabeceras, sin reordenar ni reescribir filas históricas:

   - `03_SESIONES!P1:V1`: `updated_at`, `payload_hash`, `event_id`, `session_type`, `template_id`, `template_revision`, `contract_revision`.
   - `04_SERIES!V1:Y1`: `completed`, `source_exercise_ref`, `identity_status`, `identity_source`.
   - `99_IMPORT_LOG!L1:R1`: `event_id`, `contract_revision`, `record_id`, `record_updated_at`, `action`, `previous_payload_hash`, `retryable`.

5. En Apps Script, crear una versión de respaldo del código vigente o copiarlo fuera del editor.
6. Sustituir manualmente solo el contenido de `Code.gs` por el candidato v3.3-rc1.
7. En **Configuración del proyecto > Propiedades de la secuencia de comandos**, crear `GOOGLE_SYNC_SECRET` con un secreto nuevo. No guardarlo en el código, Drive ni este documento.
8. Guardar sin publicar y ejecutar primero `validateIntegrity` sobre una copia. Verificar que no hay errores de zona horaria ni cabeceras.
9. Ejecutar las pruebas manuales sin POST sobre una copia. No usar el ID de producción como destino de pruebas.
10. Solo con aceptación humana, crear una versión nueva del despliegue; nunca editar la versión activa sin rollback.

## Verificación mínima antes de publicar

- La PWA sigue conservando `training_active_draft.v1`, `training_log.v1`, `training_history.v1` y `checkin.v1`.
- Un payload rev. 1 compatible se importa sin sobrescribir una sesión legacy ambigua.
- Un payload rev. 2 inválido se rechaza sin escritura parcial.
- El mismo `event_id` no vuelve a procesarse.
- Mismo `updated_at` y distinto hash produce `REJECTED`.
- `updated_at` más antiguo produce `STALE` sin escritura.
- Un ejercicio no resuelto queda con `exercise_id` vacío y `identity_status=UNRESOLVED`.
- Un fallo durante el commit restaura sesiones, series y log.
- Token ausente o incorrecto no escribe nada.

## Rollback exacto

Si el candidato solo se ha guardado y no publicado:

1. Reponer el contenido de `DAME_CANA_Apps_Script_v3.2_ORIGINAL_BACKUP.gs`.
2. Mantener el despliegue activo sin cambios.
3. No borrar las columnas añadidas hasta comprobar que no contienen datos de pruebas.

Si se hubiera publicado una versión nueva:

1. En **Implementar > Gestionar implementaciones**, seleccionar la implementación anterior registrada en el paso 2.
2. Restaurar el código original v3.2 si también se desea volver el editor al estado anterior.
3. Verificar que la URL vuelve a responder con la versión anterior antes de retirar la nueva.

Para descartar las modificaciones de la copia operativa sin tocar producción, usar su revisión 1 o crear una copia nueva desde el libro de producción. No borrar la copia actual: contiene la evidencia verificable de esta fase.
