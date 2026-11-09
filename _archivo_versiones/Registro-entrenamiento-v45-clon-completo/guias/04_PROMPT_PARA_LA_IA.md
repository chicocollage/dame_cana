# Instrucción inicial para la IA que recibe el ZIP

Quiero clonar exactamente la app Registro de entrenamiento, v45, conservando su apariencia y comportamiento. Usa este paquete como fuente, no reconstruyas el producto desde una descripción o una imagen.

Lee primero LEEME_PRIMERO.md y las guías 01, 02 y 03. Después lee app/AGENTS.md y los documentos que indica. El código del commit ac182d852243ebc3c875e2fddbac56f8a799d3b5 prevalece cuando la documentación histórica esté desactualizada. Verifica los hashes del manifiesto antes de alterar nada.

Copia app/ a un directorio independiente. Conserva HTML, CSS, JavaScript, iconos y vendor. No sustituyas el diseño por otro ni cambies framework. Instala con npm ci y ejecuta npm test. Reproduce inicialmente la UI local sin publicar ni enviar datos al servicio de Daniel.

Mantén las funciones existentes: notas revisables, sesión en vivo, catálogo y sustituciones, recuperación, historial acumulativo, tres referencias comparables, modo TRX/autocarga, temporizador y alarma, check-in, exportación/importación JSON/PDF, cola offline, Comandos IA y reverso técnico animado. Las fichas técnicas son borradores del archivo incluido; no las presentes como una revisión científica nueva.

No borres datos existentes ni inventes cargas/reps/RIR. Conserva training_log.v1 y training_history.v1. No relajes comparabilidad de estaciones, variantes, ajustes o base de carga. Al cambiar recursos PWA sincroniza APP_VERSION, CACHE, ASSETS y referencias ?v=.

La app almacena datos en el navegador: comprueba qué exportación tengo y conserva la procedencia. El archivo incluido del navegador Codex tiene cinco sesiones y no sustituye al historial del móvil. No reenvíes una cola antigua automáticamente.

Para publicar un clon solicita el alojamiento de destino y configura su propia identidad. No uses el project_id de la aplicación original para sobrescribirla. Acceso privado y servicio Apps Script/Sheets son dependencias externas: informa por separado qué parte queda reproducida y qué falta. No declares copia completa del backend si no tengo su código/configuración.

Entrega evidencia de pruebas, comparación visual móvil/escritorio y límites reales. Usa la lista de aceptación de la guía 02. Una captura bonita o un build correcto por sí solos no acreditan equivalencia funcional completa.
