# Dame Caña Android — App Nativa (Kotlin + Jetpack Compose)

Aplicación Android nativa funcionalmente equivalente a la PWA (`pwa_spec/`), optimizada para **Samsung Galaxy S24 Ultra (`SM-S928N`, 120 Hz, 384×832 dp)** con alarma exacta en segundo plano, NFC nativo y paridad 100 % verificada por pruebas de oro (Golden Tests).

## 1. Uso y Verificación Rápida
- **Regenerar activos técnicos y oráculo desde la PWA:**
  `node --test herramientas/convertir_tecnica.test.mjs`
- **Ejecutar pruebas de contrato Node (37/37):**
  `node --test contrato_tests/parser.test.mjs contrato_tests/rest-timer-tools.test.mjs contrato_tests/historical-parser.test.mjs contrato_tests/sync-queue.test.mjs`
- **Compilar APK y correr Golden Tests Kotlin/JVM:**
  `./gradlew.bat testDebugUnitTest assembleDebug`
- **Instalar en el Galaxy S24 Ultra:**
  `adb install -r app/build/outputs/apk/debug/app-debug.apk`

## 2. Mapa Esencial (Topología Plana ≤ 2 niveles)
- `app/` — Proyecto Android (`domain/`, `data/`, `ui/`, `system/`) y activos compilados (`src/main/assets/`).
- `contrato/` — Tokens Aura (`tokens.json`), inventario (`pantallas.md`), versión (`VERSION`) y oráculo (`salidas/`).
- `herramientas/` — Conversor idempotente JS → JSON (`convertir_tecnica.mjs`).
- `.agent/` — ADRs (`ADR.md`), perfil físico del S24 Ultra y especificaciones por fase.
- `pwa_spec/` y `contrato_tests/` — Fuente de verdad inmutable de la PWA y fixtures de referencia.

## 3. Qué NO tocar
- Prohibido alterar `pwa_spec/` o `contrato_tests/fixtures/`: son el oráculo inmutable.
- Prohibido escribir o emular tarjetas NFC de acceso al gimnasio; usar solo lectura de UID (`enableSafeReaderMode`).
