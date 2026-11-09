# Traspaso técnico — Registro de entrenamiento v22

Fecha: 2026-08-12
Estado: reconciliación local completada y validada; publicación pendiente.

## Fuente canónica

Git es la fuente de control del proyecto. Sites es un despliegue derivado de un commit exacto y no debe contener cambios que no existan también en Git.

La v22 reconcilia dos líneas divergentes desde `ae66da4`:

- Sites v21: `cb84aba7a34b33431658a4eb0b735fc5a910f7c2`.
- Pulido visual local: `9c00011c6e7233aa15886c2bf92703c5826d06d9`.

La rama candidata es `codex/reconcile-v22`. El merge final debe conservar ambos commits como antecesores. Los puntos anteriores están protegidos mediante `archive/sites-v11-cb84aba7` y `archive/local-9c00011`; el árbol de trabajo previo está archivado en `codex/archive-working-tree-20260812`.

## Estado funcional

- Aplicación y caché PWA: v22.
- Producción durante la validación: Sites versión 11, commit `cb84aba7`, aplicación/caché v21.
- Base funcional conservada: recuperación de sesión activa, importación acumulativa, temporizador offline, rediseño v20, borrado individual confirmado y descansos de 15/30 segundos.
- Aporte local conservado: pulido de jerarquía, espaciado, foco, tarjetas y adaptación de escritorio de `9c00011`.
- No se han añadido funciones nuevas durante la reconciliación.

## Datos y contratos

- `training_log.v1` y `training_history.v1` permanecen sin cambios de esquema.
- Importar o restaurar continúa fusionando por ID y nunca elimina sesiones locales.
- El borrado de v21 actúa únicamente sobre la sesión elegida y exige confirmación.
- Carga externa, autocarga y TRX continúan siendo modos distintos.
- Repeticiones realizadas y RIR nunca se autorrellenan.
- La nota, el historial y los borradores continúan procesándose y almacenándose en el dispositivo.

## Versionado PWA

`APP_VERSION`, `CACHE`, las referencias `?v=` de `index.html` y la lista `ASSETS` del service worker deben usar v22 de forma conjunta. Cualquier cambio futuro en recursos cacheados debe incrementar y sincronizar esas referencias.

## Validación requerida

Antes de considerar v22 lista:

1. Confirmar que `9c00011` y `cb84aba7` son antecesores del commit final.
2. Ejecutar `npm test` con cero fallos.
3. Comprobar `git diff --check` y ausencia de marcadores de conflicto.
4. Verificar ida y vuelta de historiales legacy, carga externa, TRX y autocarga.
5. Confirmar que importación/restauración no elimina sesiones y que el borrado manual elimina solo una sesión tras confirmar.
6. Revisar localmente la interfaz móvil y el funcionamiento offline.
7. Antes de desplegar, exportar un `training_history.v1` del móvil real.
8. Tras desplegar, comprobar en el Galaxy que el historial existente sigue presente.

## Rollback

Mientras v22 no se publique, producción permanece en Sites versión 11. Si una publicación posterior falla, volver a desplegar esa versión. En Git, conservar los tags de archivo y evitar reescrituras forzadas; cualquier rollback de la reconciliación publicada debe hacerse mediante un commit de reversión.

## Pendientes reales

- Verificación acústica y de suspensión en Samsung Galaxy S24 Ultra.
- Comprobación del historial real después de actualizar la PWA.
- Publicación privada de v22 solo después de completar las validaciones anteriores.
