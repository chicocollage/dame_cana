# DAME CAÑA — Manifiesto de copia Fase 2

Fecha: 2026-08-23

## HECHO

- Rama aislada: `codex/dame-cana-phase02-20260823`.
- Base: `a99c5e5d2b6bd37d5a708598e9de861161bc8cde`.
- Producción no modificada ni publicada.
- Copias privadas owner-only creadas en la raíz privada de Drive:
  - Operativo: `1XIRU5Ffr41q76GmiuviO36HLeBuIYHV_Qf_I4rXfDlQ`.
  - Catálogos: `1PiQjrS4YbedIcb5u2ZlCH8SnkEkuXbI4Lqo4JeKSsUY`.
  - Carpeta de ejecución: `1x-zqi-fJoMtkVQytkuAtFde3mD60wNYe`.
- Solo se ampliaron cabeceras en la copia de Operativo:
  - `03_SESIONES!P1:V1`
  - `04_SERIES!V1:Y1`
  - `99_IMPORT_LOG!L1:R1`
- Zona horaria de la copia Operativo: `Europe/Madrid`.
- PWA de copia actualizada a `v41`, con endpoint de sincronización vacío por defecto.
- Receptor candidato conserva el bloqueo por `GOOGLE_SYNC_SECRET` hasta demostrar la restricción Google desde navegador.
- SHA-256 de `integration/apps-script/Code.gs`: `3DFE00515D8B1A5B270902F516E81F46E41B3691EE5B2E8CBDD77317ABD07C8A`.
- SHA-256 de `public/app/sync-queue.js`: `649DABE16F127645E2BA8F58D8E1EAA3276D780C6F3D1390A7B534E591C6A6D6`.
- `npm test`: build correcto y `137/137` pruebas superadas.

## PENDIENTE

- Demostrar manualmente el control de acceso Google y el `fetch` autenticado desde el origen de la PWA.
- No retirar el token de `doPost` hasta superar esa prueba.
- No configurar un endpoint, ejecutar POST ni desplegar producción antes de una autorización posterior.

## Rollback

- Código: descartar únicamente los cambios de esta rama y volver al commit base indicado.
- PWA: `sync-config.js` vacío impide cualquier POST de sincronización.
- Drive: no borrar las copias; retirarlas no forma parte del rollback técnico y perdería evidencia.


