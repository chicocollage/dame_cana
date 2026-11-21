# Plan de desarrollo — Dame Caña Android (nativa, paralela a la PWA)

> Documento autocontenido para entregar a otra IA. Estado de partida verificado el 2026-11-07. Todo lo que dice "PWA" se refiere a `pwa_spec/` (fuente de verdad del contrato).

## 0. Resumen ejecutivo

| | |
|---|---|
| Objetivo | App Android nativa (Kotlin + Jetpack Compose) funcionalmente equivalente a la PWA, con alarma exacta, NFC nativo y mejor apariencia/movimiento. |
| Estrategia | **PWA = especificación.** Contrato compartido (fixtures, tokens, esquemas) + pruebas de oro entre implementaciones. Cortes verticales ejecutables. |
| Compatibilidad de datos | Mismo JSON (`training_log.v1`, `training_history.v1`) en ambas apps → uso en paralelo y migración sin pérdida. |
| Ciclo | Spec → tests en rojo → implementación → verificación (unit + oro + captura + dispositivo) → puerta de calidad → uso real (dogfooding) → retro. Caja de tiempo 1–2 semanas por fase. |
| Fases | 0 Contrato · 1 Temporizador/alarma/NFC · 2 Núcleo de dominio · 3 Persistencia e intercambio · 4 Sesión + tema Aura · 5 Inicio/prescripción/fichas · 6 Historial y exportación · 7 Sincronización · 8 Check-in y biohacks · 9 Mejora gráfica · 10 Endurecimiento y lanzamiento |
| Fuera de alcance | iOS, Wear, tablets, reescribir la PWA, tocar `data/*.json` canónicos del proyecto Python. |

## 1. Hechos verificados (no asumir lo contrario)

**PWA (origen del contrato)**
- JS vanilla. Líneas: `app.js` 1984, `apex-tn-ui.js` 1123, `technical-data.js` 1887, `exercise-catalog.js` 527, `parser.js` 357, `historical-parser.js` 343, `sync-queue.js` 271, `workout-note-review.js` 265, `technical-tools.js` 230, `json-export.js` 174, `pdf-export.js` 165, `history-tools.js` 156, `rest-timer-tools.js` 104, `feedback-tools.js` 100, `timer-sounds.js` 108.
- Esquemas de salida: `training_log.v1`, `training_history.v1` (`json-export.js`).
- Fixtures: `contrato_tests/fixtures/` (`workout-note-v1/`, `fixture-training-log-*.v1.json`, `fixture-training-history-mixed.v1.json`).
- Tokens Aura (`styles.css`): `--aire-stone #DAD7CD`, `--aire-paper #E9E8E1`, `--aire-input #F5F4EF`, `--aire-ink #16181C`, `--aire-ink-soft #585954`, `--aire-ink-faint #B2B0A8`, `--aire-lime #CCFF00`, `--aire-orange #EB4818`, `--aire-cyan-pill #DDE7E5`. Bordes de tinta ~1.6–1.8 px, radios 18 px, fuente mono para etiquetas.
- Sincronización: Google Apps Script (`contrato_tests/Codigo.gs`) → Sheets/Drive; cola con reintentos (`sync-queue.js`).
- Contrato NFC ya en producción (etiquetas físicas grabadas): URL `https://dame-cana-pwa.web.app/...?descanso=N[&t=id]` y `?accion=pausa[&t=id]`; N entero 10–1800 (`rest-timer-tools.js: parseNfcCommand`). Aprendizaje de UID en `localStorage.nfcLearnedTags`.
- Hosting: Firebase `dame-cana-pwa`, rutas `/`, `/app/`, `/tn/`, `/tn3d/` (copias casi idénticas).

**Base reutilizable de Android** (`focusguard_ref/`, Kotlin + Compose)
- `AlarmScheduler.kt`, `AlarmReceiver.kt`, `AlarmService.kt`, `AlarmActivity.kt`, `BootReceiver.kt`, `NfcWriter.kt`, `TimerRepository.kt`, `theme/{Color,Theme,Type}.kt`, tests `MainScreenViewModelTest.kt`, `MainScreenTest.kt`.
- Lección ya aprendida: el instalador falló con `INSTALL_PARSE_FAILED_NOT_APK` y se resolvió reiniciando el daemon de adb; el proyecto se prueba con `adb install` vía Android Studio.

**Restricciones del usuario (Danié)**
- Topología de carpetas plana (máx. 2 niveles); un único `LEEME.md` ≤ 40 líneas; notas internas solo en `.agent/`; antes de crear árboles, proponer esquema ≤ 10 líneas y esperar validación.
- No hacer reescrituras estructurales innecesarias del parser validado (93/93 en el proyecto de entrenamiento; en la PWA, `tests/parser.test.mjs`).
- Prioridad a verificación (tests, contratos, casos límite) antes de ampliar arquitectura.
- Nunca escribir en tarjetas de acceso del gimnasio ni emularlas; solo leer UID si el usuario lo pide.

## 2. Decisiones de arquitectura (ADR iniciales)

| # | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| ADR-1 | Kotlin + Compose + Material 3 como base, tema propio Aura | Equivale a lo que ya se domina; movimiento a 60/120 fps | Flutter/RN: otro stack sin ventaja de plataforma |
| ADR-2 | Un solo módulo Gradle `app`, paquetes planos (`domain`, `data`, `ui`, `system`) | Regla de topología plana | Multimódulo prematuro |
| ADR-3 | Lógica pura (parser, reglas, temporizador) en paquete `domain` **sin dependencias de Android** | Testeable en JVM puro y con las pruebas de oro | Lógica mezclada en ViewModels |
| ADR-4 | Persistencia en **Room** + adaptadores JSON canónicos (kotlinx.serialization) | Consultas de historial y mapa de calor; exportación idéntica a la PWA | Solo ficheros JSON (lento para consultas) |
| ADR-5 | `minSdk 26`, `targetSdk` y `compileSdk` = última estable (**consultar versiones actuales en la documentación oficial; no inventar números**) | Cobertura amplia; AGSL (Android 13+) con respaldo | minSdk 33 (excluye móviles antiguos) |
| ADR-6 | Alarma: `AlarmManager.setAlarmClock()` o `setExactAndAllowWhileIdle` + servicio en primer plano + notificación con intent de pantalla completa | Ya validado en FocusGuard | `WorkManager` (no exacto) |
| ADR-7 | NFC: App Links verificados + `NDEF_DISCOVERED` para las URLs existentes; lectura de UID con `enableReaderMode` en primer plano | Las etiquetas ya grabadas abren la app nativa sin regrabar | Solo `TAG_DISCOVERED` (conflicto con otras apps) |
| ADR-8 | Sincronización con `WorkManager` + misma cola/semántica que `sync-queue.js` | Reintentos fiables en segundo plano | Hilo propio |
| ADR-9 | Datos técnicos (`technical-data.js`, 1887 líneas) convertidos **una vez** a JSON en `assets/` por script reproducible | Una sola fuente, sin portar JS a mano | Copiar a Kotlin a mano |

## 3. Esquema de repositorio propuesto (validar antes de crear)

```
dame-cana-android/
  LEEME.md        qué es, cómo se usa, qué NO tocar (<= 40 líneas)
  contrato/       fixtures de la PWA, tokens, inventario de pantallas, esquemas JSON
  app/            proyecto Android (Compose), paquetes planos
  herramientas/   scripts de conversión y de comprobación (python/node)
  .agent/         notas, ADR, planes y telemetría de agentes
```
Test de eliminación: `contrato/` sin él no hay pruebas de oro; `herramientas/` sin él no hay conversión reproducible de `technical-data`; `.agent/` mantiene la raíz limpia.

## 4. Ciclo de desarrollo (aplicable a cada fase)

1. **Spec corta (≤ 1 página)** en `.agent/fase-N.md`: alcance, criterios de aceptación medibles, casos límite, riesgos.
2. **Pruebas primero:** escribir las pruebas (unitarias y de oro) en rojo. Para UI, capturas de referencia de la PWA en `contrato/`.
3. **Implementación mínima** hasta verde. Sin refactors fuera de alcance.
4. **Verificación en 4 niveles:** unitarias JVM → pruebas de oro (Kotlin vs fixtures) → capturas Compose con tolerancia → dispositivo real (checklist de la fase).
5. **Puerta de calidad** (todo obligatorio): build `assembleDebug` y `assembleRelease` limpios, lint sin errores nuevos, 100 % de las pruebas de la fase, sin `TODO` sin issue, sin permisos añadidos sin justificar en ADR.
6. **Dogfooding:** usar la fase en un entrenamiento real; anotar fricción en `.agent/diario.md`.
7. **Retro de 10 líneas** y ajuste del plan. Si una fase supera su caja de tiempo ×1,5, parar y re-dimensionar.

**Reglas transversales**
- Rama principal siempre instalable. Commits atómicos; mensaje `fase-N: qué y por qué`.
- Interruptores de funcionalidad (`BuildConfig`/DataStore) para lo experimental.
- Cada dato desconocido es `null`, nunca 0 (convención del proyecto: blancos = pendiente).
- Ningún `id` de contrato se renombra sin actualizar `contrato/`.

## 5. Fases

### Fase 0 — Contrato y esqueleto (1 semana)
**Entregables**
- Repositorio según §3; `LEEME.md`; `.agent/ADR.md` con las 9 decisiones.
- `contrato/`: copia de fixtures y esquemas de `training_log.v1`, `training_history.v1`; `tokens.json` con los colores/radios/bordes/tipografías de §1; `pantallas.md` con inventario (Inicio, Sesión, Nota/borrador, Historial, Check-in, Biohacks, Fichas técnicas, Calentamiento, Cierre de sesión, Panel de descanso) extraído de `index.html` y `apex-tn-ui.js`; capturas de referencia de la PWA (las que aporte el usuario).
- Proyecto Android que compila con tema Aura vacío y una pantalla de prueba.
- `herramientas/convertir_tecnica.mjs`: convierte `technical-data.js` a `assets/tecnica.json` y comprueba el recuento de ejercicios.

**Aceptación:** `./gradlew assembleDebug` verde; script de conversión idempotente con prueba; contrato versionado (`contrato/VERSION`).
**Riesgo:** inventario incompleto → mitigar leyendo `index.html` y listando cada `id`/`data-*`.

### Fase 1 — Temporizador, alarma y NFC (1–2 semanas)
Reutilizar FocusGuard. **Requisitos técnicos:**
- Manifiesto: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` (con comprobación `canScheduleExactAlarms()` y envío a `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`), `USE_FULL_SCREEN_INTENT` (en Android 14, comprobar `canUseFullScreenIntent()`), `FOREGROUND_SERVICE` + tipo de servicio declarado según la versión, `WAKE_LOCK`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `NFC` y `uses-feature nfc required="false"`.
- Servicio de alarma con `AudioAttributes.USAGE_ALARM`; canal `IMPORTANCE_HIGH` categoría `ALARM`; notificación persistente con acciones **Pausa/Reanudar, −15, +15** y progreso.
- Lógica del temporizador en `domain` portando `rest-timer-tools.js` (`snapshot`, `adjust`, `extend`, `pausedSeconds`) con **los mismos casos** que `rest-timer-tools.test.mjs`.
- Reprogramar en `BootReceiver`; sobrevivir a muerte del proceso (estado en DataStore: `endsAt`, `remaining`, `total`).
- NFC: filtros `NDEF_DISCOVERED` con App Links (`autoVerify`) para `dame-cana-pwa.web.app` (rutas `/`, `/app`, `/tn`, `/tn3d`); publicar `/.well-known/assetlinks.json` en Firebase con la huella SHA-256 de la firma. Parser del contrato `?descanso=N` y `?accion=pausa` (idéntico a `parseNfcCommand`: 10–1800, `t` antirrebote). Modo "aprender etiqueta" con `NfcAdapter.enableReaderMode` guardando UID (solo lectura).
- Escritura de etiquetas NTAG con `Ndef.writeNdefMessage`, URL del contrato.
**Aceptación (dispositivo):** descanso 30 s con móvil bloqueado suena con alarma del sistema; +15/−15/pausa desde la notificación; etiqueta existente grabada para la PWA abre la app nativa y arranca; reinicio del móvil conserva la alarma; sin duplicados al tocar 3 veces seguidas.
**Riesgos:** ROM que mata servicios (documentar ajustes de batería); verificación de App Links (probar `adb shell pm get-app-links`).

### Fase 2 — Núcleo de dominio (2 semanas)
- Portar a Kotlin puro (`domain`): `parser.js` (Note v1), `historical-parser.js`, `day-templates.js`, `exercise-catalog.js`, `exercise-metadata.js`, `history-tools.js`, `feedback-tools.js`, `workout-note-review.js`.
- **Método:** por cada módulo, ejecutar los fixtures de la PWA en Node para generar salidas esperadas (`contrato/salidas/*.json`) y escribir el test Kotlin que compara estructura por estructura. Test falla = port incorrecto, nunca "ajustar el fixture".
- Prohibido "mejorar" el parser durante el port; cualquier mejora va a una fase posterior con decisión registrada.
**Aceptación:** paridad 100 % en fixtures; cobertura de ramas de errores; desconocidos = `null`.

### Fase 3 — Persistencia e intercambio (1–2 semanas)
- Room: sesiones, ejercicios, series, historial, cola de sincronización, etiquetas NFC aprendidas, ajustes.
- Adaptadores JSON ⇄ Room para `training_log.v1` y `training_history.v1`; importación de exportaciones reales de la PWA; **ida y vuelta sin pérdida** (PWA → Android → PWA).
- Migraciones Room versionadas y probadas; copia de seguridad a Documentos por SAF.
**Aceptación:** prueba de ida y vuelta con todos los fixtures; migración probada con base de datos de ejemplo; importar un historial real no altera ni un campo.

### Fase 4 — Pantalla de sesión y tema Aura (2–3 semanas)
- Tema (`ui`): colores/tipografías desde `tokens.json`; bordes de tinta 1,8 px; radios 18 dp; chips y botones del dock.
- Pantalla de sesión: tarjeta de ejercicio (series, kg, reps, RIR con selector, "Añadir serie"), dock de descanso con reloj de ancho fijo y cifras tabulares, panel de ajustes, medallón muscular (72 dp, `BlendMode.Multiply`, borde de tinta).
- Carrusel de ejercicios con paginación y flip de ficha técnica (`graphicsLayer` `rotationY`, `cameraDistance`); versión simple primero, 3D final en Fase 9.
- Accesibilidad: contraste ≥ 4,5:1 (7:1 en bloques oscuros de "Variantes y sensaciones"), tamaños táctiles ≥ 48 dp, descripciones de contenido.
**Aceptación:** capturas con tolerancia acordada frente a la PWA; flujo completo de una sesión real; sin saltos de fotogramas apreciables.

### Fase 5 — Inicio, prescripción y fichas (1–2 semanas)
- Inicio: elegir Día A–E, "Inyectar sesión de hoy" desde `sesion_activa.json`, sesión en vivo.
- Importación de la prescripción (formato Note v1 y `sesion_activa.json`); hoja de calentamiento por día (resolver el bug de contraste de título; texto oscuro sobre fondo claro).
- Fichas técnicas desde `tecnica.json` con coincidencia de nombre/variante igual a `technical-tools.js` (`find`).
**Aceptación:** misma ficha que la PWA para cada ejercicio del catálogo; calentamiento correcto para A–E.

### Fase 6 — Historial y exportación (1–2 semanas)
- Historial con filtros; borrar/editar; importar histórico antiguo.
- Exportar JSON, "para IA" (payload equivalente a `json-export.js`) y PDF (`PdfDocument`), con el mismo contenido.
**Aceptación:** exportaciones equivalentes (comparación por esquema) a las de la PWA.

### Fase 7 — Sincronización (1–2 semanas)
- Cliente HTTP (OkHttp) con el endpoint de Apps Script (`Codigo.gs`); semántica de cola, idempotencia y reintentos de `sync-queue.js`; `WorkManager` con restricciones de red y retroceso exponencial.
- Secretos fuera del repositorio (`local.properties`/DataStore cifrado). No registrar tokens en logs.
**Aceptación:** sin red, las sesiones se encolan; al volver, se envían una sola vez; fallos visibles pero no bloqueantes.

### Fase 8 — Check-in y biohacks (1–2 semanas)
- Check-in semanal `checkin.v1` (deslizadores, ilustración reactiva de molestias, cintura/cadera).
- Atlas de biohacks (25 palancas) con cronómetro en vivo y matriz de decisión.
**Aceptación:** campos y cálculos idénticos a `checkin.html` y `biohacks.html` (pruebas con valores de ejemplo).

### Fase 9 — Mejora gráfica (2–3 semanas, por orden de impacto/riesgo)
1. Movimiento: transiciones compartidas, gesto de atrás con vista previa, animaciones coherentes.
2. Anillo del temporizador con **AGSL `RuntimeShader`** (Android 13+) y respaldo `Canvas` para versiones inferiores.
3. Háptica con significado (aviso a 10 s, fin, serie registrada).
4. Desenfoque real (`RenderEffect`) en hojas y diálogos.
5. **Silueta corporal con mapa de calor** (series por músculo en 7 días; ejercicio actual resaltado), datos desde Room.
6. Notificación de progreso en vivo y widget Glance.
7. Opcional: músculos 3D (Filament/SceneView) **solo** con modelos de licencia verificada (p. ej., BodyParts3D CC BY-SA, Z-Anatomy) y prueba de batería.
**Aceptación:** 60 fps estables en móvil de gama media; respaldo funcional sin shaders; consumo de batería medido en una sesión de 60 min.

### Fase 10 — Endurecimiento y lanzamiento (1–2 semanas)
- R8/ProGuard con reglas verificadas; perfiles de línea base (Baseline Profile); firma y almacén de claves respaldado fuera del repositorio.
- Batería: guía de ajustes para fabricantes; pruebas de Doze, ahorro de batería y reinicio.
- Periodo de **uso en paralelo** de 2–4 semanas con la PWA: comparar datos exportados de ambas.
- Criterio de salida: cero pérdida de datos en el periodo, 0 cierres inesperados en 20 sesiones, decisión registrada sobre congelar o mantener la PWA.

## 6. Matriz de verificación

| Capa | Herramienta | Frecuencia |
|---|---|---|
| Lógica pura | JUnit en JVM | Cada commit |
| Paridad con la PWA | Pruebas de oro con `contrato/salidas/` | Cada commit en `domain` |
| Persistencia | Room tests + migraciones | Cada cambio de esquema |
| UI | Compose Testing + capturas (Roborazzi/Paparazzi) con tolerancia | Cada fase de UI |
| Sistema (alarma/NFC/permisos) | Dispositivo real con lista de comprobación | Cada fase 1, 7, 10 |
| Instalación | `adb install` y Android Studio; reiniciar daemon si `INSTALL_PARSE_FAILED_NOT_APK` | Cada entrega |

## 7. Registro de riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Deriva entre PWA y nativa | Alta | Alto | Contrato versionado; PWA congelada salvo corrección con actualización de fixtures |
| ROM mata el servicio de alarma | Media | Alto | Servicio en primer plano, `setAlarmClock`, guía de ajustes, prueba en el móvil del usuario |
| Permisos Android 14+ (alarma exacta, pantalla completa) | Alta | Medio | Flujo guiado de concesión; instalación directa (sideload) |
| Parser portado con diferencias sutiles | Media | Alto | Pruebas de oro por estructura; no se toca el fixture |
| Alcance creciente (3D, widgets) | Alta | Medio | Fase 9 opcional por ítems; caja de tiempo |
| Assets de baja resolución (`mano3`, 176×204) | Cierta | Medio | Vectorizar o regenerar con revisión manual una a una |
| Pérdida de datos en migración | Baja | Muy alto | Pruebas de ida y vuelta + copias de seguridad previas a migrar |

## 8. Instrucciones para la IA que desarrolle

### 8.1 Prompt maestro (pegar al inicio de cada sesión)
```text
Eres un ingeniero Android senior. Construyes "Dame Caña Android" (Kotlin + Jetpack Compose + Material 3) como réplica nativa mejorada de una PWA existente. La PWA (carpeta pwa_spec/) es la ESPECIFICACIÓN: no la modifiques. Lee primero plan_android_dame_cana.md (este plan), solo la fase indicada, y .agent/ADR.md.

Reglas:
1. Antes de crear carpetas, propón el esquema final en <= 10 líneas y espera mi validación. Profundidad máxima 2 niveles. Un único LEEME.md (<= 40 líneas). Notas, planes y telemetría solo en .agent/.
2. Pruebas primero (rojo -> verde). La lógica pura va en el paquete domain sin dependencias de Android. Las pruebas de paridad usan contrato/salidas/ generadas desde la PWA; si falla una, el port está mal; nunca cambies el fixture para que pase.
3. No inventes datos ni versiones: consulta la documentación oficial para las versiones estables actuales de AGP, Kotlin, Compose BOM, Room y WorkManager. Datos desconocidos = null, nunca 0.
4. No toques el parser salvo para portarlo con paridad exacta. No renombres ids del contrato.
5. Inspección quirúrgica: busca con grep antes de leer; no abras archivos > 120 líneas completos para explorar; lee rangos.
6. Si una herramienta o test falla 2 veces por la misma causa, detente y responde BLOCKED: [causa raíz exacta].
7. Nunca escribas en tarjetas NFC de acceso ni las emules. Solo lectura de UID si se pide expresamente.
8. No metas secretos (tokens, endpoints privados) en el repositorio ni en logs.
9. Cada entrega: qué cambió (1-3 líneas), cómo verificarlo, estado de la puerta de calidad (build, lint, tests), riesgos abiertos. No imprimas el código modificado en el chat.
```

### 8.2 Plantilla de petición por fase
```text
FASE N: <nombre>. Lee .agent/fase-N.md y la sección correspondiente del plan.
Entrega: 1) esquema de archivos a crear (<=10 líneas) y espera validación; 2) pruebas en rojo; 3) implementación mínima; 4) verificación: <comandos>; 5) resumen y checklist de dispositivo.
Criterios de aceptación: <copiar de la fase>. No avances a la siguiente fase sin mi OK.
```

### 8.3 Primer prompt listo (Fase 0)
```text
Aplica el prompt maestro. FASE 0: Contrato y esqueleto.
1) Propón el esquema de repositorio (<=10 líneas) y espera mi OK.
2) Tras el OK: crea contrato/ con copia de los fixtures de contrato_tests/fixtures/, los esquemas de training_log.v1 y training_history.v1 (extraídos de pwa_spec/json-export.js), tokens.json con estos colores: stone #DAD7CD, paper #E9E8E1, input #F5F4EF, ink #16181C, ink-soft #585954, ink-faint #B2B0A8, lime #CCFF00, orange #EB4818, cyan-pill #DDE7E5; y pantallas.md con el inventario de pantallas y de ids/data-* de index.html.
3) Crea herramientas/convertir_tecnica.mjs (technical-data.js -> assets/tecnica.json) con una prueba que compruebe el recuento de ejercicios.
4) Crea el proyecto Android que compile con tema Aura vacío. Verifica con ./gradlew assembleDebug.
Entrega: estado de la puerta de calidad y lista de decisiones que necesitas de mí.
```

### 8.4 Primer prompt listo (Fase 1)
```text
Aplica el prompt maestro. FASE 1: Temporizador, alarma y NFC.
Base reutilizable: focusguard_ref/ (AlarmScheduler, AlarmReceiver, AlarmService, AlarmActivity, BootReceiver, NfcWriter, TimerRepository). Cópialo adaptándolo; no lo modifiques en origen.
Paso 1: porta rest-timer-tools.js a domain/ReposoTemporizador.kt con exactamente los casos de contrato_tests/rest-timer-tools.test.mjs (incluye parseNfcCommand y buildClockIntent si procede) como pruebas JUnit en rojo, luego verde.
Paso 2: servicio en primer plano + notificación con progreso y acciones Pausa/Reanudar, -15, +15; alarma exacta con AlarmManager; persistencia de endsAt/remaining/total en DataStore; BootReceiver.
Paso 3: NFC: filtros NDEF_DISCOVERED para https://dame-cana-pwa.web.app (rutas /, /app, /tn, /tn3d) con autoVerify; interpreta ?descanso=N (10-1800) y ?accion=pausa con antirrebote por t; modo "aprender etiqueta" (UID, solo lectura) con enableReaderMode; escritura de URL en NTAG.
Paso 4: checklist en dispositivo: alarma con móvil bloqueado, +/-15 desde notificación, etiqueta existente abre la app, reinicio conserva alarma, 3 toques seguidos sin duplicados. Reporta qué permisos pidió el sistema y cómo se concedieron.
```

## 9. Decisiones que necesita del usuario antes de arrancar
1. Validar el esquema de repositorio de §3.
2. Aportar capturas de referencia de cada pantalla de la PWA (ya hay varias del día B).
3. Confirmar el modelo de móvil y la versión de Android (condiciona AGSL, notificación en vivo, permisos).
4. ¿Instalación directa (sideload) o Play Store? Cambia los permisos de alarma exacta y pantalla completa.
5. ¿La PWA quedará congelada durante el desarrollo o seguirá evolucionando (y entonces hay que versionar el contrato)?
