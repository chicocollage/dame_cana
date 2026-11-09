# Datos, respaldo y dependencias externas

## Almacenamiento real

No hay una base SQL activa que exportar. `.openai/hosting.json` conserva d1:null y r2:null; `db/schema.ts` está vacío. Los ejemplos D1/Drizzle son plantillas opcionales. El almacenamiento real es localStorage separado por esquema+host+puerto y por perfil/dispositivo.

| Clave | Contenido |
| --- | --- |
| registro-entrenamiento-v1 | Historial interno de sesiones |
| training_active_draft.v1 | Copia recuperable de la sesión no finalizada |
| registro-entrenamiento-nota-v1 | Texto de la nota |
| registro-entrenamiento-historico-borrador-v1 | Texto del registro histórico en preparación |
| exercise_catalog_custom.v1 | Ejercicios personalizados |
| registro-entrenamiento-feedback-v1 | Mejoras anotadas |
| training_sync_queue.v1 | Cola y estados de sincronización |
| checkin_log.v1 | Registros locales de check-in |
| registro-entrenamiento-pantalla-activa-v1 | Preferencia Wake Lock |
| registro-entrenamiento-sonido-v1 | Preferencia de sonido |
| registro-entrenamiento-sonido-perfil-v1 | Perfil de alarma |

El archivo de historial incluido se exportó con la UI de la app en el navegador integrado de Codex: cinco sesiones. No incluye borrador activo, preferencias, catálogo personalizado, check-in ni cola. No demuestra que sea el historial del móvil o el maestro de entrenamiento local de Daniel.

Para incorporar el historial de otro navegador/dispositivo: abrir Historial → Exportar historial para IA allí, conservar el JSON y usar Importar o restaurar en el nuevo origen. La fusión es por identificador y no debe borrar sesiones locales. El nuevo origen no ve automáticamente datos del antiguo.

Para un respaldo de las otras claves, el propietario puede ejecutar `herramientas/exportar_almacenamiento.js` en la consola de la app de origen. Descarga únicamente las claves enumeradas, sin cookies, credenciales ni solicitudes de red. Es un respaldo interno distinto de training_history.v1; no se importa con el botón normal. Una IA debe restaurar claves adicionales solo en un perfil nuevo o mediante una migración revisada y compatible, sin pisar datos existentes ni reenviar automáticamente eventos pendientes.

## Contratos

- training_log.v1: sesión individual; conserva identidad, prescripción y resultados por serie. Implementación autorizada: public/app/json-export.js.
- training_history.v1: contenedor de sesiones training_log.v1. Importación: public/app/history-tools.js.
- training_active_draft.v1: borrador interno independiente; no es una sesión finalizada.
- checkin.v1: formulario de check-in enviado explícitamente por el usuario.
- dame_cana_indicaciones_tecnicas.v1: fichas técnicas estáticas incluidas; versión 1.0, fecha 2026-10-11.

Vacío no es cero. No rellenar repeticiones ni RIR realizados. No representar autocarga como 0 kg. Comparar solo identidades compatibles. Consultar los fixtures y pruebas de ida/vuelta para conocer los campos exactos, sin inventar una migración de esquema.

## Google Apps Script y Sheets

El mismo endpoint está referenciado en public/app/sync-queue.js y public/app/gem-command-tools.js. La documentación histórica que dice que no existe sincronización remota es anterior a esa integración; el código actual prevalece.

Para completar una copia independiente hacen falta el proyecto de Apps Script del endpoint y las hojas/estructura que utiliza, además de la configuración de despliegue y permisos. No se encontraron archivos .gs en este repositorio ni en el workspace DAME CAÑA revisado. Esos elementos no se han inventado ni extraído de la memoria.

La integración cliente, sus payloads, manejo de errores y pruebas sí están incluidos. Conservar text/plain;charset=utf-8, event_id y la deduplicación que exijan esas implementaciones. Las cookies de Sites, permisos privados y credenciales son configuración externa que debe recrear el propietario del clon.
