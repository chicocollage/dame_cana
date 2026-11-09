# HANDOFF — Temporizador NFC + pulido PWA (2026-11-06)

## Estado: DESPLEGADO y funcionando (caché `damecana-aura-v25`, https://dame-cana-pwa.web.app)

## Dónde está el código
- `pwa` = enlace a `C:\Users\Daniel\Proyectos\01_biomecanica\dame-cana\pwa`. Tests: `pwa/tests/*.test.mjs` (apuntan a `public/app/`).
- 4 copias casi idénticas de la PWA: `pwa/public/app/` (FUENTE de mis cambios), `pwa/public/` (raíz), `/tn/`, `/tn3d/`. Tras editar `app/`, copiar a las otras 3 (`app.js`, `index.html`, `rest-timer-tools.js`, `sw.js`, `styles.css` ← cuidado: styles se añadió por append en las 4).
- Desplegar: `python tools/operativo.py sincronizar_app --desplegar`. Subir SIEMPRE versión de caché (`aura24→25…` en `index.html` y `sw.js` de las 4 copias).
- `DameCaña/` y `DameCañaTN/` del workspace son otras copias NO tocadas. `limpiar.html` en `pwa/public/` = página de rescate.

## Hecho
1. `rest-timer-tools.js`: `parseNfcTrigger(search)` y `parseNfcCommand(search)` (`?descanso=10..1800[&t=id]` → rest; `?accion=pausa` → toggle). Sin `URLSearchParams` (el cargador de tests no lo tiene). Tests en `rest-timer-tools.test.mjs` (pasan).
2. `app.js`: `runNfcCommand`, `startRestFromNfc` (lee la URL al cargar, limpia query, antirrebote por `t`), `initNfcTagBar` (Copiar URL, Grabar, Probar, Grabar pausa, Escuchar = Web NFC solo lectura con la app abierta + aprendizaje de UID en `localStorage.nfcLearnedTags`, Olvidar), `initAppClearCache` (borra SW + cachés, conserva localStorage).
3. `index.html`: filas `#nfcTagBar` y `#appRefreshBar` dentro de `#restTimerPanel`.
4. `manifest.webmanifest`: `launch_handler: navigate-existing`.
5. `styles.css`: panel del descanso era recortado por `#app-footer-dock .rest-dock{overflow:hidden}` (bug previo) → regla Aura que lo pone `position:static` + chips con wrap.
6. `sw.js`: navegaciones con query se cachean sin query.

## Límites conocidos
- Toque NFC no es gesto de usuario → el pitido final puede no sonar (autoplay). Pendiente: notificación o vibración reforzada.
- Etiqueta del gym (probable MIFARE Classic): Web NFC no la lee; NO escribir nunca en ella. Alternativa: NTAG215 propia.
- Web NFC (grabar/escuchar) solo Chrome Android. Con móvil bloqueado, Android pide desbloqueo.
- No se probó en dispositivo el flujo completo de Escuchar/aprender UID ni Grabar pausa.

## Pendiente (por prioridad)
1. Tests: 22 fallos PREEXISTENTES en 9 archivos (checkin-form, gem-command-tools, mobile-adjustments, phase-a-layout, phase-b-dialog-catalog, pwa-cache, rendered-html, timer-visual-contract, v37-session-flow). Son del contrato anterior a "Aura" (CSS retirado, `gem-command-tools.js` inexistente, prefijo de caché `registro-entrenamiento-v` vs `damecana-aura-v`). Actualizar al contrato Aura revisando aserción por aserción; no forzar verde. Único con valor real: `mobile-adjustments` (`.rest-dock` sin `overflow:hidden`) → arreglar de raíz en vez del rodeo.
2. Pulido visual móvil: necesita capturas/grabación del dispositivo; no tocar `id` ni `data-*` (contrato con `app.js`/`parser.js`/`sync-queue.js`).
3. Fiabilidad: audio del temporizador tras NFC, offline, notificación al terminar.
4. Duplicación de 4 copias de la PWA: valorar una sola fuente + script de copia.
