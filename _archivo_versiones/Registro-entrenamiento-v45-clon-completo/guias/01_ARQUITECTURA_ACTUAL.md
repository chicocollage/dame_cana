# Arquitectura efectiva v45

Esta guía describe el código exportado. Los traspasos v9/v22 y el README de starter son documentación histórica; no describen por sí solos el estado actual.

## Capas

La interfaz real es HTML/CSS/JavaScript sin framework en `app/public/app/`. `app/app/page.tsx` redirige la raíz a `/app/index.html`. El envoltorio Vinext/React y el Worker sirven esa interfaz en Sites. No reescribirla en React para clonar: cambiaría el comportamiento y el diseño.

| Archivo dentro de app/ | Responsabilidad |
| --- | --- |
| public/app/index.html | Pantallas, diálogos y plantilla de tarjeta |
| public/app/styles.css | Diseño DAME CAÑA, móvil y animaciones |
| public/app/app.js | Estado, eventos, renderizado, recuperación, historial y temporizador |
| public/app/parser.js + workout-note-review.js | Interpretación y revisión de notas del entrenador |
| public/app/historical-parser.js | Alta revisable de entrenamientos antiguos |
| public/app/exercise-catalog.js + day-templates.js | 55 ejercicios, personalizados y plantillas internas |
| public/app/exercise-metadata.js + history-tools.js | Identidad, comparación estricta y restauración acumulativa |
| public/app/technical-data.js + technical-tools.js | Fichas técnicas y giro del reverso; copia offline del JSON |
| public/app/json-export.js + pdf-export.js | Salida training_log.v1 / training_history.v1 y PDF |
| public/app/rest-timer-tools.js + timer-sounds.js | Reloj y sonido offline |
| public/app/sync-queue.js | Cola local y envío al endpoint externo de Apps Script |
| public/app/gem-command-tools.js | Transporte de comandos a ese servicio externo |
| public/app/checkin.html | Formulario separado checkin.v1 |
| public/app/sw.js + manifest.webmanifest | Caché offline e instalación PWA |
| build/sites-vite-plugin.ts + worker/index.ts | Integración de build y alojamiento Sites/Cloudflare |

## Flujos que deben conservarse

- Nota → revisión → sesión activa recuperable → finalizar → historial y cola de sincronización.
- Sesión en vivo → elegir ejercicio → registrar series → añadir siguiente ejercicio → finalizar.
- Al añadir un ejercicio se recupera la identidad del último registro del mismo nombre y modo con resultados previos. Las nuevas reps, cargas y RIR quedan vacías.
- Referencias: hasta tres sesiones anteriores de ese ejercicio con identidad comparable; no se limita a tres el historial completo. La comparación distingue resistencia, variante, ajustes y base de carga.
- Si una tarjeta ya abierta tiene otra identidad, la recuperación exige confirmación y conserva sus series.
- Técnica: tocar zona libre o Ver técnica → giro → ficha base, variantes y fuentes → volver o Escape. Inputs, RIR, checkboxes, sustituciones y detalles no activan el giro. Movimiento reducido elimina la transición. La cara oculta es inert.
- Las 55 fichas conservan el estado borrador. Son contenido del usuario, no una validación científica añadida por la aplicación.
- Cambios de recursos PWA: mantener APP_VERSION, CACHE, ASSETS y todos los ?v= coherentes.

Los contratos deportivos y el estado de almacenamiento se detallan en la guía de datos. El contenido de técnica se publica como copia estática; no lee el disco del usuario ni sincroniza el JSON automáticamente.
