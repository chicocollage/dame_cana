# DAME CAÑA — Informe de implementación Fase 0 y Fase 1

Fecha: 23 de agosto de 2026

## Dictamen ejecutivo

**HECHO:** Fase 0 y Fase 1 están implementadas en una rama y copias aisladas. Producción no se ha modificado, no se ha publicado Apps Script y no se ha ejecutado ningún POST. El receptor candidato `DAME CAÑA v3.3-rc1` valida el esquema de forma estricta, falla cerrado ante errores de configuración, aplica idempotencia por `event_id`, resuelve conflictos por `updated_at` y hash, y restaura sesiones, series y log ante un fallo parcial.

**HECHO:** Las dos copias de Drive son verificables. Se compararon 33 de 33 pestañas y todos los valores/fórmulas preexistentes coinciden. En la copia operativa solo se añadieron las cabeceras aprobadas y se alineó la zona horaria con `Europe/Madrid`.

**PENDIENTE:** La versión desplegada real del Apps Script no pudo comprobarse desde el conector. La fuente entregada por Daniel sí queda confirmada como v3.2 por contenido y SHA-256. La sustitución y publicación deberán hacerse manualmente en una fase posterior.

## Control de cambios

- Checkout fuente: `C:\Users\Daniel\Documents\Codex\2026-08-18\registro-de-entrenamiento-sites-project-appgprj\work\audit-v17b`
- Base confirmada: `main` y `origin/main` en `6ee0a1390187754cd9d96dfdf75a2b5e40e27793`.
- Cambios previos del usuario preservados: icono de branding y `docs/ROADMAP.md`.
- Worktree aislado: `C:\Users\Daniel\Documents\Codex\2026-08-23\google-drive-plugin-google-drive-openai-2\work\dame-cana-phase01`
- Rama: `codex/dame-cana-phase01-20260823`
- Commit: `a99c5e5d2b6bd37d5a708598e9de861161bc8cde`
- Estado final del worktree: limpio.

## Copias verificadas de Drive

- [Copia operativa Fase 0/1](https://docs.google.com/spreadsheets/d/1yW-nsFqMs0T0CrboJF2ufukN1HDcnQkQNSgdMjsUXVo/edit?usp=drivesdk), revisión actual 3; revisión anterior 1.
- [Copia de catálogos Fase 0/1](https://docs.google.com/spreadsheets/d/1mmvwO1SdzFx1-_oHernKeKSJdFJ2LLXzIliaGnkQSxM/edit?usp=drivesdk), revisión 1.
- Ambas están dentro de `04_BACKUPS` (`1Itwpa-kLJCZk2yMMEFsAzGgM3DN6rl4v`).

La copia operativa usa `Europe/Madrid`. El libro de producción continúa en `America/Los_Angeles`; no se ha cambiado.

## Cambios realizados en Apps Script

Prioridad P0:

- Autenticación obligatoria con `GOOGLE_SYNC_SECRET`; una propiedad ausente o token incorrecto falla cerrado antes de abrir el libro.
- `event_id` obligatorio e idempotente, con repetición segura de resultados rechazados.
- Evidencia canónica previa en Inbox antes de un commit directo.
- Hash del registro excluye metadatos de transporte (`auth_token`, `event_id`, `exported_at`) para evitar falsos conflictos.
- Conflicto determinista: más nuevo reemplaza; más antiguo queda `STALE`; misma fecha y distinto hash queda `REJECTED`.
- Escritura atómica de sesiones/series/log y check-in/medidas/log mediante snapshot y restauración ante fallo.
- Validación exacta de pestañas, cabeceras y zona horaria.

Prioridad P1:

- Validación de `training_log.v1`, `training_history.v1` y `checkin.v1`, con compatibilidad rev. 1 y reglas estrictas rev. 2.
- Fechas reales `YYYY-MM-DD`, `updated_at` ISO-8601, booleanos literales e índices únicos.
- Sesiones programadas exigen día A/B/C y versión de programa; sesiones libres conservan el día vacío.
- Las referencias de ejercicios rev. 2 deben estar namespaced. Una referencia no resuelta no inventa `exercise_id`: queda `UNRESOLVED`.
- Eliminación del doble registro de importación y respuestas estructuradas con estado y `retryable`.

Contratos preservados:

- `training_log.v1`: aceptado por el receptor.
- `training_history.v1`: aceptado por el receptor.
- `checkin.v1`: ruta propia, sin confundirlo con otros formularios.
- `training_active_draft.v1`: permanece local-only; no se ha convertido en contrato remoto ni se ha modificado su implementación PWA.

## Archivos afectados

- `integration/apps-script/Code.gs`: candidato v3.3-rc1, SHA-256 `3315A15E3E75011342FAE4BCB7AFEFA9E771D6D7CB0A1E5F14952A2C71C0F002`.
- `integration/apps-script/Code.original.v3.2.gs`: respaldo exacto, SHA-256 `5CBC664AA8DD1D6734F6DFFE7FAB31237118E4003CED02F4003521EA3B20D204`.
- `integration/apps-script/MANUAL_APPLY.md`: orden manual y rollback.
- `integration/manifests/phase01-backup-manifest.json`: inventario verificable.
- `integration/manifests/historical-repair-proposal.json`: propuesta detenida, sin operaciones.
- `tests/apps-script-receiver.test.mjs`: pruebas del receptor.

No se modificó ningún archivo de ejecución de la PWA.

## Rangos y propiedades afectados en Drive

Solo en la copia operativa:

- `03_SESIONES!P1:V1`: `updated_at`, `payload_hash`, `event_id`, `session_type`, `template_id`, `template_revision`, `contract_revision`.
- `04_SERIES!V1:Y1`: `completed`, `source_exercise_ref`, `identity_status`, `identity_source`.
- `99_IMPORT_LOG!L1:R1`: `event_id`, `contract_revision`, `record_id`, `record_updated_at`, `action`, `previous_payload_hash`, `retryable`.
- Propiedad de libro `timeZone`: `America/Los_Angeles` → `Europe/Madrid`.

Las nuevas columnas contienen cero valores bajo la cabecera. No se modificó ninguna fórmula. La copia de catálogos no recibió cambios tras su creación.

## Pruebas ejecutadas

- Sintaxis JavaScript del candidato: **PASS**.
- Pruebas enfocadas del receptor: **9/9 PASS**.
- Build y suite completa PWA: **129/129 PASS**.
- Comparación Drive en modo fórmula: **33/33 pestañas iguales** en los rangos preexistentes; **0 diferencias**.
- Cabeceras finales de sesiones, series y log: **coincidencia exacta**.
- Formato de nuevas cabeceras: **heredado correctamente** de la cabecera anterior.

Casos cubiertos: nuevo, duplicado, actualizado, obsoleto, conflicto por misma fecha, inválido, ejercicio no resuelto, sesión libre, fallo parcial con rollback, check-in y autenticación.

**No ejecutado deliberadamente:** POST real, publicación, prueba end-to-end contra el Apps Script remoto o escritura de registros de prueba en producción.

## Reparación histórica

Se generó un manifiesto de propuesta y se detuvo la ejecución. Afectaría potencialmente a 15 sesiones, 152 series y 21 entradas de importación, pero no es seguro reconstruir `updated_at`, hashes, identidad de ejercicio, `completed`, plantilla o `event_id` sin evidencia original o confirmación humana. Operaciones ejecutadas: **0**.

## Rollback exacto

Estado actual:

- Producción: no requiere rollback porque no cambió.
- Apps Script remoto: no requiere rollback porque no se guardó ni publicó.
- Rama local: `git revert a99c5e5d2b6bd37d5a708598e9de861161bc8cde` revierte todo el commit de Fase 0/1 sin tocar el checkout fuente.
- Copia operativa: restaurar su revisión 1 revierte exactamente cabeceras y zona horaria. Alternativamente, descartarla y generar otra copia desde producción.
- Script manual futuro: reponer `Code.original.v3.2.gs` y seleccionar la implementación anterior registrada antes de publicar.

No se ha ejecutado ninguno de esos rollbacks porque las comprobaciones han pasado.

## Pendientes para Fase 2

P0:

- Confirmar manualmente versión y despliegue activos del Apps Script vinculado.
- Decidir el secreto y el canal seguro para configurarlo tanto en Script Properties como en el emisor, sin incluirlo en código o documentación.
- Preparar un proyecto Apps Script de prueba que apunte explícitamente a la copia, nunca al ID de producción, y ejecutar la validación manual sin POST.
- Aprobar el cambio de zona horaria de producción antes de instalar el receptor, porque v3.3-rc1 fallará cerrado mientras el libro siga en Los Ángeles.

P1:

- Ejecutar la matriz end-to-end sobre la copia con el código instalado manualmente.
- Resolver desajustes de comandos de máquinas, decisiones y revisiones, y reconciliar el formulario con su procesador.
- Decidir el tratamiento histórico usando el manifiesto y los JSON originales.
- Confirmar cómo la PWA emitirá `contract_revision=2`; rev. 1 sigue siendo compatible durante la transición.

P2:

- Observabilidad operativa, alertas de reintentos y panel de sincronización.
- Retirada futura de compatibilidad legacy solo después de medir su uso real.

## Recomendación

Implementar primero en Fase 2 una variante manual del Apps Script limitada por configuración a la **copia operativa**, confirmar allí `validateIntegrity` y la matriz completa sin POST, y solo después preparar el cambio coordinado de zona horaria, cabeceras, secreto y nueva versión en producción.
