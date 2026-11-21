# Guía de Orquestación Multi-Modelo y Economía de Tokens — Dame Caña Android

Manual operativo para construir la app nativa maximizando calidad visual y funcional mientras reduces el consumo de cuota un **60–75 %** mediante enrutamiento entre **Flash**, **Sonnet**, **Argon** y **Opus** (reserva quirúrgica).

---

## 1. Rol de cada modelo (Principio de Especialización)

| Modelo | Coste / Cuota | Punto fuerte real | Cuándo usarlo | Prohibido usarlo para… |
|---|---|---|---|---|
| **Flash (3.8 Flash)** | Muy bajo | Velocidad, barrido de archivos, conversión mecánica de datos, tests repetitivos y comandos Gradle/ADB. | Exploración inicial, scripts de conversión JSON, portar catálogos de datos, correr tests y corregir errores de compilación obvios. | Diseñar arquitectura, resolver condiciones de carrera o diseñar UI compleja. |
| **Sonnet (Claude Sonnet)** | Medio | **Rey del código UI en Jetpack Compose**, estética editorial, animaciones fluidas, shaders AGSL y refactor limpio. | Componentes visuales Aura, tarjetas, carrusel, tema Material 3, interactividad táctil y port directo de módulos JS → Kotlin. | Barrer 20 archivos buscando un `id` o depurar bucles largos de Gradle sin acotar. |
| **Argon (Gemini 4 Argon / Pro)** | Medio-Alto | Razonamiento sistémico, contratos de datos, integración Android profunda (Room, WorkManager, NFC, AlarmManager) y auditoría de paridad. | Planificación de cada fase, esquemas Room + migraciones, cola de sincronización, permisos Android 14+ y revisión de puertas de calidad. | Tareas mecánicas de copiado o iteraciones cosméticas de 2 px en CSS/Compose. |
| **Opus (Claude Opus)** | Muy alto (Crítico) | **Cirujano de último recurso (One-Shot).** Desbloqueo de bugs profundos donde otros fallaron 2 veces o diseño de algoritmos complejos. | **Solo 3 momentos en todo el proyecto:** 1) fallo sutil de paridad en el parser Note v1, 2) condición de carrera entre `AlarmManager`/Doze/NFC, 3) matemática óptica del shader AGSL o carrusel 3D si Sonnet se atasca. | **Cualquier sesión interactiva larga**, exploración de archivos o generación de boilerplate. |

---

## 2. Mapa de Asignación Fase por Fase

| Fase del Plan | Modelo Principal | Modelo de Apoyo | Reparto exacto del trabajo para gastar el mínimo |
|---|---|---|---|
| **Fase 0: Contrato y esqueleto** | **Flash** (80 %) | **Argon** (20 %) | **Flash** extrae `tokens.json`, ejecuta `convertir_tecnica.mjs`, copia fixtures y levanta el esqueleto Gradle. **Argon** valida el `AndroidManifest.xml` y las versiones del catálogo Gradle (`libs.versions.toml`). |
| **Fase 1: Temporizador, Alarma y NFC** | **Argon** (60 %) | **Flash** (40 %) | **Argon** adapta `AlarmScheduler`, `ForegroundService`, `BootReceiver` y los `intent-filter` NFC desde `focusguard_ref/`. **Flash** porta `rest-timer-tools.js` a Kotlin, escribe los tests JUnit y ejecuta `adb install`. |
| **Fase 2: Núcleo de dominio (Parser)** | **Argon** (50 %) | **Flash** (50 %) | **Flash** genera las salidas esperadas (`contrato/salidas/*.json`) con Node y porta los catálogos estáticos (`day-templates`, `exercise-catalog`). **Argon** porta `parser.js` y `historical-parser.js` contra los Golden Tests. *(Si un caso borde falla >2 veces → 1 turno de **Opus**).* |
| **Fase 3: Persistencia (Room + JSON)** | **Argon** (70 %) | **Flash** (30 %) | **Argon** diseña entidades Room, DAOs y serializadores `training_log.v1` / `training_history.v1`. **Flash** escribe y ejecuta los tests de ida y vuelta (JSON → Room → JSON). |
| **Fase 4: Pantalla de Sesión y Tema Aura** | **Sonnet** (80 %) | **Flash** (20 %) | **Sonnet** construye el sistema de diseño Aura (`AuraTheme`), bordes de tinta de `1.8.dp`, tarjetas de serie, dock de descanso y medallón muscular. **Flash** conecta el `ViewModel` y pasa el linter. |
| **Fase 5: Inicio, Prescripción y Fichas** | **Sonnet** (60 %) | **Flash** (40 %) | **Sonnet** maqueta la pantalla de inicio, el diálogo de calentamiento y el giro 3D (`graphicsLayer { rotationY }`) de la ficha técnica. **Flash** cablea la lectura de `tecnica.json`. |
| **Fase 6: Historial y Exportación PDF/IA** | **Argon** (50 %) | **Sonnet** (50 %) | **Sonnet** maqueta la lista de historial y el modal de cierre. **Argon** escribe el generador `PdfDocument` y el exportador JSON para IA. |
| **Fase 7: Sincronización (WorkManager)** | **Argon** (80 %) | **Flash** (20 %) | **Argon** porta la máquina de estados de `sync-queue.js` a `CoroutineWorker` con OkHttp y retroceso exponencial. **Flash** escribe los tests con servidor mock. |
| **Fase 8: Check-in y Biohacks** | **Sonnet** (70 %) | **Flash** (30 %) | **Flash** extrae las 25 palancas de `biohacks.html` a un JSON limpio. **Sonnet** diseña los deslizadores táctiles del check-in y el atlas interactivo. |
| **Fase 9: Salto Gráfico (Shaders + Mapa Calor)** | **Sonnet** (75 %) | **Opus** (15 %) / **Flash** (10 %) | **Sonnet** implementa animaciones compartidas, háptica, `RenderEffect` blur y la silueta vectorial con mapa de calor. **Opus** entra **en un único prompt** solo si necesitas afinar el código AGSL del `RuntimeShader` de fluido/energía. |
| **Fase 10: Endurecimiento y Release** | **Flash** (60 %) | **Argon** (40 %) | **Argon** redacta las reglas R8/ProGuard y revisa fugas o permisos. **Flash** ejecuta `./gradlew assembleRelease` y pruebas de instalación. |

---

## 3. Las 7 Reglas de Oro para Ahorrar Tokens

1. **Una sesión = Una subtarea cerrada (Máximo 6–8 turnos):**
   El coste de tokens crece de forma cuadrática con la longitud del chat porque cada mensaje reenvía todo el historial. Al terminar una pantalla o pasar un test, **cierra sesión o ejecuta `/compact`** antes de empezar la siguiente.
2. **Exploración con Flash, Ejecución con Sonnet/Argon:**
   Nunca pagues a Sonnet o Argon para "buscar dónde está X" o "ver por qué falla Gradle". Pide a **Flash** que localice las líneas exactas o filtre el log con `Select-String -Pattern "e: |FAILURE"`, y pásale esas 15 líneas a Sonnet/Argon.
3. **Prohibido volcar logs de Gradle enteros:**
   En Windows/PowerShell, exige siempre ejecutar Gradle con `--console=plain -q` o filtrando la salida:
   `./gradlew testDebugUnitTest --console=plain 2>&1 | Select-String -Pattern "FAILED|e: |Exception" -Context 2,4`
4. **Cero Eco de Código y Lectura por Rangos:**
   Mantén activa la regla de que el agente **no imprima en el chat el código que acaba de escribir** con `write_file`/`edit_file` y que lea archivos grandes usando siempre `StartLine`/`EndLine`.
5. **UI Primero en Previews (`@Preview`), No en Emulador:**
   Con **Sonnet**, pídele que cree `@Preview` de Compose para cada componente Aura (tarjeta, chip, dock) y verifícalo con la herramienta de Compose Preview antes de compilar e instalar el APK completo. Ahorra minutos y decenas de miles de tokens en ciclos de depuración.
6. **Protocolo "Escalado a Opus en 1 Disparo" (Zero-Context Prompt):**
   Si necesitas usar **Opus**, **nunca lo actives en mitad de una conversación larga**. Abre un chat limpio o pásale únicamente estos 4 bloques (< 400 tokens de entrada):
   - *Contexto:* 3 líneas de qué hace la clase.
   - *Archivo exacto:* ruta y líneas implicadas.
   - *Fallo o requisito matemático:* el error exacto o la fórmula del shader/parser.
   - *Restricción:* "Devuelve únicamente el reemplazo exacto de la función sin explicación".
7. **Congela los datos estáticos en JSON, no en código Kotlin:**
   No dejes que ningún modelo escriba 1.800 líneas de Kotlin con textos de ejercicios o biohacks (consume miles de tokens de salida). Haz que **Flash** ejecute un script de Node/Python de 20 líneas que transforme `technical-data.js` y `exercise-catalog.js` en archivos `.json` dentro de `app/src/main/assets/`.
