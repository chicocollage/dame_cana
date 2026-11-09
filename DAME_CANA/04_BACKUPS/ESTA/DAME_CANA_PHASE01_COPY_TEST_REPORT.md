# DAME CAÑA — Prueba de receptor en copia aislada

Fecha: 23 de agosto de 2026

## Alcance

Prueba manual del candidato `DAME CAÑA v3.3-rc1-copy-test` contra una copia del libro operativo. No se realizó ningún POST, publicación, despliegue ni cambio en producción.

- Libro de prueba: `DAME_CANA_OPERATIVO_v3_PHASE01_COPY_20260823_153412` (`1yW-nsFqMs0T0CrboJF2ufukN1HDcnQkQNSgdMjsUXVo`).
- Zona horaria comprobada: `Europe/Madrid`.
- Carpeta de ejecución aislada: `DAME_CANA_PHASE01_RUNTIME_TEST_20260823` (`1XVFeaU3wZL8q11BfgFBvAqNcMwWwUSYU`).
- Script de prueba: `DAME_CANA_Apps_Script_v3.3-rc1_COPY_TEST.gs`.

## Resultados confirmados

| Caso | Evento | Resultado observado |
|---|---|---|
| Validación estructural | `validateIntegrity` | OK, sin error de cabeceras ni zona horaria. |
| Inserción nueva | `phase01-copy-scan-001` | `IMPORTED`; una sesión, una serie y una entrada de log. |
| Ejercicio no resuelto | inserción nueva | `exercise_id` vacío, `source_exercise_ref=test:phase01-exercise`, `identity_status=UNRESOLVED`. |
| Evento duplicado | mismo `event_id` | Sin filas nuevas: permanece una sesión, una serie y un único log del evento original. |
| Revisión más nueva | `phase01-copy-update-002` | `UPDATED`; se reemplazó la misma sesión, sin duplicarla. Serie final: 1 kg × 2, RIR 9. |
| Revisión antigua | `phase01-copy-stale-003` | `STALE`, acción `IGNORED_OLDER`; no sobrescribió la revisión nueva. |
| Token incorrecto directo | `runCopyTestForbiddenPost` | `FORBIDDEN`, `ok=false`, `retryable=false`, sin escritura. |
| `doPost(e)` autenticado directo | `phase01-copy-auth-f238a15d-81f6-4d3e-83e3-52546645e027` | `IMPORTED`, una sesión, una serie, log y evidencia canónica en procesados. |

## Evidencia final en la copia

- `03_SESIONES!A17:V17`: única sesión de prueba `TEST-PHASE01-001`, `updated_at=2026-08-23T16:00:00.000Z`.
- `04_SERIES!A154:Y154`: única serie de prueba `TEST-PHASE01-001__E1__S1`, carga 1, repeticiones 2, RIR 9.
- `99_IMPORT_LOG!A24:R26`: secuencia `IMPORTED`, `UPDATED`, `STALE`.
- `03_SESIONES!A18:V18`: sesión autenticada `TEST-AUTH-phase01-copy-auth-f238a15d-81f6-4d3e-83e3-52546645e027`.
- `04_SERIES!A155:Y155`: serie autenticada única, 1 kg × 1, RIR 10.
- `99_IMPORT_LOG!A27:R27`: `IMPORTED` para el evento autenticado.
- `02_JSON_PROCESADOS`: evidencia `DIRECT_SYNC_20260823_183323_phase01-copy-auth-f238a15d-81f6-4d3e-83e3-52546645e027.json`.
- Los tres JSON de prueba quedaron movidos a `02_JSON_PROCESADOS`.

## No probado deliberadamente

- Llamada HTTP a una URL de endpoint web desplegada.
- Publicación de endpoint web.
- Migración o corrección de datos históricos.
- Producción.

## Siguiente decisión humana

La autenticación interna de `doPost(e)` queda validada. Para probar una llamada HTTP real faltaría desplegar una URL web de prueba; eso expone una superficie nueva y requiere autorización explícita independiente.

El siguiente paso recomendado es retirar el helper temporal y el secreto de prueba cuando ya no se necesiten, o autorizar explícitamente un despliegue web restringido a la copia si se desea validar el transporte HTTP completo antes de considerar producción.
