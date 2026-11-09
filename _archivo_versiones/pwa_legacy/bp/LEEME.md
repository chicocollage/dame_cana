# DameCañaTN · Edición Titanio Nocturno (APEX Stealth Chrono-Lab)

Aplicación independiente derivada de `DCLog` (`pwa/public/app/`) con chasis visual **APEX Stealth Chrono-Lab** (Titanio Grado 5 cepillado, carbono forjado, pulsadores 3D moleteados con acrílico ámbar translúcido, odómetros mecánicos de carga/repeticiones, holograma muscular termográfico 3D y cronógrafo con rodillo táctil).

## 1. Cómo abrir y usar
- **Apertura directa o servidor local:** Sirve esta carpeta con `python -m http.server 8090 --directory DameCañaTN` y abre `http://localhost:8090` (o abre [`index.html`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/index.html)).
- **100% compatible:** Conserva intactos el parser Note v1, historial, exportación JSON/PDF, sincronización con Drive, Comandos IA y giro 3D de indicaciones biomecánicas.

## 2. Mapa esencial de archivos
- [`index.html`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/index.html) — Interfaz principal (Inicio rápido 3×2 moleteado, bahía de cinta, sesión activa, historial y modales).
- [`styles.css`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/styles.css) — Sistema visual **Titanio Nocturno** (placas con tornillos hexagonales, pozos OLED Dot-Matrix, tambores de odómetro, horizonte láser).
- [`apex-tn-ui.js`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/apex-tn-ui.js) — Motor táctil e inyección de hologramas termográficos 3D por grupo muscular, rodillo moleteado `±15s` y bobinas de nota.
- [`checkin.html`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/checkin.html) — Ficha semanal `checkin.v1` en acabado Titanio Nocturno.
- `app.js`, `parser.js`, `technical-tools.js`, `rest-timer-tools.js`, `sync-queue.js` — Núcleo funcional idéntico a `DCLog`.

## 3. Qué NO tocar
- No alteres los nombres de atributos `data-*` ni los `id` de [`index.html`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/DameCañaTN/index.html); garantizan el contrato exacto con `app.js` y `parser.js`.
- La app original en `pwa/public/app/` permanece completamente separada e intacta.
