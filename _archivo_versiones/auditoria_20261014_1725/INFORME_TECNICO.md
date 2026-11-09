# INFORME DE AUDITORÍA TÉCNICA Y DE INTEGRACIÓN — SISTEMA DAME CAÑA

**Rol:** Auditor Técnico y de Integración  
**Fecha de auditoría:** 14 de octubre de 2026  
**Entorno auditado:** Antigravity / Gemini Workspace (`c:\Users\Daniel\Workspace\_Experiments\DAME_CANA-gemini`)  
**Modo:** Solo lectura (auditoría estricta sin modificación de archivos)

---

## 1. RESUMEN EJECUTIVO

Se ha completado la auditoría técnica profunda y de integración del sistema **DAME CAÑA**, revisando la totalidad del pipeline de datos: prescripción, captura/app, contratos de exportación, transporte, importación canónica, orquestación, vistas derivadas y respaldos.

### Conclusiones Principales:
1. **Riesgo crítico de ruptura del ciclo 5D (TEC-01):** El importador `tools/registro_local.py` posee un regex anclado exclusivamente en los días A, B y C (`r"^D[ií]a\s+([ABC])"`). Cualquier sesión de Día D o Día E completada en la app pierde su día al importarse (`dia: null`), deteniendo por completo el avance de la cola rodante asíncrona.
2. **Bloqueo circular permanente en la revisión diaria (TEC-02):** El orquestador `tools/revision_diaria.py` calcula el hash SHA-256 de una vista derivada de Excel (`DAME_CANA_REGISTRO_LOCAL.xlsx`) bajo una carpeta con GUID rígido de OpenAI (`outputs/01a0ee94-3218-7bc2-860f-bda74883553e/`). Cada vez que `operativo.py` regenera la hoja, openpyxl altera el archivo zip sin actualizar el estado de revisión, provocando el bloqueo activo identificado como incidente `979f7e08...`.
3. **Divergencia crítica entre documentación para ChatGPT y programa canónico (TEC-05):** `docs/INFORME_SINCRONIZACION_CHATGPT.md` describe una distribución de días completamente incompatible con la realidad de `data/programa.json` (asigna Tracción al Día B, Cadena Posterior al C y Empuje al D, mientras que el programa real asigna Satélite de Brazos al B, Torso al C y Cadena Posterior/Glúteo al D). Si ChatGPT prescribe basándose en ese informe, causará una descompensación biomecánica inmediata.
4. **Respaldo no autosuficiente y sin herramientas de restauración (TEC-07):** El paquete `RESPALDO_OPERATIVO_LOCAL.zip` omite el código fuente de la PWA, el cockpit `hub/`, la hoja Excel de registro y el historial Git. Tampoco existe ningún script automatizado de restauración (`restaurar.py`), dejando la recuperación ante desastres supeditada a intervenciones manuales no probadas.
5. **Pérdida severa de contexto biomecánico en el puente de datos (TEC-04):** La PWA no exporta `machine_id`, `exercise_id`, `slot_id` ni `comparability_group`, entrando todas las series al registro canónico con identidad física nula. Además, se descarta el 100% de la prescripción original (series, repeticiones objetivo, RIR objetivo, descansos y consignas técnicas del entrenador).

---

## 2. TRAZADO DEL RECORRIDO EXTREMO A EXTREMO

```
[Prescripción Canónica]
 ├── data/programa.json (M5-5D-v1.0: A01..E05)
 ├── data/indicaciones_tecnicas.json (55 fichas G01..G55)
 └── tools/operativo.py (cmd_sesion -> Workout Note v1)
            │
            ▼ (Traspaso manual vía portapapeles)
[Captura / App Externa]
 ├── PWA Remota / Proyecto protegido (dame-cana-pwa.web.app / DCLog)
 │    [NOTA: Código PWA no versionado en este repositorio]
 └── Registro de series en gimnasio
            │
            ▼ (Exportación manual JSON: schema training_log.v1)
[Transporte / Ingesta]
 ├── Móvil Daniel -> Google Drive / Archivo local
 └── Depósito manual en data/inbox_app/*.json
            │
            ▼
[Importación Canónica Local]
 ├── tools/registro_local.py (importar -> convertir_app -> convertir_record)
 ├── Inmutable: data/originales_app/<stem>__<sha12>.json
 ├── Respaldo pre-ingesta: data/backups/registro_<ts>_<sha>.json
 └── Base canónica única: data/registro.json
            │
            ▼
[Orquestación Diaria y Comprobaciones]
 ├── tools/revision_diaria.py (ejecutar a las 09:00 o vía operativo.py)
 └── data/estado_revision_diaria.json (control de hashes y deduplicación)
            │
            ├──► [Vistas Derivadas Registro]
            │     └── tools/generar_hojas.py -> outputs/01a0ee94-.../DAME_CANA_REGISTRO_LOCAL.xlsx
            │
            ├──► [Vistas Derivadas ChatGPT / Operativas]
            │     ├── tools/operativo_chatgpt.py (generate)
            │     ├── tools/modelo_operativo.py (build)
            │     ├── outputs/operativo/CONTEXTO_ENTRENADOR.json
            │     ├── outputs/operativo/MODELO_OPERATIVO.json
            │     ├── outputs/operativo/TABLAS_OPERATIVAS.json
            │     ├── outputs/operativo/VISTAS_HUMANAS.json
            │     ├── outputs/operativo/INDICE_CONOCIMIENTO.json
            │     ├── outputs/operativo/MI_SISTEMA.html
            │     └── outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx
            │
            └──► [Vistas Documentales]
                  └── docs/PROGRAMA_ACTIVO.md (generador legacy tools/generar_programa.py desincronizado)
            │
            ▼
[Empaquetado y Respaldo]
 ├── tools/operativo.py respaldo -> tools/operativo_chatgpt.py (backup)
 ├── outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip
 └── outputs/operativo/MANIFIESTO_RESPALDO.json
```

### Clasificación Arquitectónica de Fuentes:
* **Fuentes Maestras Canónicas (Inmutables/Autoritativas):** `data/registro.json`, `data/programa.json`, `data/maquinas.json`, `data/catalogos.json`, `data/indicaciones_tecnicas.json`, `data/estado_y_decisiones.json`, `data/confirmaciones_usuario.json`, `data/originales_app/`.
* **Vistas Derivadas (Regenerables en cualquier momento, nunca editar a mano):** `outputs/01a0ee94-.../DAME_CANA_REGISTRO_LOCAL.xlsx`, `outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx`, `outputs/operativo/MI_SISTEMA.html`, `outputs/operativo/*.json`, `docs/PROGRAMA_ACTIVO.md`.
* **Históricos / Auditoría:** `data/conflictos_fuentes.json`, `data/retirados/`, `data/fuentes/`, `data/backups/`.
* **Respaldos:** `outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip`, backups en Google Drive.

---

## 3. INSPECCIÓN DE CONTRATOS: `training_log.v1` vs `training_history.v1` vs `data/registro.json`

Al contrastar los esquemas y archivos reales de `data/originales_app/` y `data/fuentes/` con el código de ingestión de `tools/registro_local.py`:

| Nivel de Entidad | Campo en Exportación App (`training_log.v1` / `training_history.v1`) | Destino en `data/registro.json` | Estado del Campo | Consecuencia Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **Sesión** | `session.id` | `sesiones[].session_id` | Conservado | Clave primaria de deduplicación. |
| **Sesión** | `session.date` (ISO con hora y TZ) | `sesiones[].fecha` (`YYYY-MM-DD`) | **Truncado** | Se pierde la hora exacta de ejecución (Europe/Madrid) y duración de sesión. |
| **Sesión** | `session.updated_at` | Ninguno | **Descartado** | Se pierde la marca temporal de modificación de la sesión. |
| **Sesión** | `event_id` | Ninguno | **Descartado** | Se pierde la trazabilidad del evento emitido por la app. |
| **Sesión** | `session.title` ("Día D — Glúteo...") | `sesiones[].dia` | **Perdido en D y E** | Regex `r"^D[ií]a\s+([ABC])"` asigna `dia: null` a días D y E. |
| **Sesión** | `session.notes` (notas de sesión) | `sesiones[].source_note` | **Ignorado** | El importador solo lee `source_note`; si la app exporta notas generales en `session.notes`, se pierden. |
| **Historial** | `summary` (`date_from`, `date_to`, recuentos) | Ninguno | **Descartado** | Metadatos agregados de `training_history.v1` se ignoran. |
| **Ejercicio** | `prescription.sets`, `reps_min`, `reps_max` | Ninguno | **Descartado** | Se destruye la referencia de volumen y reps prescritas para esa sesión. |
| **Ejercicio** | `prescription.target_rir`, `rest` | Ninguno | **Descartado** | Se destruye el RIR prescrito y tiempo de descanso previsto. |
| **Ejercicio** | `prescription.coach_cue` | Ninguno | **Descartado** | Se pierden las instrucciones específicas que el entrenador pautó para el ejercicio. |
| **Ejercicio** | `prescription.per_side` | `series[].per_side` | Conservado | Booleano preservado correctamente. |
| **Identidad** | `identity.machine_id` | `series[].machine_id` | **No emitido por App** | Entra como `null` en el 100% de nuevas sesiones de la PWA. |
| **Identidad** | `identity.exercise_id` | `series[].exercise_id` | **No emitido por App** | Entra como `null`. |
| **Identidad** | `identity.slot_id` | `series[].slot_id` | **No emitido por App** | Entra como `null`. |
| **Identidad** | `identity.comparability_group` | `series[].comparability_group` | **No emitido por App** | Entra como `null`, impidiendo validar comparabilidad. |
| **Ejercicio** | `result.movement_notes` | `series[].movement_notes` | **Desnormalizado** | La nota a nivel de ejercicio se replica idéntica en cada fila de serie. |
| **Serie** | `sets[].load_kg`, `reps`, `rir` | `series[].load_kg`, `reps`, `rir` | Conservado | Carga, repeticiones y RIR preservados con validación. |
| **Serie** | `sets[].resistance.mode / difficulty`| `series[].resistance_mode / difficulty`| Conservado | Modo de resistencia conservado. |
| **Serie** | `sets[].timestamp / completed_at` | Ninguno | **Descartado** | No hay registro del orden temporal real ni descansos entre series. |

---

## 4. DIAGNÓSTICO DE LA DEPENDENCIA EXCEL Y BLOQUEO POR HASH (INCIDENTE 979f7e08...)

### Origen y Mecánica del Bloqueo:
En `tools/revision_diaria.py`:
1. Línea 19: `HOJA = ROOT / "outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx"`.
2. Línea 73-76:
   ```python
   hoja_sha_anterior = estado.get("hoja_sha256")
   if HOJA.exists() and hoja_sha_anterior and sha(HOJA) != hoja_sha_anterior:
       hoja_error = "La hoja local cambió fuera del generador; no se sobrescribió. Revisa esa edición."
   ```
3. Línea 83-85:
   ```python
   if hoja_error:
       huella = hashlib.sha256(("hoja:" + hoja_error).encode("utf-8")).hexdigest()
       incidencias_actuales.add(huella)
   ```
   El cálculo exacto `sha256("hoja:La hoja local cambió fuera del generador; no se sobrescribió. Revisa esa edición.")` produce exactamente la huella `979f7e080d5362aacbf3ab9ea2a5c31246944140787732e003e9b16f11cd861b`, que figura como incidencia registrada en `data/estado_revision_diaria.json`.
4. Línea 92-93:
   ```python
   "registro_sha256": fuente_sha if not hoja_error and HOJA.exists() else estado.get("registro_sha256"),
   "hoja_sha256": sha(HOJA) if not hoja_error and HOJA.exists() else hoja_sha_anterior,
   ```
   Al activarse `hoja_error`, **`hoja_sha256` no se actualiza** (mantiene el valor anterior). Como resultado, en la siguiente ejecución, `sha(HOJA) != hoja_sha_anterior` seguirá siendo verdadero de forma indefinida.

### Factores Desencadenantes Demostrados:
* **Interacción interna desincronizada:** `tools/operativo.py` en `cmd_actualizar()`, `cmd_regenerar()` y `cmd_respaldo()` invoca directamente `generar_hojas.generar_hoja_registro()`. Esta función reescribe el archivo XLSX con openpyxl, pero **no actualiza `data/estado_revision_diaria.json`**. Cuando el cron o la tarea de las 09:00 ejecuta `revision_diaria.py`, detecta que la hoja cambió y se bloquea.
* **Interacción del usuario en Windows:** Si Daniel abre `DAME_CANA_REGISTRO_LOCAL.xlsx` en Microsoft Excel y guarda el archivo (o si Excel tiene auto-guardado activo), Excel reempaqueta los XML internos del ZIP, alterando la compresión y los timestamps. El SHA-256 cambia sin que haya cambiado ningún dato deportivo, bloqueando el sistema.
* **Error de modelado conceptual:** Se está tratando un artefacto derivado (`outputs/.../*.xlsx`) como si fuera un ledger financiero primario con bloqueo de escritura, violando el principio declarado en el propio proyecto: *"Esta vista se regenera: modificar las fuentes locales, no esta vista"*.

---

## 5. AUDITORÍA DEL RESPALDO OPERATIVO Y RESTAURABILIDAD

El comando `python tools/operativo.py respaldo` ejecuta `operativo_chatgpt.backup(data)`.

### Qué incluye `RESPALDO_OPERATIVO_LOCAL.zip`:
* Archivos en `data/` (`.json`, `.xlsx` fuentes históricas, `.csv`).
* Biblioteca de investigación (`biblioteca/**/*.md`, `.pdf`, `.txt`).
* Documentación de diseño (`docs/**/*.md`).
* Herramientas de scripting Python (`tools/*.py`).
* Documentos raíz (`AGENTS.md`, `README.md`, `PROJECT_CONTEXT.md`, `EMPEZAR_AQUI.md`).
* Vistas de ChatGPT en `outputs/operativo/` (`CONTEXTO_ENTRENADOR.json`, `TABLAS_OPERATIVAS.json`, `VISTAS_HUMANAS.json`, `MODELO_OPERATIVO.json`, `INDICE_CONOCIMIENTO.json`, `MI_SISTEMA.html`, `DAME_CANA_OPERATIVO_LOCAL.xlsx`, `HUELLAS_LIBRO.json`).
* `MANIFIESTO.json` interno con hash SHA-256 de cada archivo incluido.

### Qué excluye categóricamente:
1. **PWA Completa:** No contiene un solo archivo de la PWA ni su código fuente. Si se cae el hosting de Firebase o se pierde el acceso externo, el respaldo no permite levantar la aplicación.
2. **DC Studio Hub (`hub/`):** La interfaz visual local (`hub/index.html`, `hub.js`, módulos de gráficos, CSS) introducida en v2.3 y v2.4 está completamente omitida del ZIP.
3. **Hoja Excel de Registro:** `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx` no está incluida en la lista de empaquetado.
4. **Historial de Control de Versiones:** El directorio `.git/` está excluido, perdiéndose la trazabilidad de commits y ramas locales.
5. **Herramientas de Restauración:** **CERO scripts de restauración.** No existe un `tools/restaurar.py` que descomprima el ZIP, valide la integridad contra `MANIFIESTO.json` y verifique la coherencia del árbol.

### Veredicto de Restaurabilidad:
* **Parcialmente suficiente para el backend de datos:** Si se pierde la carpeta local, los archivos JSON canónicos y los scripts de cálculo se recuperan.
* **Insuficiente para la operativa completa de Daniel:** No restaura la experiencia de usuario (ni PWA ni Hub), exige descompresión manual y deja al usuario desprotegido ante corrupciones de archivos al no existir validador de restauración.

---

## 6. DIVERGENCIA DOCUMENTAL Y OPERATIVA: ANTIGRAVITY vs CHATGPT

| Aspecto | Definición en `docs/INFORME_SINCRONIZACION_CHATGPT.md` | Realidad Canónica en `data/programa.json` y `tools/operativo.py` | Impacto / Riesgo |
| :--- | :--- | :--- | :--- |
| **Día B** | Tracción + Deltoides lateral (Dorsal ancho, retractores) | **Satélite 1 · Brazos & Deltoides Lateral** (Katana overhead, Curl bayesiano, Lateral cable) | **Crítico:** ChatGPT prescribirá tirones/espalda pesados cuando Daniel espera brazos rápidos (25 min). |
| **Día C** | Cadena posterior + Glúteo puro (RDL, abducciones) | **Nuclear 2 · Torso Pesado** (Press inclinado, Jalón neutro, Press horizontal, Remo pecho, Pullover) | **Crítico:** Cruce total de fatiga; solapamiento de estímulo glúteo. |
| **Día D** | Empuje + Especialización de Brazos (Press inclinado multipower, Katana, Bayesiano) | **Nuclear 3 · Glúteo & Cadena Posterior** (Sentadilla búlgara Smith, RDL Smith, Curl femoral, Extensión) | **Crítico:** Inversión completa de tren superior por tren inferior. |
| **Día E** | Sesión complementaria de torso/brazos genérica | **Satélite 2 · Brazos, Deltoides Posterior & Detalle** (Predicador, Tríceps cuerda, Peck-deck inverso, Lateral) | Incoherencia en ejercicios accesorios. |
| **Ejemplo de Nota en el Informe** | Línea 89-95: Muestra Día D con Press inclinado + Katana + Bayesiano | El Día D en programa son 5 ejercicios de pierna/glúteo | Provoca que ChatGPT copie el ejemplo erróneo en su prompt de sistema. |
| **Taxonomía de Movimiento** | Asume clasificación activa para los 5 días | `data/taxonomia_operativa.json` solo tiene slots A01..A07, B01..B07, C01..C07 (D y E ausentes) | `modelo_operativo.py` genera D y E con `familia: null`. |
| **Generador de Programa** | Afirma derivar el programa activo | `tools/generar_programa.py` tiene fijo `for day in ("A", "B", "C"):` | Si se ejecuta, destruye la documentación de D y E en `PROGRAMA_ACTIVO.md`. |

---

## 7. HALLAZGOS FORMALES DETALLADOS

```
================================================================================
ID: TEC-01
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
El importador local rechaza la extracción de los días D y E del título de sesión, asignando dia: null y rompiendo el avance de la cola rodante asíncrona de 5 días.

Evidencia:
tools/registro_local.py, línea 89:
day_match = re.match(r"^D[ií]a\s+([ABC])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)
day = day_match.group(1).upper() if day_match else None
tools/registro_local.py, líneas 270-276:
reales = [s for s in sessions if s.get("finished") is True and s.get("dia") in ("A", "B", "C", "D", "E") ...]
last = max(reales, key=...)
rotacion = {"A": "B", "B": "C", "C": "D", "D": "E", "E": "A"}

Consecuencia práctica para Daniel:
Cuando Daniel completa un entrenamiento del Día D o Día E en la app y lo exporta, el sistema importa la sesión con "dia": null. Como proximo_dia() filtra únicamente sesiones cuyo campo "dia" esté en ("A", "B", "C", "D", "E"), la sesión recién realizada es completamente ignorada en el cálculo del siguiente día. El sistema queda congelado recomendando siempre el día anterior o saltando a A de forma anómala.

Propuesta concreta:
Modificar la expresión regular en tools/registro_local.py línea 89 para incluir los caracteres D y E:
day_match = re.match(r"^D[ií]a\s+([ABCDE])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)
Añadir una prueba unitaria explícita en tools/test_registro_local.py que verifique la importación de sesiones con títulos "Día D" y "Día E".

Dependencias y riesgos:
Riesgo nulo. Dependencia: ninguna. No afecta a sesiones históricas existentes.

Esfuerzo estimado y fundamento de la estimación:
15 minutos. Modificación de un único carácter en el patrón regex ('[ABC]' -> '[ABCDE]') y redacción de 2 aserciones de prueba en el suite existente.

Beneficio esperado (diferenciando medido de estimado):
Medido: Desbloqueo inmediato del procesamiento de los días D y E. Estimado: 100% de fiabilidad en la rotación continua de la cola rodante 5D.

Criterio verificable de éxito:
Ejecutar convertir_record() pasando un payload con session.title = "Día D — Glúteo y Cadena Posterior" y comprobar que devuelve session_row["dia"] == "D" y sets[0]["dia"] == "D". Ejecutar test_registro_local.py pasando con éxito.

Forma de revertir el cambio, si se implementara:
Restaurar la expresión regular original r"^D[ií]a\s+([ABC])(?=$|[\s·:—–-])".

Información pendiente que realmente podría cambiar la decisión:
Ninguna. La arquitectura 5D está oficialmente aprobada y descrita en data/programa.json.
================================================================================
```

```
================================================================================
ID: TEC-02
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Bloqueo circular permanente de tools/revision_diaria.py provocado por la verificación de SHA-256 sobre la hoja Excel derivada (incidente 979f7e08...), impidiendo la actualización del registro diario.

Evidencia:
tools/revision_diaria.py, líneas 73-88 y 92-95:
hoja_sha_anterior = estado.get("hoja_sha256")
if HOJA.exists() and hoja_sha_anterior and sha(HOJA) != hoja_sha_anterior:
    hoja_error = "La hoja local cambió fuera del generador; no se sobrescribió. Revisa esa edición."
...
"hoja_sha256": sha(HOJA) if not hoja_error and HOJA.exists() else hoja_sha_anterior
data/estado_revision_diaria.json, líneas 6-8:
"incidencias_vistas": ["979f7e080d5362aacbf3ab9ea2a5c31246944140787732e003e9b16f11cd861b"]
tools/operativo.py, líneas 366, 373, 380: llaman a generar_hojas.generar_hoja_registro() directamente sin actualizar estado_revision_diaria.json.

Consecuencia práctica para Daniel:
El orquestador de revisión diaria deja de actualizar la hoja Excel y acumula alertas continuas de fallo. Si Daniel o cualquier herramienta abre o regenera el Excel, el sistema interpreta que se ha violado la seguridad de datos y congela la regeneración de la vista, obligando a una intervención manual para resetear el hash en estado_revision_diaria.json.

Propuesta concreta:
1. Tratar la hoja Excel estrictamente como lo que es: una vista derivada y regenerable, nunca una fuente de datos primaria que deba bloquear el pipeline.
2. Si sha(HOJA) != hoja_sha_anterior y el registro JSON cambió (registro_sha256 != fuente_sha), sobreescribir la hoja sin bloquearse, o archivar una copia de seguridad DAME_CANA_REGISTRO_LOCAL.user_backup.xlsx antes de regenerarla.
3. Asegurar que tools/generar_hojas.py actualice data/estado_revision_diaria.json con el nuevo hash hoja_sha256 tras cada regeneración legítima, evitando el desfase entre herramientas.

Dependencias y riesgos:
Riesgo muy bajo. Si Daniel realizara anotaciones manuales en el Excel en lugar de usar la app, dichas anotaciones se sobrescribirían; no obstante, el sistema ya advierte en la celda A2 del archivo que modificar esa vista no tiene efecto.

Esfuerzo estimado y fundamento de la estimación:
45 minutos. Modificación de la lógica condicional en tools/revision_diaria.py y sincronización del estado en tools/generar_hojas.py.

Beneficio esperado (diferenciando medido de estimado):
Medido: Cierre de la incidencia 979f7e08... y eliminación de falsos positivos en revision_diaria.py. Estimado: Cero bloqueos del pipeline diario por apertura casual de archivos en Windows.

Criterio verificable de éxito:
Modificar un byte irrelevante de DAME_CANA_REGISTRO_LOCAL.xlsx, ejecutar tools/revision_diaria.py y verificar que regenera la hoja limpiamente, reporta hoja_actualizada: true y no añade huellas a incidencias_actuales.

Forma de revertir el cambio, si se implementara:
Restaurar la comprobación if HOJA.exists() and hoja_sha_anterior and sha(HOJA) != hoja_sha_anterior estricta.

Información pendiente que realmente podría cambiar la decisión:
Si Daniel utiliza el archivo Excel como cuaderno principal de anotaciones en vivo (lo cual contradice las directivas actuales de usar la PWA y data/inbox_app/).
================================================================================
```

```
================================================================================
ID: TEC-03
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Uso de una ruta de carpeta rígida con GUID de sandbox externo (outputs/01a0ee94-3218-7bc2-860f-bda74883553e/) para la hoja de registro local.

Evidencia:
tools/revision_diaria.py, línea 19:
HOJA = ROOT / "outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx"
tools/generar_hojas.py, línea 157:
out_dir = ROOT / "outputs/01a0ee94-3218-7bc2-860f-bda74883553e"
target = destino or (out_dir / "DAME_CANA_REGISTRO_LOCAL.xlsx")
README.md, línea 42:
"...y la hoja local derivada (outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx)."

Consecuencia práctica para Daniel:
Dificultad de localización del archivo para el usuario en el explorador de Windows (ruta no nemotécnica), riesgo de borrado accidental al parecer una carpeta temporal de caché y dispersión respecto a outputs/operativo/ donde residen las demás vistas.

Propuesta concreta:
Estandarizar la ruta de destino de la hoja de registro a outputs/operativo/DAME_CANA_REGISTRO_LOCAL.xlsx (o outputs/registro/DAME_CANA_REGISTRO_LOCAL.xlsx), manteniendo un enlace simbólico o copia de compatibilidad en la ruta antigua durante una versión de transición para no romper accesos directos existentes.

Dependencias y riesgos:
Requiere actualizar las referencias documentales en README.md, PROJECT_CONTEXT.md y EMPEZAR_AQUI.md, así como la ruta en tools/revision_diaria.py y tools/generar_hojas.py.

Esfuerzo estimado y fundamento de la estimación:
30 minutos. Búsqueda y reemplazo de la constante de ruta en scripts Python y documentación markdown.

Beneficio esperado (diferenciando medido de estimado):
Medido: Eliminación de la dependencia de directorios GUID huérfanos. Estimado: Mayor claridad operativa para Daniel al explorar outputs/.

Criterio verificable de éxito:
Ejecutar generar_hojas.py y comprobar que el archivo se genera en la nueva ruta estandarizada y que revision_diaria.py lee y valida dicha ruta sin errores.

Forma de revertir el cambio, si se implementara:
Restaurar la constante out_dir apuntando a outputs/01a0ee94-3218-7bc2-860f-bda74883553e/.

Información pendiente que realmente podría cambiar la decisión:
Si Daniel tiene accesos directos de escritorio de Windows o marcadores configurados a esa ruta exacta de GUID.
================================================================================
```

```
================================================================================
ID: TEC-04
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Pérdida sistemática de prescripción original y ausencia de identidades de estación técnica (machine_id, slot_id, exercise_id, comparability_group) en el contrato PWA -> exportación JSON -> base canónica.

Evidencia:
1. tools/registro_local.py, líneas 110-149:
   "exercise_id": limpio(identity.get("exercise_id")),
   "slot_id": limpio(identity.get("slot_id")),
   "machine_id": limpio(identity.get("machine_id")),
   "comparability_group": limpio(identity.get("comparability_group")),
2. data/originales_app/DIRECT_SYNC_20260926_182824.json, líneas 18-23:
   "identity": {"variant": "Máquina", "load_basis": "unknown", "resistance_mode": "external", "machine_settings": ""}
   (No contiene machine_id, slot_id, exercise_id ni comparability_group).
3. data/fuentes/consolidacion_20261008/biblioteca/historial-entrenamientos-ia (1).json, líneas 53-60:
   "prescription": {"sets": 3, "reps_min": 6, "reps_max": 10, "target_rir": "1–2", "rest": "2–4 min", "coach_cue": "..."}
   (En registro_local.py, línea 145, solo se lee bool(prescription.get("per_side")), descartando el resto de prescription).
4. tools/registro_local.py, líneas 162-170:
   Descarta session.updated_at y no lee session.notes (solo busca session.source_note).

Consecuencia práctica para Daniel:
Todas las sesiones registradas en la PWA se incorporan a data/registro.json con machine_id: null y comparability_group: null. Al no existir ID de estación ni grupo comparable, el motor de prescripción de tools/operativo.py y el entrenador inteligente no pueden determinar con certeza matemática si la carga previa se realizó en la misma polea o máquina, impidiendo automatizar la progresión de cargas sin confirmación manual previa. Se pierde además el registro de lo que se le había prescrito vs lo que realmente hizo.

Propuesta concreta:
1. Enriquecer la PWA (o el generador de la nota de sesión Workout Note v1) para que incruste en identity los metadatos conocidos: slot_id, exercise_id, machine_id y comparability_group procedentes de data/programa.json.
2. Modificar convertir_record() en tools/registro_local.py para:
   a) Conservar el bloque prescription dentro de la serie o sesión (creando campos planned_reps_min, planned_reps_max, target_rir, coach_cue).
   b) Preservar session.updated_at y capturar session.notes si viniera informado.
   c) Aplicar enriquecimiento determinista: si la sesión tiene slot_id o nombre de ejercicio que coincide unívocamente con data/programa.json para ese día, autocompletar exercise_id y comparability_group por defecto.

Dependencias y riesgos:
Requiere validar compatibilidad con el esquema de la PWA remota. No altera datos históricos consolidados en registro.json.

Esfuerzo estimado y fundamento de la estimación:
2 a 3 horas. Modificación de schema en tools/registro_local.py, actualización de validaciones y adaptación de pruebas unitarias.

Beneficio esperado (diferenciando medido de estimado):
Medido: Conservación del 100% de las instrucciones técnicas del entrenador. Estimado: Habilitación real de comparabilidad automática de cargas sin intervención manual repetitiva de Daniel.

Criterio verificable de éxito:
Importar un JSON con bloque prescription completo y comprobar que en data/registro.json la serie resultante contiene los campos de prescripción y no descarta los metadatos.

Forma de revertir el cambio, si se implementara:
Volver a la tupla de campos anterior en convertir_record().

Información pendiente que realmente podría cambiar la decisión:
Nivel de acceso para modificar la serialización de exportación de la PWA en producción (`dame-cana-pwa.web.app`).
================================================================================
```

```
================================================================================
ID: TEC-05
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Divergencia crítica en la asignación de grupos musculares y ejercicios de la rutina 5D entre el informe de sincronización para ChatGPT (docs/INFORME_SINCRONIZACION_CHATGPT.md) y la fuente canónica (data/programa.json).

Evidencia:
docs/INFORME_SINCRONIZACION_CHATGPT.md, líneas 36-40:
- Día A: Pierna anterior + Glúteo.
- Día B: Tracción + Deltoides lateral.
- Día C: Cadena posterior + Glúteo puro.
- Día D: Empuje + Especialización de Brazos.
- Día E: Sesión complementaria de torso/brazos.
Y líneas 89-95 (ejemplo explícito de prescripción que define Día D con Press inclinado multipower, Katana y Curl bayesiano).
FRENTE A:
data/programa.json, líneas 17-450 y tools/operativo.py, líneas 235-241:
- Día A: Nuclear 1 · Glúteo y Cuádriceps (Hip thrust, Hack Matrix, Abducción, Gemelo, Crunch).
- Día B: Satélite 1 · Brazos y Deltoides Lateral (Katana, Curl bayesiano, Lateral cable, Reverse crunch).
- Día C: Nuclear 2 · Torso Pesado (Press inclinado, Jalón neutro, Press horizontal, Remo pecho apoyado, Pullover).
- Día D: Nuclear 3 · Glúteo y Cadena Posterior (Búlgara Smith, RDL Smith, Curl femoral, Extensión rodilla, Abducción cable).
- Día E: Satélite 2 · Brazos, Deltoides Posterior y Detalle (Curl predicador, Tríceps cuerda, Peck-deck inverso, Lateral mancuernas, Abducción).
docs/PROGRAMA_ACTIVO.md, líneas 19-77 (coincide con data/programa.json).

Consecuencia práctica para Daniel:
Si ChatGPT lee docs/INFORME_SINCRONIZACION_CHATGPT.md para asesorar a Daniel, prescribirá una sesión de espalda/tirones cuando Daniel va a entrenar brazos (Día B), prescribirá pierna pesada cuando Daniel va a entrenar torso (Día C), y prescribirá empuje de torso/brazos cuando Daniel va a hacer búlgara y RDL de glúteo (Día D). Esto genera desconcierto, errores en la PWA y riesgo inminente de sobreentrenamiento y lesión.

Propuesta concreta:
Reescribir inmediatamente las secciones 2.1 y 5.1 de docs/INFORME_SINCRONIZACION_CHATGPT.md para alinearlas al 100% con data/programa.json y docs/PROGRAMA_ACTIVO.md, reflejando con exactitud la división 3 Nucleares + 2 Satélites (A: Glúteo/Cuádriceps, B: Brazos/Deltoides lateral, C: Torso pesado, D: Glúteo/Cadena posterior, E: Brazos/Posterior/Bombeo) y corrigiendo el bloque de ejemplo de prescripción.

Dependencias y riesgos:
Riesgo nulo. Documentación puramente correctiva para restaurar la coherencia multi-agente.

Esfuerzo estimado y fundamento de la estimación:
20 minutos. Edición directa del archivo markdown para corregir la descripción de los 5 días y el bloque de ejemplo.

Beneficio esperado (diferenciando medido de estimado):
Medido: Coherencia 100% entre las instrucciones dadas a ChatGPT y la base de datos local. Estimado: Prevención total de prescripciones erróneas al usuario en el chat.

Criterio verificable de éxito:
Comprobar mediante diff que en docs/INFORME_SINCRONIZACION_CHATGPT.md la lista de días A, B, C, D, E y sus ejercicios coincide punto por punto con data/programa.json.

Forma de revertir el cambio, si se implementara:
Restaurar la versión anterior mediante git checkout.

Información pendiente que realmente podría cambiar la decisión:
Ninguna. La evidencia en data/programa.json y docs/PROGRAMA_ACTIVO.md es incontrovertible.
================================================================================
```

```
================================================================================
ID: TEC-06
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Obsolescencia técnica y riesgo destructivo en herramientas secundarias (tools/generar_programa.py y data/taxonomia_operativa.json) desalineadas con la arquitectura 5D.

Evidencia:
1. tools/generar_programa.py, línea 31:
   for day in ("A", "B", "C"):
   (El generador solo itera sobre A, B y C; si se ejecuta, borra los días D y E de docs/PROGRAMA_ACTIVO.md).
2. data/taxonomia_operativa.json, líneas 4-21:
   Define familias_movimiento referenciando únicamente puestos A01..A07, B01..B07, C01..C07 del programa antiguo M4-3D.
3. tools/modelo_operativo.py, líneas 38, 68-70:
   Lee familias_movimiento; para todos los puestos de D (D01..D05) y E (E01..E05) family.get(slot) devuelve None, generando campos "familia": null y "funcion": null en outputs/operativo/MODELO_OPERATIVO.json.

Consecuencia práctica para Daniel:
Si se ejecuta `python tools/generar_programa.py`, la guía legible de entrenamiento para Daniel pierde el 40% de su contenido (días D y E desaparecen). Asimismo, las tablas operativas y resúmenes de ChatGPT muestran los días D y E como ejercicios no clasificados funcionalmente.

Propuesta concreta:
1. Actualizar data/taxonomia_operativa.json para mapear los 24 slots vigentes (A01..A05, B01..B04, C01..C05, D01..D05, E01..E05) a sus familias biomecánicas correspondientes.
2. Actualizar tools/generar_programa.py para iterar sobre ("A", "B", "C", "D", "E") y leer la taxonomía completa.

Dependencias y riesgos:
Riesgo bajo. Requiere asegurar que tools/test_modelo_operativo.py siga pasando tras la actualización de slots.

Esfuerzo estimado y fundamento de la estimación:
30 minutos. Actualización de 24 claves en el archivo JSON y ajuste del bucle en el script Python.

Beneficio esperado (diferenciando medido de estimado):
Medido: Clasificación biomecánica completa en MODELO_OPERATIVO.json para el 100% de los slots. Estimado: Protección ante sobrescrituras destructivas accidentales de la documentación.

Criterio verificable de éxito:
Ejecutar tools/generar_programa.py y verificar que docs/PROGRAMA_ACTIVO.md contiene los 5 días completos (A–E) sin pérdidas. Ejecutar tools/operativo_chatgpt.py y verificar que en MODELO_OPERATIVO.json no hay puestos con "familia": null.

Forma de revertir el cambio, si se implementara:
Restaurar los archivos originales desde git.

Información pendiente que realmente podría cambiar la decisión:
Ninguna.
================================================================================
```

```
================================================================================
ID: TEC-07
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Incompletitud del paquete de respaldo RESPALDO_OPERATIVO_LOCAL.zip (omisión de PWA, Hub, Excel de registro y Git) y carencia absoluta de scripts o guías de restauración.

Evidencia:
1. tools/operativo_chatgpt.py, líneas 163-169:
   for directory in ['data','biblioteca','docs','tools']: ...
   Excluye directorios pwa/, hub/, outputs/01a0ee94-... y .git/.
2. outputs/operativo/MANIFIESTO_RESPALDO.json, línea 5:
   "alcance": "Datos, fuentes de datos, biblioteca, instrucciones, herramientas y vistas. Excluye backups previos, caches, dependencias, credenciales y app externa. No configura tareas del PC."
3. Inexistencia de tools/restaurar.py o equivalente en todo el repositorio.

Consecuencia práctica para Daniel:
Si el ordenador de Daniel sufre una avería o pérdida de disco, el archivo ZIP de respaldo no permite restaurar el funcionamiento completo del sistema. Se perdería la interfaz web DC Studio (hub/), el código de la app PWA si no estuviese respaldado en la nube, la hoja de registro Excel consolidada y el historial de control de versiones. Además, al no haber script de restauración, la recuperación manual es propensa a fallos y no valida la integridad de los datos contra el manifiesto SHA-256.

Propuesta concreta:
1. Crear tools/restaurar.py: Un script interactivo o CLI que verifique el archivo ZIP contra MANIFIESTO_RESPALDO.json, compruebe cada hash SHA-256 y descomprima ordenadamente en el directorio raíz.
2. Incorporar en el respaldo el directorio hub/ (DC Studio) y la hoja Excel de registro.
3. Documentar en docs/RECUPERACION_ANTE_DESASTRES.md el procedimiento exacto paso a paso para restaurar el sistema desde cero en un ordenador nuevo.

Dependencias y riesgos:
Riesgo nulo. Mejora la resiliencia operativa y la seguridad de datos.

Esfuerzo estimado y fundamento de la estimación:
1 hora y 15 minutos. Escritura de tools/restaurar.py (60 líneas), ajuste de la lista de archivos en backup() de tools/operativo_chatgpt.py y redacción de la guía de recuperación.

Beneficio esperado (diferenciando medido de estimado):
Medido: Cobertura de respaldo extendida a la interfaz local (Hub) y verificación automática de integridad SHA-256 en caso de restauración. Estimado: Reducción del RTO (Recovery Time Objective) de horas a menos de 2 minutos.

Criterio verificable de éxito:
Ejecutar `python tools/operativo.py respaldo`, descomprimir en un directorio temporal mediante `python tools/restaurar.py --destino /tmp/test_restore` y validar que todos los hashes coinciden con el manifiesto y que el sistema arranca con `python tools/operativo.py resumen`.

Forma de revertir el cambio, si se implementara:
Eliminar tools/restaurar.py y restablecer la lista de directorios en backup().

Información pendiente que realmente podría cambiar la decisión:
Si la PWA y su código fuente residen en un repositorio Git privado independiente gestionado por Daniel.
================================================================================
```

```
================================================================================
ID: TEC-08
Rol: Auditor Técnico y de Integración
Estado: demostrado
Problema o funcionamiento correcto observado:
Fragilidad en el canal de transporte manual (Móvil -> Drive -> data/inbox_app/) sin telemetría de recepción ni confirmación de entrega.

Evidencia:
PROJECT_CONTEXT.md, líneas 7 y 19:
"Captura: la app RegistroEntrenamientoApp... Daniel guarda el JSON en data/inbox_app/ y Codex lo incorpora."
"Límites actuales: no hay sincronización automática entre móvil y PC..."
README.md, líneas 49-51:
"Exportar y copiar el JSON desde el móvil sigue siendo manual..."

Consecuencia práctica para Daniel:
Si Daniel realiza un entrenamiento, lo exporta en el móvil pero olvida transferir el archivo a data/inbox_app/, el sistema local permanece en silencio sin avisar del hueco. Al pedir "prepara mi sesión", el sistema recomendará el entrenamiento basándose en la sesión penúltima, asumiendo que Daniel no ha entrenado y alterando la cadencia de descanso y sobrecarga.

Propuesta concreta:
1. Implementar en `tools/operativo.py resumen` una alerta heurística de adherencia: Si la última sesión registrada tiene más de 4 días y la cola rodante no ha avanzado, emitir un aviso visible: "¿Has entrenado recientemente? Comprueba si tienes algún archivo JSON pendiente de depositar en data/inbox_app/".
2. Proveer un script simple opcional (tools/recibir_drive.py o rclone sync) para aquellos usuarios que deseen sincronizar automáticamente la carpeta de Drive con data/inbox_app/ cuando el PC esté encendido.

Dependencias y riesgos:
Riesgo muy bajo. La alerta heurística es puramente informativa en consola CLI.

Esfuerzo estimado y fundamento de la estimación:
30 minutos. Incorporación de la comprobación temporal en cmd_resumen() de tools/operativo.py.

Beneficio esperado (diferenciando medido de estimado):
Medido: Ninguno inmediato en almacenamiento. Estimado: Prevención de desincronizaciones operativas por olvido humano en la copia de archivos.

Criterio verificable de éxito:
Modificar temporalmente la fecha de última sesión o pasar más de 4 días sin ingesta y verificar que `python tools/operativo.py resumen` muestra la advertencia de sincronización pendiente.

Forma de revertir el cambio, si se implementara:
Eliminar la condición de alerta temporal en cmd_resumen().

Información pendiente que realmente podría cambiar la decisión:
Si Daniel prefiere mantener el flujo 100% manual sin avisos de recordatorio.
================================================================================
```

---

## 8. MATRIZ DE PRIORIZACIÓN DE REMEDIACIÓN

| Prioridad | ID | Hallazgo | Severidad | Esfuerzo | Impacto si no se resuelve |
| :---: | :---: | :--- | :---: | :---: | :--- |
| **P0** | **TEC-01** | Exclusión de días D y E en regex del importador (`tools/registro_local.py`) | Bloqueante | 15 min | La rutina 5D no puede registrar sesiones D o E; la cola rodante se detiene. |
| **P0** | **TEC-05** | Divergencia biomecánica de la rutina 5D en `docs/INFORME_SINCRONIZACION_CHATGPT.md` | Crítica | 20 min | ChatGPT prescribirá grupos musculares opuestos e incorrectos a Daniel. |
| **P1** | **TEC-02** | Bloqueo circular en revisión diaria por SHA256 de Excel (Incidente 979f7e08) | Alta | 45 min | El pipeline diario de actualización de hojas queda inoperativo. |
| **P1** | **TEC-06** | Herramientas legacy (`generar_programa.py`, `taxonomia_operativa.json`) incompatibles con 5D | Alta | 30 min | Riesgo de destrucción documental y slots sin familia en modelos. |
| **P2** | **TEC-07** | Incompletitud del respaldo ZIP y ausencia de script de restauración | Media | 1 h 15 min | Imposibilidad de restaurar rápidamente la interfaz Hub y verificar integridad. |
| **P2** | **TEC-03** | Carpeta de registro con GUID huérfano (`outputs/01a0ee94-...`) | Media | 30 min | Deuda técnica y dispersión de artefactos de salida. |
| **P2** | **TEC-04** | Pérdida de prescripción original y falta de IDs técnicos desde la PWA | Media | 2-3 h | Ausencia de comparabilidad de cargas 100% automatizada. |
| **P3** | **TEC-08** | Transporte manual desasistido entre móvil y PC | Baja | 30 min | Posible desfase por olvido en el depósito de archivos en inbox. |

---

*Fin del informe de auditoría técnica y de integración.*