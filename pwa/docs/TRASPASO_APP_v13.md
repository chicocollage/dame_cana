# Traspaso técnico — Registro de entrenamiento v13

Fecha: 2026-08-02
Estado: código validado y versión 5 publicada de forma privada en Sites.

## Punto de partida

Leer completamente, antes de modificar:

1. `TRASPASO_APP_v9.md`, que conserva la arquitectura y los contratos base.
2. `ROADMAP.md`, que contiene el estado y los pendientes actuales.
3. `CONTEXTO_PRODUCTO_ENTRENADOR.md`, que separa las responsabilidades de la app y del entrenador.
4. `CHANGELOG.md`, que registra las versiones v10–v13.

Después, comprobar el código, `git status` y `npm test`. El código y las pruebas prevalecen si un documento ha quedado desactualizado.

## Estado funcional v13

- La nota del entrenador crea sesiones sin autorrellenar resultados realizados.
- El historial se guarda localmente y se importa mediante fusión, sin borrar sesiones locales.
- Se conservan los contratos `training_log.v1` y `training_history.v1`.
- Carga externa, autocarga y TRX siguen siendo modos distintos y solo se comparan identidades compatibles.
- El temporizador usa un dock fijo, una marea de color descendente, controles de una mano y tres alarmas Web Audio sin conexión.
- Los comentarios de fricción usan el esquema local separado `app_feedback.v1` y pueden exportarse.
- Los entrenamientos antiguos se añaden desde texto mediante `historical-parser.js`, se revisan antes de guardar y nunca reemplazan sesiones por coincidencia de fecha o título.

## Archivos añadidos desde v9

- `public/app/feedback-tools.js`: normalización y exportación de comentarios de uso.
- `public/app/rest-timer-tools.js`: cálculo puro de estados del temporizador.
- `public/app/timer-sounds.js`: planes y reproducción de alarmas.
- `public/app/historical-parser.js`: interpretación estricta de sesiones antiguas.
- `tests/fixtures/`: contratos y casos legacy/adaptativos.
- Pruebas específicas de feedback, temporizador, sonidos, texto histórico, caché PWA y guardas de seguridad.

## Invariantes reforzadas

- Una clave de historial presente pero ilegible bloquea persistencia, restauración y alta histórica; nunca se interpreta como historial vacío.
- Un borrador histórico vive fuera del guardado normal hasta la confirmación final.
- Cambiar el modo de resistencia no deja carga o dificultad incompatible oculta: se pide confirmación antes de limpiar.
- Repeticiones y RIR vacíos continúan vacíos.
- La entrada histórica solo infiere carga externa si existe una carga explícita; en casos ambiguos exige `Modo`.
- Cada cambio de recursos de la PWA debe actualizar de forma coordinada `APP_VERSION`, parámetros `?v=`, `CACHE` y `ASSETS`.

## Validación conocida

- `npm test`: construcción y 54 pruebas automatizadas superadas en v13 antes de publicación.
- ESLint de las pruebas: correcto.
- Sintaxis de los módulos nuevos y `app.js`: correcta.

La aceptación definitiva aún requiere un Samsung Galaxy S24 Ultra real para valorar teclado, TalkBack, áreas seguras, contraste de la marea, volumen de los tres sonidos, Bluetooth y comportamiento de Android en segundo plano. El temporizador recalcula la hora al volver, pero no persiste si Android mata por completo la PWA; esa mejora sigue en el roadmap.

## Publicación

Publicación v13 verificada el 2026-08-02:

- URL: `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`
- Sites: versión 5, despliegue completado correctamente.
- Código de aplicación publicado: commit `3790a4d0f1e3310087287c941a4ae8c7e28ab4d7`.

El proyecto usa Sites y `.openai/hosting.json`. Para una versión publicable:

1. Ejecutar `npm test` sobre el commit exacto.
2. Confirmar que la caché PWA coincide con la versión.
3. Publicar mediante las skills `sites-building` y `sites-hosting`.
4. Verificar la versión desplegada y la ruta `/app/`.
5. Registrar el resultado en `CHANGELOG.md` y `ROADMAP.md` cuando cambien el comportamiento, los contratos o las prioridades.
