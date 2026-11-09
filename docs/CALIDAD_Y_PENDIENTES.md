# Calidad del registro, resoluciones cerradas y pendientes

Actualizado: **31/10/2026**. Para conocer el número exacto de sesiones, series con repeticiones y siguiente día derivado en tiempo real, consulta siempre `python tools/operativo.py resumen` o `outputs/operativo/CONTEXTO_ENTRENADOR.json` (no usar cifras estáticas antiguas).

## 1. Higiene e invariantes del registro (`data/registro.json`)

- **Distingue fila registrada vs. serie ejecutada:** Solo las filas con repeticiones positivas (`reps > 0`) acreditan trabajo mecánico real. Permanecen en el archivo histórico filas heredadas sin desglose o previstas que se conservan como evidencia original sin rellenarse por suposición.
- **Pruebas y borradores aislados:** La sesión de prueba `TEST-SES-1786804940` y sus series se retiraron a `data/retirados/consolidacion_20261008.json`. Los borradores no finalizados (`finished != true`) no se contabilizan como sesiones ejecutadas.
- **Aclaración de fecha 08/10/2026:** El Día A exportado con marca `06/10` se ejecutó realmente el **08/10/2026** (confirmado en `data/confirmaciones_usuario.json`).
- **Reconstrucción del 01/08/2026 aclarada:** `reconstructed-2026-08-01-m4-b` y `reconstructed-2026-08-01-m4-dia-b` corresponden a la misma sesión (11 series idénticas + 1 aproximación de curl predicador `23×10 @4` conservada en notas).

## 2. Incidencias históricas cerradas (No reabrir)

Resueltas expresamente por Daniel el 10/10/2026 en [`data/conflictos_fuentes.json`](../data/conflictos_fuentes.json) (**0 conflictos abiertos**):
1. **Día extra de agosto (`msuivxba-0iepej`):** Fecha efectiva confirmada **14/08/2026** (el 15/08 del original queda como procedencia).
2. **Base de carga del 16/08 (`msvek8wz-k1lvmc__E6__S1` y `__S2`):** Peso total (`total_kg`, 18 y 14 kg), sin multiplicar por dos.
3. **RIR del 14/09 (`mu18ew6n-pil4bv__E6__S3`):** Confirmado **RIR 1**.

## 3. Límites vigentes de comparabilidad

- En buena parte de las series históricas anteriores a mediados de octubre faltan `machine_id`, ajustes finos de asiento/respaldo o `load_basis` explícito.
- La coincidencia de nombre de ejercicio **nunca** autoriza incremento automático de carga entre estaciones distintas. Confirmar estación y configuración según [`docs/REGLAS_DEL_ENTRENADOR.md`](REGLAS_DEL_ENTRENADOR.md).

## 4. Flujo de captura

Depositar el JSON exportado (`training_log.v1`) en `data/inbox_app/` y ejecutar `python tools/operativo.py actualizar`. Véase [`README.md`](../README.md) y [`docs/GUIA_APP.md`](GUIA_APP.md).

## 5. Backlog técnico pendiente en clientes PWA (TN / TN3D) — Corte 29/10/2026

1. **Bloqueo al guardar/exportar con series sin check (`Finalizar`):** En [`apex-tn-ui.js`](../pwa/public/tn3d/apex-tn-ui.js) y [`app.js`](../pwa/public/tn3d/app.js), si quedan series con repeticiones rellenas pero `entry.completed === false`, `#confirmDialog` queda oculto bajo la capa 3D/TN y el encadenado asíncrono `shareBtn.click()` -> `finishBtn.click()` puede perder el `user activation` móvil.
2. **Selector de RIR defectuoso (28/10/2026):** Fallo de despliegue/selección en algunos estados de la interfaz TN.
3. **Dock / footer inferior cortado (28/10/2026):** Recorte del primer botón en pantallas móviles sin scroll horizontal limpio.
4. **Limpieza estructural pendiente:** Purgar capas visuales heredadas antes de nueva iteración de UI.
