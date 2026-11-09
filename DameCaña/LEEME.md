# DameCaña · Edición Oficial Aire Redondeado (Mano 3 Editorial)

Aplicación PWA canónica de registro táctil de fuerza, telemetría biomecánica 3D, check-in corporal y atlas de biohacks fisiológicos.

## 1. Cómo usar
- **Local:** `python -m http.server 8090` dentro de la carpeta de la app y abrir `http://localhost:8090`.
- **Producción (Firebase):** Desplegada como ruta principal (`/app/` y `/tn3d/`) en `dame-cana-pwa`.

## 2. Mapa esencial (Nivel único)
- `index.html` + `styles.css` + `apex-tn-ui.js` — Interfaz principal de entrenamiento 3D con ilustraciones anatómicas `Mano 3` (`assets/mano3/*.webp`), cabecera `.aire-hud`, cuaderno de nota y temporizador táctil `.aire-timer-sheet`.
- `checkin.html` — Ficha clínica semanal (`checkin.v1`) con deslizadores táctiles, ilustración reactiva de molestias y cálculo antropométrico cintura/cadera.
- `biohacks.html` — Atlas interactivo de 25 palancas fisiológicas con cronómetro en vivo y Matriz Táctica de decisión rápida.
- `app.js`, `parser.js`, `historical-parser.js`, `technical-tools.js`, `rest-timer-tools.js`, `sync-queue.js` — Motor funcional validado (parser Note v1, historial local y cola de sincronización con Google Sheets/Drive).

## 3. Qué NO tocar
- No renombrar los `id` ni atributos `data-*` de `index.html` y `checkin.html`; mantienen el contrato estricto con `app.js`, `parser.js` y `sync-queue.js`.
