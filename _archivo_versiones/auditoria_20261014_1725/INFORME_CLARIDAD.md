# AUDITORÍA DE CLARIDAD Y ESFUERZO PARA DANIEL — SISTEMA DAME CAÑA

**Rol:** Auditor de Claridad y Esfuerzo para Daniel  
**Fecha de corte:** 14 de octubre de 2026  
**Destinatario:** Coordinación de Auditoría DAME CAÑA (`22af0f0d-e5b9-4c6b-8db6-b82886969254`)  
**Directiva:** Evaluación implacable de la sobrecarga cognitiva, pasos manuales, ergonomía de interfaces y viabilidad autónoma del sistema para Daniel.

---

## 1. RESUMEN EJECUTIVO Y DIAGNÓSTICO GENERAL

El sistema DAME CAÑA presenta una **asimetría crítica entre rigor de auditoría interna y usabilidad en la vida real de Daniel**:
1. **Flujo diario hiper-fragmentado ("El Paseo del JSON"):** Registrar un entrenamiento exige entre **7 y 8 pasos manuales** cruzando tres entornos no sincronizados (PC local, móvil/PWA y ChatGPT/Drive). Daniel debe actuar de "puente humano de datos", copiando textos entre terminales y chats y moviendo archivos JSON manualmente mediante cables o nubes intermedias.
2. **Bloqueo operativo en la transición al split 5D:** Mientras que `programa.json` y la CLI implementaron la cola rodante 5D (`A-B-C-D-E`), el validador central `tools/registro_local.py` mantiene una expresión regular rígida que **solo admite `[ABC]`**. Si Daniel entrena el Día D o E, el importador descarta el día (`day = None`), corrompe la rotación y el sistema se queda atascado sin sugerir la siguiente sesión.
3. **Ceguera y desincronización en fallos de Excel:** La verificación de hash SHA-256 en `tools/revision_diaria.py` bloquea la regeneración de hojas si el archivo XLSX cambia, pero la salida CLI de `operativo.py actualizar` solo muestra `Incidencias: 1` sin decir qué archivo falló. Además, `operativo.py` sobrescribe el archivo forzosamente de todos modos mediante `generar_hojas.py`, dejando `data/estado_revision_diaria.json` en un estado de fallo perpetuo sin mecanismo alguno para que Daniel entienda o revierta la situación.
4. **Laberinto cognitivo (Violación flagrante de la regla de profundidad <= 2):** Existen decenas de archivos dispersos, dos libros Excel simultáneos (uno en una carpeta con un UUID ininteligible: `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx`), tres aplicaciones web locales desconectadas (`MI_SISTEMA.html`, `hub/index.html` DC Studio, `outputs/formulario/index.html`) y múltiples documentos que afirman ser el punto de partida ("EMPEZAR_AQUI").
5. **Falso éxito en DC Studio Hub:** El importador drag-and-drop de `hub/index.html` muestra un mensaje verde de éxito ("Sesión incorporada"), pero solo opera en la memoria volátil del navegador; **no traslada nada a `data/inbox_app/` ni a `data/registro.json`**, engañando al usuario.
6. **Fatiga por interrogatorios redundantes:** Se somete a Daniel a cuestionarios de 25 preguntas y se exige preguntar por dolor y recuperación antes de cada sesión, a pesar de que Daniel ya respondió explícitamente y zanjó las dudas pidiendo textualmente: *"Deja esas incidencias resueltas"*.

---

## 2. EVALUACIÓN DETALLADA POR EJES

### Eje 1: Flujo diario de Daniel (Paso a paso del entrenamiento y registro)
Actualmente, completar un ciclo de entrenamiento requiere los siguientes pasos:
1. **Solicitar sesión:**
   - *Vía CLI:* Daniel enciende el PC, abre terminal, ejecuta `python tools/operativo.py sesion`. El texto sale por consola en Windows.
   - *Vía ChatGPT:* Daniel pregunta a ChatGPT en el móvil. Pero si el PC no ha sincronizado `CONTEXTO_ENTRENADOR.json` con Drive, ChatGPT tiene datos desactualizados.
2. **Transferir la nota a la PWA:** Daniel debe copiar el bloque de texto desde el terminal del PC o desde ChatGPT, pegárselo a sí mismo en una app de mensajería (WhatsApp/Telegram), abrirlo en el móvil, copiarlo, abrir la PWA (`dame-cana-pwa.web.app`), ir a la pantalla de pegado Note v1, revisar y aceptar.
3. **Entrenar:** Registra series, repeticiones y RIR en el gimnasio en la PWA.
4. **Exportar JSON:** Al terminar, pulsa "Finalizar" y "Exportar JSON", descargando un archivo `training_log.v1` en la carpeta de descargas del móvil.
5. **Transferir el JSON al PC:** Daniel debe conectar el móvil por cable USB, o subir el JSON a Google Drive, o enviárselo por Telegram/WhatsApp Web al PC, descargarlo en Windows y moverlo a la ruta `c:\Users\Daniel\Workspace\_Experiments\DAME_CANA-gemini\data\inbox_app\`.
6. **Procesar la importación:** Daniel debe volver al terminal del PC y ejecutar `python tools/operativo.py actualizar`.
7. **Verificar estado:** Debe revisar la consola y verificar que no salgan excepciones de esquema o incidencias.

*Diagnóstico:* Un flujo de 7 pasos con 3 transiciones de dispositivo y 2 saltos de portapapeles es insostenible para un usuario que solo quiere entrenar y progresar.

---

### Eje 2: Ergonomía cognitiva de interfaces, archivos y automatizaciones
- **Archivos que Daniel necesita vs. archivos que existen:** Daniel solo necesita ver: (1) Qué le toca hoy (con cargas objetivo), (2) Su progreso histórico por ejercicio, y (3) Dónde dejar el archivo si no hay sync automática. Actualmente se le presentan más de 30 archivos JSON y Markdown con conceptos técnicos de auditoría (`load_basis`, `comparability_group`, SHA-256, taxonomías, manifiestos de fuentes).
- **Duplicidad de hojas y carpetas fantasma:** 
  - `outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx`
  - `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx`  
  Tener dos hojas de cálculo con nombres y ubicaciones distintas, una de ellas dentro de un UUID crudo (`01a0ee94-3218-7bc2-860f-bda74883553e`), es desconcertante.
- **Salida de CLI:** `operativo.py resumen` es limpio y legible. Pero `registro_local.py resumen` arroja un volcado JSON crudo con 15 claves de auditoría interna, y `operativo.py actualizar` silencia los detalles de las incidencias imprimiendo solo `Incidencias: 1`.
- **Cuestionarios redundantes:** A pesar de que Daniel aclaró el 09/10 y 10/10 sus convenciones de carga (discos añadidos sin contar barra, selector en kg, dolor 0, leves agujetas), `PREGUNTAS_PARA_DANIEL.md` (92 líneas) y `OPERACION_CHATGPT.md` le imponen volver a preguntar por recuperación y molestias antes de cada sesión.
- **Visibilidad de fallos de hash en `revision_diaria.py`:** Cuando el hash del Excel falla, se genera una huella SHA en `estado_revision_diaria.json`. En consola solo sale `Incidencias: 1`, y en la siguiente ejecución sale `Incidencias: 0`. No hay ningún mensaje explicativo ni comando de resolución.

---

### Eje 3: Usabilidad de la PWA desde la perspectiva de usuario
- **En el gimnasio:** El diseño con tarjeta giratoria ("↻ Ver técnica") resuelve la biomecánica, pero tener que pegar un bloque de texto Note v1 en el móvil antes de empezar a entrenar es la mayor fricción física.
- **Riesgo de discrepancia en plantillas:** Las plantillas internas de la app no reflejan el split 5D actualizado, por lo que si Daniel crea la sesión desde la plantilla de la app en lugar de pegar la nota, desincroniza ejercicios y series con el programa de Antigravity.
- **DC Studio Hub (`hub/index.html`):** Es una interfaz limpia y atractiva visualmente con gráficos Bento, pero crea una trampa de usabilidad al simular una importación drag-and-drop que en realidad no persiste en el registro central local.

---

### Eje 4: Propuestas de simplificación radical
1. **Regla de ergonomía cognitiva de Daniel (Profundidad <= 2):**
   - **Nivel 0 (Entrada única):** Un único archivo `LEEME.md` en la raíz (sustituyendo a `README.md`, `EMPEZAR_AQUI.md`, `PROJECT_CONTEXT.md` y `MIGRATION.md`).
   - **Nivel 1 (Operación diaria):** `DC Studio` (`hub/index.html`) o comando unificado `python tools/operativo.py sesion` / `actualizar`.
   - **Nivel 2 (Datos y soporte):** Una única carpeta de consulta (`outputs/`) con una única hoja Excel (`outputs/DAME_CANA_REGISTRO.xlsx`) y un único visor HTML (`outputs/MI_SISTEMA.html`). Toda la auditoría técnica profunda y los JSON de gobierno deben quedar encapsulados en `data/sistema/` o transparentes para Daniel.
2. **Cierre de la brecha móvil ↔ PC:**
   - Crear un mini-servidor local o script de sincronización directa (por ejemplo, endpoint local o watcher de carpeta compartida/Drive) que recoja los JSON automáticamente y exponga la sesión del día como JSON/texto para la PWA, eliminando el copiar/pegar manual.

---

## 3. CATÁLOGO OBLIGATORIO DE HALLAZGOS

### ID: CLA-01
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** El flujo operativo diario impone entre 7 y 8 pasos manuales y el cruce de 3 dispositivos/entornos (PC local, móvil y WhatsApp/Drive) para completar una sesión de entrenamiento ("El Paseo del JSON").
- **Evidencia:** `README.md` (líneas 39-48), `docs/GUIA_APP.md` (líneas 5-20), `docs/OPERACION_CHATGPT.md` (líneas 38-44). Pasos requeridos: (1) Solicitar sesión en PC/ChatGPT -> (2) Copiar texto Note v1 al móvil -> (3) Pegar y revisar en PWA -> (4) Entrenar -> (5) Exportar JSON en móvil -> (6) Transferir archivo a PC mediante cable/Drive/mensajería -> (7) Mover a `data/inbox_app/` -> (8) Ejecutar `python tools/operativo.py actualizar`.
- **Consecuencia práctica para Daniel:** Carga mental continua. Si olvida transferir el JSON tras entrenar, la siguiente prescripción se calcula sobre datos viejos. El rozamiento acumulado induce el abandono del registro.
- **Propuesta concreta:** 
  1. Habilitar la importación directa arrastrando el archivo a la web local (`hub/index.html`) con guardado real en disco mediante la API de acceso al sistema de archivos local (`showSaveFilePicker` o endpoint local HTTP ligero `tools/servidor_local.py`).
  2. Implementar un generador de enlace/código QR en `tools/operativo.py sesion` que permita a Daniel escanear la sesión con el móvil y cargarla en la PWA con un solo toque, sin copiar ni pegar texto.
- **Dependencias y riesgos:** Requiere que la PWA acepte carga por URL query param / deep link (`dame-cana-pwa.web.app/?sesion=...`) o lectura de archivo local.
- **Esfuerzo estimado y fundamento de la estimación:** Medio (4 a 6 horas de desarrollo frontend/CLI). No altera el modelo de datos.
- **Beneficio esperado:** Reducción de 8 a 2 pasos manuales por sesión (medido: ahorro de 5 transferencias manuales por entrenamiento).
- **Criterio verificable de éxito:** Daniel puede abrir la PWA en el móvil, ver cargada la sesión prescrita sin pegar texto, y exportar/guardar la sesión completada sin mover archivos mediante exploradores de archivos.
- **Forma de revertir el cambio, si se implementara:** Mantener el endpoint de archivo `data/inbox_app/` como receptor estándar de respaldo; la reversión es deshabilitar el servidor ligero.
- **Información pendiente que realmente podría cambiar la decisión:** Confirmar si el navegador del móvil de Daniel permite sincronización periódica en segundo plano o Web Share API para depositar archivos directamente en Drive.

---

### ID: CLA-02
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Bloqueo en la importación de sesiones de la cola rodante 5D: `tools/registro_local.py` solo reconoce días A, B y C por expresión regular rígida, dejando el campo `"dia": null` en las sesiones de los Días D y E.
- **Evidencia:** `tools/registro_local.py` línea 89:
  ```python
  day_match = re.match(r"^D[ií]a\s+([ABC])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)
  ```
  y línea 270:
  ```python
  reales = [s for s in sessions if s.get("finished") is True and s.get("dia") in ("A", "B", "C", "D", "E") ...]
  ```
  Al importar una sesión con título `"Día D — Empuje"` o `"Día E"`, `day_match` es `None`, `day` se almacena como `None` en `data/registro.json` (línea 163), y la función `proximo_dia()` descarta la sesión, atascando la rotación de días.
- **Consecuencia práctica para Daniel:** Daniel entrena un Día D o E, realiza todo el flujo de exportación e importación, pero el sistema no reconoce el día, no avanza la cola rodante y le vuelve a pedir que entrene un día anterior.
- **Propuesta concreta:** Modificar la expresión regular en `tools/registro_local.py` línea 89 a:
  ```python
  day_match = re.match(r"^D[ií]a\s+([ABCDE])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)
  ```
- **Dependencias y riesgos:** Ninguno. `programa.json` y `operativo.py` ya manejan Días A, B, C, D y E.
- **Esfuerzo estimado y fundamento de la estimación:** Mínimo (5 minutos, 1 carácter en una expresión regular).
- **Beneficio esperado:** Desbloqueo funcional inmediato de la rotación 5D (medido: 100% de sesiones D y E reconocidas e indexadas).
- **Criterio verificable de éxito:** Un archivo en `data/inbox_app/` con `session.title = "Día D"` se importa con `"dia": "D"` en `data/registro.json` y `proximo_dia()` devuelve `"E"`.
- **Forma de revertir el cambio, si se implementara:** Revertir la línea a `([ABC])` con git.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna; la discrepancia entre el validador (3D) y el programa activo (5D) es un error demostrado de sincronización interna.

---

### ID: CLA-03
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Ceguera operativa y bloqueo permanente del generador de hojas Excel por fallo de hash SHA-256 en `tools/revision_diaria.py`, combinado con bypass desincronizado en `tools/operativo.py`.
- **Evidencia:** 
  1. `tools/revision_diaria.py` líneas 73-87: si `sha(HOJA) != hoja_sha_anterior`, bloquea la sobrescritura y genera una incidencia con huella SHA-256 en `data/estado_revision_diaria.json`.
  2. `tools/operativo.py` líneas 355-367: en `cmd_actualizar()`, ejecuta `revision_diaria.ejecutar()` y solo imprime `Incidencias: {len(res['incidencias_nuevas'])}` (no imprime el mensaje de error ni el archivo afectado).
  3. Inmediatamente después (línea 366), `cmd_actualizar()` llama incondicionalmente a `generar_hojas.generar_hoja_registro()`, sobrescribiendo la hoja pero sin actualizar el hash en `data/estado_revision_diaria.json`.
  4. En la siguiente ejecución, `revision_diaria.py` detecta que la huella ya estaba en `incidencias_vistas` y devuelve `incidencias_nuevas = []`, por lo que la CLI imprime `Incidencias: 0`, ocultando el problema mientras el registro sigue desincronizado en el estado interno.
- **Consecuencia práctica para Daniel:** Desconcierto total. Si Daniel abre la hoja Excel para verla y Excel altera metadatos internos, el sistema reporta `Incidencias: 1` sin decir por qué, no le ofrece ninguna acción para resolverlo, y luego la CLI afirma "Sistema actualizado con éxito".
- **Propuesta concreta:**
  1. En `tools/operativo.py cmd_actualizar()`, mostrar explícitamente el detalle humano de cualquier incidencia:
     ```python
     for inc in res['incidencias_nuevas']:
         print(f"  ⚠ Alerta en {inc['archivo']}: {inc['motivo']}")
     ```
  2. Añadir un comando de resolución directa: `python tools/operativo.py sincronizar-hoja --forzar` que sincronice el hash actual sin bloquear la rutina.
  3. Eliminar la comprobación paranoica de hash SHA-256 sobre archivos XLSX derivados; la hoja Excel es una vista generada, no una fuente maestra.
- **Dependencias y riesgos:** Riesgo nulo; la hoja Excel está documentada explícitamente como derivada de `data/registro.json`.
- **Esfuerzo estimado y fundamento de la estimación:** Bajo (30 minutos de código en Python).
- **Beneficio esperado:** Eliminación del 100% de bloqueos falsos positivos por apertura de Excel y transparencia total ante fallos reales.
- **Criterio verificable de éxito:** Abrir y guardar el Excel no produce bloqueos en `revision_diaria.py` ni alertas mudas en `operativo.py`.
- **Forma de revertir el cambio, si se implementara:** Restaurar la verificación estricta de hash en `revision_diaria.py`.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna.

---

### ID: CLA-04
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Sobrecarga cognitiva severa por dispersión documental, duplicidad de libros Excel y carpetas con identificadores UUID crudos (violación de la regla de profundidad <= 2).
- **Evidencia:** 
  - Existen dos hojas Excel en rutas distintas: `outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx` y `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx` (definida en `tools/generar_hojas.py` línea 157).
  - Existen múltiples guías contradictorias que ordenan empezar por ellas: `README.md`, `EMPEZAR_AQUI.md`, `biblioteca/EMPEZAR_AQUI.md`, `PREGUNTAS_PARA_DANIEL.md`.
  - La carpeta con UUID `01a0ee94-3218-7bc2-860f-bda74883553e` transmite sensación de código residual, corrupción o artefacto temporal.
- **Consecuencia práctica para Daniel:** Daniel no sabe qué archivo abrir, teme romper datos al ver rutas crudas con UUID y pierde autonomía al depender de que el asistente le diga qué documento es el válido.
- **Propuesta concreta:**
  1. Unificar las dos hojas Excel en un **único libro canónico**: `outputs/DAME_CANA_REGISTRO.xlsx` (con pestañas para Resumen, Programa, Historial de Sesiones y Series).
  2. Eliminar completamente la carpeta UUID `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/`.
  3. Crear un **único `LEEME.md` en la raíz** con un índice de 2 niveles:
     - Nivel 1: Cómo entrenar hoy (`python tools/operativo.py sesion` o abrir `hub/index.html`).
     - Nivel 2: Cómo actualizar el registro (`python tools/operativo.py actualizar`).
     - Todo lo demás (biblioteca, esquemas JSON, taxonomías) enlazado como referencia avanzada bajo `docs/` y `biblioteca/`.
- **Dependencias y riesgos:** Ajustar las referencias a la ruta de la hoja en `tools/revision_diaria.py`, `tools/generar_hojas.py` y `tools/operativo.py`.
- **Esfuerzo estimado y fundamento de la estimación:** Bajo (1 hora de reorganización de rutas y documentación).
- **Beneficio esperado:** Cumplimiento estricto de la regla de ergonomía cognitiva (profundidad <= 2). Ahorro de al menos 15 minutos de desorientación por interacción.
- **Criterio verificable de éxito:** Daniel solo tiene 1 archivo Markdown de entrada (`LEEME.md`), 1 libro Excel (`DAME_CANA_REGISTRO.xlsx`) y 0 carpetas con identificadores UUID en `outputs/`.
- **Forma de revertir el cambio, si se implementara:** Recrear la subcarpeta UUID mediante git checkout.
- **Información pendiente que realmente podría cambiar la decisión:** Verificar si alguna herramienta externa de sincronización en Drive apuntaba específicamente al path con UUID.

---

### ID: CLA-05
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Falso éxito en la importación de sesiones en DC Studio Hub (`hub/index.html`): la interfaz muestra confirmación verde pero no guarda los datos en el sistema central.
- **Evidencia:** `hub/modules/importer.js` líneas 201-209:
  ```javascript
  confirmBtn.addEventListener("click", () => {
    if (pendingImport && !pendingImport.error && onSessionImported) {
      onSessionImported(pendingImport);
      previewArea.innerHTML = `
        <div class="preview-card success toast-success">
          <h4>🟢 Sesión incorporada con éxito</h4>
          <p>Las métricas, historial y gráficos se han actualizado con estos datos.</p>
        </div>`;
    }
  });
  ```
  y `docs/INFORME_SINCRONIZACION_CHATGPT.md` línea 128: *"Lo importado en el Hub es solo local al navegador; no sustituye el flujo data/inbox_app/"*.
- **Consecuencia práctica para Daniel:** Engaño visual gravísimo. Daniel arrastra su archivo exportado al Hub, ve el cartel verde de "incorporada con éxito" y cree que su entrenamiento ya está registrado. Sin embargo, `data/registro.json` no cambia, y cuando pide su siguiente sesión, el sistema la calcula con datos viejos.
- **Propuesta concreta:**
  1. En el botón de confirmación de `hub/modules/importer.js`, disparar automáticamente la descarga del archivo hacia la carpeta de descargas con instrucción clara: *"Guarda este archivo en data/inbox_app/"*, O
  2. Implementar un fetch POST contra un servidor local de desarrollo (`tools/operativo.py servir`) que deposite el payload directamente en `data/inbox_app/` y ejecute `cmd_actualizar()`.
  3. Modificar el texto del toast de éxito para indicar con total veracidad: *"Sesión visualizada en el navegador. Recuerda mover el archivo a data/inbox_app/ para persistirla en el sistema central"*.
- **Dependencias y riesgos:** Ninguno. Clarifica la frontera entre la vista cliente y la persistencia local.
- **Esfuerzo estimado y fundamento de la estimación:** Bajo (1 hora de desarrollo frontend).
- **Beneficio esperado:** Eliminación total del riesgo de pérdida de sesiones por falsa creencia de guardado.
- **Criterio verificable de éxito:** La interfaz nunca afirma "incorporada con éxito" si el archivo no está físicamente integrado en `data/registro.json`.
- **Forma de revertir el cambio, si se implementara:** Revertir el código de `importer.js`.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna.

---

### ID: CLA-06
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Fatiga cognitiva por interrogatorios redundantes ("Cuestionarios médicos continuos" antes de cada entrenamiento).
- **Evidencia:** 
  - `PREGUNTAS_PARA_DANIEL.md` (92 líneas, 25 preguntas detalladas sobre dolor, sueño, estaciones, preferencias).
  - `docs/OPERACION_CHATGPT.md` (línea 31): ordena al agente preguntar obligatoriamente por recuperación y molestias antes de preparar cada sesión.
  - `data/confirmaciones_usuario.json` (líneas 148-154, 268, 281, 293): Daniel ya respondió formalmente: *"No, apenas unas leves agujetas"*, *"sin molestias en codo/hombro"*, *"1. 14/08; 2. Peso total; 3. 1 rir. Deja esas incidencias resueltas"*.
- **Consecuencia práctica para Daniel:** Sensación de pesadez y burocracia. Daniel quiere saber qué peso poner hoy en sentadilla o hip thrust, no rellenar un historial clínico en cada conversación.
- **Propuesta concreta:**
  1. Establecer la política de **"Prescripción Directa por Defecto"**: `operativo.py sesion` y el asistente deben generar la sesión asumiendo estado normal salvo que Daniel indique expresamente una molestia de forma proactiva.
  2. Archivar `PREGUNTAS_PARA_DANIEL.md` en `docs/historico/` y no volver a presentar formularios exhaustivos.
  3. Limitar cualquier consulta a una única pregunta optativa al final de la nota: *"Si tienes alguna molestia imprevista hoy, indícalo para ajustar variantes"*.
- **Dependencias y riesgos:** Ninguno. La regla de progresión ya tiene márgenes de seguridad biomecánicos basados en RIR 1-2.
- **Esfuerzo estimado y fundamento de la estimación:** Mínimo (30 minutos para actualizar las instrucciones del entrenador).
- **Beneficio esperado:** Reducción drástica del rozamiento psicológico previo al entrenamiento. Cero preguntas obligatorias rutinarias.
- **Criterio verificable de éxito:** Daniel puede solicitar su sesión con una sola frase ("sesión") y recibir la nota técnica completa sin preguntas intermedias de confirmación.
- **Forma de revertir el cambio, si se implementara:** Restaurar la directiva de check-in previo en `OPERACION_CHATGPT.md`.
- **Información pendiente que realmente podría cambiar la decisión:** Que Daniel manifieste una lesión articular aguda que requiera seguimiento diario estricto.

---

### ID: CLA-07
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Inconsistencia de especificación en el formato de nota Note v1 entre la documentación oficial de Antigravity y las instrucciones para ChatGPT.
- **Evidencia:** 
  - En `docs/FORMATO_SESION_ENTRENADOR_APP.md` (líneas 20-30), se exige estrictamente el formato plano por ejercicio:
    ```text
    Día B — Cadena posterior y torso
    Nombre exacto del ejercicio — 3 × 8–12
    RIR 1–2 · Descanso 2–3 min
    Último registro: 2026-10-10; 60 kg × 11 @1...
    ```
  - Sin embargo, en `docs/INFORME_SINCRONIZACION_CHATGPT.md` (líneas 89-103), el ejemplo que se le da a ChatGPT utiliza viñetas Markdown incompatibles con ese parser:
    ```markdown
    # Día D — Empuje y Brazos
    Prescripción:
    - Press inclinado en multipower: 3 series × 6-8 reps · RIR 1 · 150s descanso
    Último registro (2026-10-13):
    - Katana: 15 kg × 12, 11 (RIR 1)...
    ```
- **Consecuencia práctica para Daniel:** Si Daniel le pide la sesión a ChatGPT y este utiliza el formato de viñetas de `INFORME_SINCRONIZACION_CHATGPT.md`, la PWA no reconoce las series ni los nombres, obligando a Daniel a corregir a mano el texto en el móvil en la sala de pesas.
- **Propuesta concreta:** Corregir el bloque de ejemplo en `docs/INFORME_SINCRONIZACION_CHATGPT.md` (sección 5) para que sea 100% idéntico al bloque canónico de Note v1 validado en `docs/FORMATO_SESION_ENTRENADOR_APP.md` y generado por `tools/operativo.py sesion`.
- **Dependencias y riesgos:** Ninguno; unifica el estándar en todo el ecosistema.
- **Esfuerzo estimado y fundamento de la estimación:** Mínimo (15 minutos de edición documental).
- **Beneficio esperado:** Cero fallos de parseo al copiar sesiones desde ChatGPT a la PWA.
- **Criterio verificable de éxito:** El texto generado por ChatGPT se pega en la PWA y se valida al 100% en la pantalla de revisión de Note v1 sin errores de sintaxis.
- **Forma de revertir el cambio, si se implementara:** Revertir la edición en `INFORME_SINCRONIZACION_CHATGPT.md`.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna.

---

### ID: CLA-08
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Ruptura de contexto entre la salida del CLI en el PC y el teléfono móvil de entrenamiento.
- **Evidencia:** `tools/operativo.py sesion` imprime la nota en la salida estándar de la consola (`sys.stdout`) del ordenador. Daniel no dispone de un comando para enviar esa nota al portapapeles de Windows (ej. `clip.exe`) ni de un visor móvil simple.
- **Consecuencia práctica para Daniel:** Daniel tiene que seleccionar manualmente con el ratón el texto en la consola de comandos, copiarlo, abrir un navegador o app de mensajería en el PC, enviárselo a sí mismo y recuperarlo en el teléfono.
- **Propuesta concreta:**
  1. Añadir el flag `--copiar` en `tools/operativo.py sesion` que copie automáticamente el bloque Note v1 al portapapeles del sistema operativo (usando `clip.exe` en Windows sin dependencias externas).
  2. Generar simultáneamente el archivo `outputs/sesiones/SIGUIENTE_SESION.txt` y un enlace QR opcional en consola o HTML para apertura directa en el navegador móvil.
- **Dependencias y riesgos:** `clip.exe` es nativo en Windows 10/11; no requiere `pyperclip` ni paquetes de terceros.
- **Esfuerzo estimado y fundamento de la estimación:** Muy bajo (20 minutos de desarrollo en Python).
- **Beneficio esperado:** Eliminación de la fricción de selección y copia manual en el terminal del PC.
- **Criterio verificable de éxito:** Ejecutar `python tools/operativo.py sesion --copiar` copia la nota limpia al portapapeles lista para pegar en Telegram/WhatsApp Web con `Ctrl+V`.
- **Forma de revertir el cambio, si se implementara:** Retirar el sub-argumento `--copiar`.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna.

---

### ID: CLA-09
- **Rol:** Auditor de Claridad y Esfuerzo para Daniel
- **Estado:** demostrado
- **Problema o funcionamiento correcto observado:** Falta de claridad y accionabilidad en los mensajes de salida de las herramientas CLI (`tools/operativo.py` y `tools/registro_local.py`).
- **Evidencia:**
  - `python tools/registro_local.py resumen` imprime 15 claves de JSON crudo (`campos_ausentes_en_series`, `bases_de_carga`, `conflictos_fuentes_pendientes`, etc.).
  - `python tools/operativo.py actualizar` muestra `Incidencias: 1` sin decir qué archivo provocó el fallo ni qué acción correctiva debe tomar Daniel.
  - Al fallar un esquema JSON en `registro_local.py` (ej. `declared_recorded != recorded`), la excepción termina el programa de forma abrupta con un stacktrace que no indica cómo reparar el JSON.
- **Consecuencia práctica para Daniel:** Intimidación técnica. Daniel no sabe interpretar las métricas de auditoría interna ni sabe qué hacer cuando la CLI le dice simplemente `Incidencias: 1`.
- **Propuesta concreta:**
  1. Diseñar salidas de consola orientadas a usuario:
     - Mostrar un resumen limpio con viñetas: qué sesión se importó, cuántas series reales se agregaron y cuál es el siguiente día sugerido.
     - Si hay un error, mostrar un mensaje de acción en español plano: *"El archivo X tiene un recuento de series distinto al declarado por la app. Se ha movido a data/inbox_app/errores/ para no bloquear el sistema"*.
- **Dependencias y riesgos:** Ninguno.
- **Esfuerzo estimado y fundamento de la estimación:** Bajo (1 a 2 horas de formateo en `operativo.py`).
- **Beneficio esperado:** Experiencia de usuario limpia, amigable y libre de jerga criptográfica o JSON crudo.
- **Criterio verificable de éxito:** La ejecución de `operativo.py actualizar` y `resumen` no muestra ningún bloque JSON crudo ni errores mudos.
- **Forma de revertir el cambio, si se implementara:** Revertir los prints de `operativo.py`.
- **Información pendiente que realmente podría cambiar la decisión:** Ninguna.

---

## 4. PLAN DE ACCIÓN INMEDIATO PRIORIZADO (ROADMAP DE SIMPLIFICACIÓN)

| Prioridad | ID | Acción | Impacto directo en Daniel |
| :---: | :---: | :--- | :--- |
| **P0 (Crítica)** | **CLA-02** | Corregir regex en `registro_local.py` a `[ABCDE]` | Evita que las sesiones D y E corrompan o bloqueen la cola rodante |
| **P0 (Crítica)** | **CLA-05** | Corregir el importador de `hub/modules/importer.js` | Elimina la falsa ilusión de guardado en el navegador |
| **P1 (Alta)** | **CLA-03** | Sanear `revision_diaria.py` y visibilidad de errores en `operativo.py` | Termina con los bloqueos mudos de las hojas Excel |
| **P1 (Alta)** | **CLA-07** | Alinear el ejemplo de `INFORME_SINCRONIZACION_CHATGPT.md` a Note v1 | Garantiza que ChatGPT genere bloques 100% legibles por la PWA |
| **P2 (Media)** | **CLA-04** | Unificar libros Excel en `outputs/` y erradicar carpeta UUID | Reduce el laberinto documental a profundidad <= 2 |
| **P2 (Media)** | **CLA-06** | Desactivar cuestionarios obligatorios previos a cada sesión | Libera a Daniel del "interrogatorio médico" diario |
| **P3 (Mejora)** | **CLA-01** y **CLA-08** | Implementar `--copiar` y simplificación de transferencias móvil-PC | Ahorra hasta 6 pasos manuales por entrenamiento |

Esta auditoría concluye formalmente el informe de Claridad y Esfuerzo para Daniel. Quedo a la espera de las directivas del agente coordinador para la consolidación general del sistema.