# Inventario de Pantallas y Contratos UI (`pwa_spec/`)

1. **Inicio / Selección de Día (`#dayTemplatesBar`, `#injectTodayBtn`, `#noteInput`):**
   - Selección rápida de plantillas `Día A` a `Día E` (`plantillas_dia.json`).
   - Botón «Inyectar sesión de hoy» desde `sesion_activa.json`.
   - Importador/editor de nota `Note v1` con revisión previa (`workout-note-review.js`).
2. **Sesión Activa (`#workoutContainer`, `.exercise-card`):**
   - Cabecera de sesión (título, fecha, progreso de series, acceso a calentamiento `#warmupBtn`).
   - Carrusel/lista de ejercicios con medallón anatómico (`assets/mano3/*.webp`), variante, ajustes de máquina (`settings`), base de carga (`total_kg`, `per_side_kg`, `added_kg`, `bodyweight`, `trx`) y referencia histórica.
   - Tabla de series: `carga` (`kg`), `reps`, selector `RIR` (`0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3+`, `F`), añadir/quitar serie y notas de ejercicio.
3. **Ficha Técnica Reverso (`technical-data.js` / `tecnica.json`):**
   - Giro 3D de tarjeta: configuración base, objetivo biomecánico, variantes de ángulos/sensaciones y respaldo científico.
4. **Dock de Descanso y Panel NFC (`#app-footer-dock`, `#restTimerPanel`, `#nfcTagBar`):**
   - Reloj tabular fijo, anillo de fase, botones `-15s`, `Pausa/Reanudar`, `+15s`, presets (`60s`, `90s`, `120s`, `180s`, `240s`).
   - Barra NFC: grabar URL (`?descanso=N`, `?accion=pausa`), aprender UID de etiqueta en solo lectura (`enableReaderMode`).
5. **Diálogo de Calentamiento y Catálogo de Sustitución (`exercise-catalog.js`):**
   - Protocolo de aproximación por día y buscador de ejercicios equivalentes por grupo muscular.
6. **Cierre de Sesión, Historial y Sincronización (`#historyList`, `json-export.js`, `sync-queue.js`):**
   - Exportación JSON (`training_log.v1`, `training_history.v1`), payload compacto para IA, exportación PDF y cola de sincronización con Google Apps Script (`Codigo.gs`).
7. **Check-in Semanal (`checkin.html`) y Atlas de Biohacks (`biohacks.html`):**
   - Formulario `checkin.v1` (deslizadores de biofeedback, mapa de molestias, perímetros cintura/cadera) y 25 palancas de biohacks con cronómetro.
