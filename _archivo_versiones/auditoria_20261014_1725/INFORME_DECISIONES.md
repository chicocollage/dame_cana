# INFORME DE AUDITORÍA DE DECISIONES DEL ENTRENADOR · SISTEMA DAME CAÑA

**Rol:** Auditor de Decisiones del Entrenador  
**Destinatario:** Agente Coordinador (ID: `22af0f0d-e5b9-4c6b-8db6-b82886969254`)  
**Fecha:** 14 de octubre de 2026  
**Fuentes auditadas:**
- [`docs/REGLAS_DEL_ENTRENADOR.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/REGLAS_DEL_ENTRENADOR.md)
- [`docs/PERFIL_PERSONAL_UNIFICADO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PERFIL_PERSONAL_UNIFICADO.md)
- [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json)
- [`data/confirmaciones_usuario.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/confirmaciones_usuario.json)
- [`data/programa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/programa.json)
- [`docs/PROGRAMA_ACTIVO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PROGRAMA_ACTIVO.md)
- [`docs/INFORME_SINCRONIZACION_CHATGPT.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/INFORME_SINCRONIZACION_CHATGPT.md)
- [`data/taxonomia_operativa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/taxonomia_operativa.json)
- [`data/modelo_operativo.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/modelo_operativo.json)
- [`data/registro.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/registro.json)
- [`data/seguimiento.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/seguimiento.json)
- [`data/conflictos_fuentes.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/conflictos_fuentes.json)
- [`tools/operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py)
- [`tools/registro_local.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/registro_local.py)
- [`tools/operativo_chatgpt.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo_chatgpt.py)
- [`tools/modelo_operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/modelo_operativo.py)

---

## 1. RESUMEN EJECUTIVO

La auditoría revela que el sistema DAME CAÑA posee un sólido cuerpo teórico de reglas de prudencia biomecánica y respeto al usuario, pero **sufre desconexiones críticas entre la teoría de sus reglas y la implementación real del código y los flujos documentales**. 

Especialmente grave es la reciente transición (14/10/2026) del split de 3 días (M4-3D) al de 5 días en cola rodante (M5-5D):
1. **Ruptura de la cola rodante en código:** El importador local de la app ([`registro_local.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/registro_local.py#L89)) tiene hardcodeada una expresión regular `r"^D[ií]a\s+([ABC])"` que ignora los Días D y E, impidiendo que el motor derive el siguiente día del ciclo 5D.
2. **Ceguera histórica de cargas al cambiar de día:** [`cmd_sesion`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py#L249-L255) sólo busca exposiciones previas dentro de la última sesión del mismo día (`dia == dia_objetivo`). Al mover ejercicios entre días (ej. RDL pasó de Día B a Día D; Remo pasó de Día B a Día C; Predicador pasó a Día E), el prescriptor ignora el historial real de marcas y aconseja "calibrar carga inicial a ciegas".
3. **Disparidad crítica entre Antigravity y ChatGPT:** [`docs/INFORME_SINCRONIZACION_CHATGPT.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/INFORME_SINCRONIZACION_CHATGPT.md#L36-L40) describe el split 5D con una estructura totalmente distinta a la que tienen [`data/programa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/programa.json) y [`docs/PROGRAMA_ACTIVO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PROGRAMA_ACTIVO.md). ChatGPT cree que el Día B es "Tracción/Dorsal" y el Día C es "Cadena posterior", mientras que la app local tiene el Día B como "Brazos/Deltoides" y el Día C como "Torso pesado".
4. **Falta de evidencia en progresión de volumen:** Se prescribió un salto de 3 a 5 días y se triplicó el volumen de brazos pese a que Daniel promediaba entre 1.6 y 2.5 sesiones reales por semana en septiembre-octubre, contraviniendo la regla explícita de comprobar adherencia real sostenible antes de añadir especializaciones.
5. **Obsolescencia documental:** Datos de dolor articular de hace 2 meses (agosto 2026) siguen catalogados como `CONFIRMADO_ACTUAL` en [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json#L52).

---

## 2. ANÁLISIS DE LAS CUATRO TAREAS ESPECÍFICAS

### Tarea 1: Reconstrucción del flujo exacto de prescripción de una sesión

El flujo técnico de decisión ejecutado por `python tools/operativo.py sesion [DIA]` se articula así:
1. **Determinación del Día:**
   - Si se pasa un argumento por CLI, se usa ese día forzado.
   - Si no se pasa argumento, consulta `registro_local.resumen()['siguiente_dia']`.
   - Este se calcula en [`proximo_dia(sessions)`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/registro_local.py#L269-L276) localizando la última sesión finalizada en `data/registro.json` y aplicando el mapa circular `{"A": "B", "B": "C", "C": "D", "D": "E", "E": "A"}`.
   - **Fallo observado:** En [`convertir_record`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/registro_local.py#L89), la extracción del día desde el título de la app se hace con `re.match(r"^D[ií]a\s+([ABC])(?=$|[\s·:—–-])", ...)`. Cualquier sesión exportada por la app como "Día D" o "Día E" almacena `dia = None`. En consecuencia, `proximo_dia()` nunca encuentra Días D o E, y la rotación automática se bloquea.
2. **Selección de Ejercicios:**
   - Lee [`data/programa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/programa.json) y filtra los puestos cuyo campo `dia` coincide con el día objetivo (`slots_dia`).
   - La selección de ejercicios es estática e inflexible: toma `s['ejercicio_selector']`, `s['series_base']`, `s['repeticiones']`, `s['rir_operativo']` y `s['descanso']`. No hay consulta dinámica al catálogo de sustituciones de [`data/catalogos.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/catalogos.json) salvo si se suministra el modificador manual `--variante SLOT:VAR_ID` desde la línea de comandos.
3. **Cálculo de la Carga Recomendada y Rol de `aconsejar_doble_progresion()`:**
   - Para el día dado, filtra todas las sesiones históricas donde `s['dia'] == dia` y toma la de fecha más reciente (`ultima_sesion_dia`).
   - Toma las series asociadas a esa sesión (`series_ultima`).
   - Ejecuta `match_ejercicio(row)` comparando el nombre del ejercicio mediante coincidencia parcial de texto (`slot_name.split(';')[0].split('(')[0].strip() in row_name`).
   - Si no encuentra series previas (lo que ocurre siempre en Día D y E, o cuando un ejercicio se cambió de día), concluye `historial_str = "ninguno comparable"` y llama a [`aconsejar_doble_progresion()`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py#L97-L140) con lista vacía.
   - `aconsejar_doble_progresion()` analiza:
     - Si no hay series previas con repeticiones: aconseja "Calibrar carga inicial... Iniciar con peso moderado para fijar base sin exceder RIR 2".
     - Si todas las series de la última exposición igualaron o superaron el tope del rango (`all(rp >= rep_max for rp in reps_list)`): prescribe **subir de carga** ("subir al siguiente incremento disponible (+1 a +2.5 kg en placas/mancuernas, o +2.5 a +5 kg en barras/discos) y consolidar reps").
     - Si las cargas fueron escalonadas: aconseja unificar a la carga más pesada (`carga_max`).
     - Si están cerca del tope: mantener carga y cerrar las repeticiones tope.
     - Si están en rango medio: buscar sumar repeticiones (+1 a +2).
     - Si alguna serie cayó por debajo del rango: asegurar que entren limpias en el rango.

---

### Tarea 2: Contraste entre las reglas del entrenador y la realidad del código

| Regla del Entrenador ([`REGLAS_DEL_ENTRENADOR.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/REGLAS_DEL_ENTRENADOR.md)) | Implementación en Código ([`tools/operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py)) | Diagnóstico de Cumplimiento |
| :--- | :--- | :--- |
| **No inventar saltos de carga** (Línea 23: *"Confirmar el salto real de esa estación; no inventarlo"*). | [`operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py#L116): Prescribe literalmente: `"+1 a +2.5 kg en placas/mancuernas, o +2.5 a +5 kg en barras/discos"`. | **INCUMPLE (Violación directa).** Inventa escalones estándar sin verificar el selector de placas ni los incrementos de la estación concreta. |
| **Consolidar en al menos 2 exposiciones comparables** (Línea 23: *"con técnica y RIR estables en al menos dos exposiciones comparables"*). | [`operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py#L113): Evalúa únicamente `series_previas` de **una sola sesión** (`ultima_sesion_dia`). Si en esa única sesión se llegó a `rep_max`, ordena subir de peso. | **INCUMPLE.** Prescribe subida de carga prematura con N=1 exposición, sin comprobar consistencia longitudinal ni técnica. |
| **No transferir pesos entre máquinas distintas** (Línea 17: *"No convierte en equivalentes las cargas de dos máquinas o variantes. Una sustitución reinicia la línea de carga"*). | [`operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py#L283-L299): `match_ejercicio()` busca sólo por subcadena de texto. No comprueba `machine_id`, ni `load_basis`, ni `comparability_group`. | **INCUMPLE.** Si una sesión previa usó otra máquina con el mismo nombre genérico, traslada la carga íntegra a la nueva estación. |
| **No usar datos de salud obsoletos de agosto** (Línea 9: *"No reutilices como actuales los 0/10 de agosto"*). | [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json#L52, #L64, #L76, #L88): Las entradas `STATE-LUMBAR`, `STATE-HIP`, `STATE-KNEE`, `STATE-SHOULDER` tienen estado `CONFIRMADO_ACTUAL`. | **INCUMPLE.** La base de estado clasifica formalmente como confirmado actual datos con 62 días de antigüedad. |

---

### Tarea 3: Auditoría de vigencia del perfil personal, estado dinámico y preguntas innecesarias

1. **Datos de Salud Obsoletos en [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json):**
   - Las claves `dolor_lumbar` (Línea 52), `cadera` (Línea 64), `rodillas` (Línea 76) y `hombro_derecho` (Línea 88), todas con `fecha_corte: "2026-08-13"` / `"2026-08-14"`, están catalogadas bajo el enum `"estado": "CONFIRMADO_ACTUAL"`.
   - Aunque la nota a pie de archivo (Línea 225) y las reglas afirman que no deben usarse, el motor semántico y cualquier agente que consulte el JSON lee un estado formal `CONFIRMADO_ACTUAL`.
2. **Contradicciones Flagrantes entre Documentos:**
   - **Split 3D vs 5D en Decisiones:** En [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json#L134-L145), la decisión fundacional `D-2026-08-13-01` (*"Mantener M4 integral 3D"*) figura en estado `ACTIVA` y con `"Sustituida/cerrada por": null`, a pesar de que el 14/10/2026 se registró la decisión `D-2026-10-14-ROTLOG-5D` (Línea 212) también como `ACTIVA` para sustituir a M4. Ambas decisiones coexisten como activas.
   - **Disparidad Total del Split 5D entre Antigravity y ChatGPT:**
     - En [`docs/INFORME_SINCRONIZACION_CHATGPT.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/INFORME_SINCRONIZACION_CHATGPT.md#L36-L40), se informa a ChatGPT de que el split 5D es:  
       *Día A:* Pierna anterior + Glúteo  
       *Día B:* Tracción + Deltoides lateral  
       *Día C:* Cadena posterior + Glúteo puro  
       *Día D:* Empuje + Brazos  
       *Día E:* Sesión complementaria de torso/brazos  
     - En [`data/programa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/programa.json) y [`docs/PROGRAMA_ACTIVO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PROGRAMA_ACTIVO.md), el split 5D es:  
       *Día A:* Nuclear 1 · Glúteo & Cuádriceps  
       *Día B:* Satélite 1 · Brazos & Deltoides lateral (Katana, Bayesiano, Lateral, Crunch)  
       *Día C:* Nuclear 2 · Torso Pesado (Press inclinado, Jalón, Press horizontal, Remo, Pullover)  
       *Día D:* Nuclear 3 · Glúteo & Cadena Posterior (Búlgara, RDL, Femoral sentado, Extensión rodilla, Abducción)  
       *Día E:* Satélite 2 · Brazos, Deltoides Posterior & Detalle (Predicador, Tríceps cuerda, Peck-deck inverso, Lateral mancuernas, Vaciado)  
     - **Consecuencia:** Si ChatGPT prescribe una sesión de Día B, generará una sesión pesada de tracción/dorsal creyendo que es lo acordado, mientras que Daniel abrirá la app esperando una sesión satélite de brazos de 25 minutos.
   - **Obsolescencia de [`data/taxonomia_operativa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/taxonomia_operativa.json):** El archivo conserva únicamente el mapeo del split 3D (A01–A07, B01–B07, C01–C07). En [`tools/modelo_operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/modelo_operativo.py#L38-L72), los puestos D01–D05 y E01–E05 quedan sin familia (`None`), y puestos reutilizados como B01 (Katana) quedan clasificados como "extensión de cadera", o B02 (Curl bayesiano) como "flexión de rodilla".
3. **Preguntas Innecesarias que Friccionan a Daniel:**
   - La tabla de *Respuestas pendientes* de [`PERFIL_PERSONAL_UNIFICADO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PERFIL_PERSONAL_UNIFICADO.md#L104-L122) contiene 19 campos en blanco que se reiteran como pendientes:
     - *Fecha de nacimiento exacta:* Daniel tiene 43 años confirmados; saber el día exacto de nacimiento no cambia el volumen de cuádriceps ni la selección de ejercicios.
     - *Uso futuro del suplemento de 5 lb:* Daniel ya confirmó explícitamente el 09/10/2026: *"aún no he usado las 5 libras intermedias"* ([`confirmaciones_usuario.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/confirmaciones_usuario.json#L258)). Mantenerlo como pregunta abierta recurrente viola la directiva de no repetir preguntas ya zanjadas.
     - *Situación cutánea y productos cosméticos post-depilación:* Dato histórico irrelevante para la prescripción de fuerza en el gimnasio.
     - En [`data/conflictos_fuentes.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/conflictos_fuentes.json#L26, #L50, #L80), consta la queja expresa de Daniel: *"1. 14/08; 2. Peso total; 3. 1 rir. Deja esas incidencias resueltas"*, evidenciando hastío por interrogatorios retrospectivos de datos irrelevantes de agosto.

---

### Tarea 4: Evaluación de la progresión de volumen y transición a 5D

La decisión `D-2026-10-14-ROTLOG-5D` fundamenta la transición a 5 días y la triplicación del volumen semanal directo de brazos (de 2 a 6 series) en dos argumentos: *"Aumentar el volumen directo de brazos y hombros sin diluir la intensidad de glúteo... Reducción de fricción por proximidad del gimnasio"*.

Al auditar la base empírica registrada en [`data/registro.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/registro.json) y [`data/seguimiento.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/seguimiento.json):
1. **Adherencia y Frecuencia Real:**
   - Entre el 16/09 y el 26/09 hubo un parón de 10 días sin entrenar.
   - Entre el 02/10 y el 08/10 transcurrieron 6 días.
   - En las últimas 4 semanas previas al 14/10, Daniel realizó un promedio de **1.6 a 2.5 sesiones semanales**.
   - En [`docs/REGLAS_DEL_ENTRENADOR.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/REGLAS_DEL_ENTRENADOR.md#L25-L27), la regla es inequívoca: *"Si la adherencia cae, ofrece una versión corta del mismo día con prioridad clara y registra solo las series realizadas. Evalúa la frecuencia realmente sostenible antes de aumentar volumen o añadir un bloque de especialización"*.
   - **Veredicto:** Aumentar la estructura a 5 sesiones y elevar el volumen directo de brazos a 6 series se hizo **en contra de la regla de consolidar primero la frecuencia sostenible**, sin una base de regularidad probada de 4 o 5 días por semana.
2. **Evidencia de Fatiga en la Sesión de Prueba (14/10/2026, `mv83bq2i-em72t9`):**
   - En la primera prueba de la sesión Satélite B, de 14 series planificadas sólo se completaron 11 ([`data/registro.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/registro.json#L534)).
   - La elevación lateral unilateral en polea (3 series) fue **completamente omitida** por falta de tiempo o fatiga: *"No lo he realizado. Informa al sistema y propon nueva ubicacion"* (Línea 10926).
   - En el curl predicador, la carga cayó drásticamente a 36 kg (desde marcas previas superiores) anotando Daniel: *"Hoy la carga baja debido a que añadí un par de series de bayesiano"* (Línea 10854).
   - Hubo interferencia intra-sesión aguda evidente y volumen excesivo para una sesión satélite rápida de 25 min. Pese a esta respuesta registrada de fatiga inmediata, la decisión de progresión fue ratificada sin un periodo de calibración previo.

---

## 3. CATÁLOGO DE HALLAZGOS NORMALIZADOS (DEC-01 A DEC-10)

```markdown
ID: DEC-01
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: El prescriptor tools/operativo.py (cmd_sesion) pierde la trazabilidad de cargas históricas de ejercicios trasladados de día al pasar de 3D a 5D, recetando calibraciones a ciegas.
Evidencia: tools/operativo.py, líneas 249-255 y 283-299. La búsqueda de series previas se restringe exclusivamente a 'sesiones_este_dia = [s for s in reg["sesiones"] if s.get("dia") == dia...]'. Para Día D (RDL, búlgara, femoral) y Día E (predicador), no existen sesiones históricas con dia=='D' o 'E'.
Consecuencia práctica para Daniel: Daniel recibe una prescripción Note v1 que afirma "ninguno comparable. Calibrar carga inicial" para ejercicios en los que lleva meses entrenando (ej. RDL con 70 kg o curl predicador con 36-40 kg), perdiendo la sobrecarga progresiva y generando desconfianza.
Propuesta concreta: Modificar match_ejercicio() en tools/operativo.py para que, si no encuentra series en la última sesión del mismo día, busque la última exposición válida y comparable en todo el registro histórico (data/registro.json) independientemente del día en que se ejecutó.
Dependencias y riesgos: Depende de normalizar el mapeo de nombres de ejercicios y machine_id. Riesgo bajo; mejora la continuidad de cargas.
Esfuerzo estimado y fundamento: 1 hora. Modificación algorítmica sencilla en la función de búsqueda de series previas de tools/operativo.py.
Beneficio esperado (medido vs estimado): Medido: eliminación del 100% de falsos mensajes "ninguno comparable" en los días D y E.
Criterio verificable de éxito: Al ejecutar 'python tools/operativo.py sesion D', el RDL Smith muestra como último registro la sesión del 30/09/2026 (70 kg) y no 'ninguno comparable'.
Forma de revertir: Restaurar el filtrado exclusivo por dia en tools/operativo.py.
Información pendiente: Ninguna.
```

```markdown
ID: DEC-02
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: La función aconsejar_doble_progresion() prescribe subidas de carga con N=1 sesión e inventa saltos de peso fijos, violando las reglas del entrenador.
Evidencia: tools/operativo.py, líneas 112-118 vs docs/REGLAS_DEL_ENTRENADOR.md, líneas 23 y 28. aconsejar_doble_progresion() evalúa 'all(rp >= rep_max for rp in reps_list)' en una sola sesión y prescribe '+1 a +2.5 kg en placas/mancuernas, o +2.5 a +5 kg en barras/discos'.
Consecuencia práctica para Daniel: Riesgo de sobrecarga lesiva o estancamiento por prescribir incrementos que no existen físicamente en la máquina (ej. en la de abdominales que salta de 10 en 10 o 15 en 15 lb) o prematuros tras una sola sesión afortunada.
Propuesta concreta: Exigir en aconsejar_doble_progresion() un historial de al menos dos exposiciones comparables en rep_max con RIR estable antes de sugerir subida. Sustituir el texto de saltos fijos por 'subir al menor incremento real disponible en la estación'.
Dependencias y riesgos: Requiere pasar a la función el historial de las dos últimas sesiones en vez de sólo una.
Esfuerzo estimado y fundamento: 2 horas de ajuste lógico y pruebas unitarias.
Beneficio esperado (medido vs estimado): Estimado: 100% de cumplimiento de la directiva de prudencia de REGLAS_DEL_ENTRENADOR.md.
Criterio verificable de éxito: Test unitario que confirme que con 1 sola exposición al tope del rango el consejo sea 'Consolidar en una segunda sesión antes de aumentar carga'.
Forma de revertir: Revertir la condición a N=1 en aconsejar_doble_progresion().
Información pendiente: Conocer los saltos reales de placas en las máquinas clave de placas de Daniel.
```

```markdown
ID: DEC-03
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: El importador de la app tools/registro_local.py no reconoce sesiones de los Días D y E, rompiendo la cola rodante asíncrona.
Evidencia: tools/registro_local.py, línea 89: 'day_match = re.match(r"^D[ií]a\s+([ABC])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)'.
Consecuencia práctica para Daniel: Cuando Daniel finaliza un Día D o Día E en la app y se importa a data/registro.json, el campo 'dia' se guarda como null. proximo_dia() (línea 270) ignora la sesión y la sugerencia de siguiente día queda congelada en un día erróneo.
Propuesta concreta: Actualizar la expresión regular en tools/registro_local.py a: r"^D[ií]a\s+([A-E])(?=$|[\s·:—–-])".
Dependencias y riesgos: Ninguna dependencia; riesgo nulo.
Esfuerzo estimado y fundamento: 5 minutos (cambio de 1 carácter en regex).
Beneficio esperado (medido vs estimado): Medido: reconocimiento inmediato de Días D y E en importaciones de inbox_app.
Criterio verificable de éxito: Un test de importación con un JSON titulado 'Día D — Glúteo y Cadena Posterior' guarda 'dia': 'D' y deriva como siguiente día 'E'.
Forma de revertir: Restaurar '([ABC])' en la regex.
Información pendiente: Ninguna.
```

```markdown
ID: DEC-04
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: Disparidad crítica en la definición del split 5D entre el informe para ChatGPT (docs/INFORME_SINCRONIZACION_CHATGPT.md) y el programa activo (data/programa.json).
Evidencia: docs/INFORME_SINCRONIZACION_CHATGPT.md, líneas 36-40 (B: Tracción, C: Cadena posterior, D: Empuje+Brazos, E: Torso/Brazos) frente a data/programa.json, líneas 17-450 y docs/PROGRAMA_ACTIVO.md, líneas 19-78 (B: Satélite Brazos, C: Nuclear Torso, D: Nuclear Glúteo/Cadena posterior, E: Satélite Brazos).
Consecuencia práctica para Daniel: Asimetría grave entre asistentes: si Daniel consulta a ChatGPT por la sesión del Día B, ChatGPT le prescribirá una sesión nuclear de tracción y espalda, interfiriendo de raíz con la app local que le presentará curl bayesiano y tríceps katana en 25 minutos.
Propuesta concreta: Reescribir de inmediato la sección 2.1 de docs/INFORME_SINCRONIZACION_CHATGPT.md para alinearla al 100% con data/programa.json y docs/PROGRAMA_ACTIVO.md.
Dependencias y riesgos: Requiere sincronizar el documento hacia el entorno de ChatGPT.
Esfuerzo estimado y fundamento: 20 minutos de edición documental.
Beneficio esperado (medido vs estimado): Medido: eliminación total del riesgo de prescripciones antagónicas entre Gemini/Antigravity y ChatGPT.
Criterio verificable de éxito: Lectura de INFORME_SINCRONIZACION_CHATGPT.md donde el Día B coincida unívocamente con 'Satélite 1 · Brazos y Deltoides lateral'.
Forma de revertir: No procede revertir; el informe actual está desincronizado.
Información pendiente: Confirmar recepción en la instancia de ChatGPT.
```

```markdown
ID: DEC-05
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: Desactualización estructural de data/taxonomia_operativa.json, que mantiene los puestos del split 3D antiguo y genera clasificaciones biomecánicas aberrantes en tools/modelo_operativo.py.
Evidencia: data/taxonomia_operativa.json, líneas 4-21 vs tools/modelo_operativo.py, líneas 38-72. B01 (Katana) se clasifica como 'extension_cadera', B02 (Bayesiano) como 'flexion_rodilla', y los puestos D01-E05 carecen de familia.
Consecuencia práctica para Daniel: Las proyecciones operativas (CONTEXTO_ENTRENADOR.json, MI_SISTEMA.html) y sustituciones muestran incoherencias técnicas absurdas que degradan la validez biomecánica del sistema.
Propuesta concreta: Actualizar data/taxonomia_operativa.json para mapear con exactitud los 24 puestos de M5-5D (A01-A05, B01-B04, C01-C05, D01-D05, E01-E05) a sus correspondientes familias de movimiento reales.
Dependencias y riesgos: Afecta a tools/modelo_operativo.py y vistas generadas por tools/operativo_chatgpt.py.
Esfuerzo estimado y fundamento: 30 minutos de mapeo JSON riguroso.
Beneficio esperado (medido vs estimado): Medido: 0 errores o puestos huérfanos al compilar tools/modelo_operativo.py.
Criterio verificable de éxito: Ejecución limpia de tools/operativo_chatgpt.py donde B01 figure como 'extension_codo' y D02 figure como 'extension_cadera'.
Forma de revertir: Restaurar la versión anterior de taxonomia_operativa.json.
Información pendiente: Ninguna.
```

```markdown
ID: DEC-06
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: Entradas dinámicas de salud y dolor con más de 60 días de antigüedad figuran con estado CONFIRMADO_ACTUAL en data/estado_y_decisiones.json.
Evidencia: data/estado_y_decisiones.json, líneas 47-93 (STATE-LUMBAR-20260813, STATE-HIP-20260813, STATE-KNEE-20260813, STATE-SHOULDER-20260814 con 'estado': 'CONFIRMADO_ACTUAL').
Consecuencia práctica para Daniel: Riesgo de que un asistente asuma asintomatología articular plena actual sin preguntar a Daniel, o asuma que no hay limitación lumbar en sentadilla hack o peso muerto basándose en un check-in de mediados de agosto.
Propuesta concreta: Cambiar el campo 'estado' de esas cuatro entradas en data/estado_y_decisiones.json de 'CONFIRMADO_ACTUAL' a 'HISTORICO_OBSOLETO' o 'REQUIERE_CONFIRMACION_PRESENCIAL', reflejando lo prescrito en la nota de línea 225.
Dependencias y riesgos: Ninguno; promueve la confirmación activa ante cargas pesadas.
Esfuerzo estimado y fundamento: 10 minutos de edición JSON.
Beneficio esperado (medido vs estimado): Medido: alineación entre el estado de los datos JSON y las directivas de REGLAS_DEL_ENTRENADOR.md.
Criterio verificable de éxito: 'grep CONFIRMADO_ACTUAL data/estado_y_decisiones.json' no devuelve ninguna fila fechada en agosto de 2026.
Forma de revertir: Restaurar el valor del campo a 'CONFIRMADO_ACTUAL'.
Información pendiente: Pregunta breve a Daniel sobre el estado articular actual de lumbar y rodillas.
```

```markdown
ID: DEC-07
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: Coexistencia de dos decisiones de arquitectura de programa mutuamente excluyentes (M4-3D y M5-5D) simultáneamente en estado ACTIVA en data/estado_y_decisiones.json.
Evidencia: data/estado_y_decisiones.json, líneas 134-145 (D-2026-08-13-01 en estado ACTIVA sin cerrar) frente a líneas 212-223 (D-2026-10-14-ROTLOG-5D en estado ACTIVA).
Consecuencia práctica para Daniel: Ambigüedad en la gobernanza del entrenamiento: la auditoría documental no puede certificar cuál es la decisión rectora vigente si la decisión anterior nunca fue formalmente cerrada o sustituida.
Propuesta concreta: Actualizar D-2026-08-13-01 en data/estado_y_decisiones.json marcando 'Estado': 'SUSTITUIDA' y 'Sustituida/cerrada por': 'D-2026-10-14-ROTLOG-5D'.
Dependencias y riesgos: Ninguno.
Esfuerzo estimado y fundamento: 5 minutos.
Beneficio esperado (medido vs estimado): Medido: coherencia total del histórico de decisiones (1 única arquitectura de programa activa a la vez).
Criterio verificable de éxito: En el array 'decisiones', exactamente una decisión de arquitectura de programa figura como 'ACTIVA'.
Forma de revertir: Restaurar 'ACTIVA' en D-2026-08-13-01.
Información pendiente: Ninguna.
```

```markdown
ID: DEC-08
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: La decisión de transicionar a un split de 5 días y triplicar el volumen directo de brazos se tomó sin evidencia de frecuencia sostenible en la respuesta registrada, infringiendo las reglas de progresión.
Evidencia: data/estado_y_decisiones.json, líneas 212-223 (D-2026-10-14-ROTLOG-5D); data/registro.json (frecuencia real de sept-oct de 1.6 a 2.5 días/semana con huecos de hasta 10 días); data/seguimiento.json (checkins vacíos); docs/REGLAS_DEL_ENTRENADOR.md, líneas 25-27.
Consecuencia práctica para Daniel: Frustración por incumplimiento de microciclos, acumulación de fatiga en brazos que reduce el rendimiento en ejercicios multiarticulares (demostrado en sesión mv83bq2i-em72t9 del 14/10 donde el curl predicador cayó por fatiga previa de bayesiano) y riesgo de abandono.
Propuesta concreta: Mantener la distribución asíncrona de la cola rodante pero congelar el volumen de brazos en 4 series semanales (2 series por satélite en vez de 3) hasta que Daniel demuestre una adherencia sostenida de al menos 4 sesiones completadas por semana durante 3 semanas consecutivas.
Dependencias y riesgos: Requiere modificar las series_base de los puestos de brazos en data/programa.json (B01, B02, E01, E02).
Esfuerzo estimado y fundamento: 15 minutos en data/programa.json.
Beneficio esperado (medido vs estimado): Estimado: reducción de la duración de sesiones satélite a <20 min reales y eliminación de caídas de rendimiento por fatiga cruzada en flexores de codo.
Criterio verificable de éxito: Daniel completa el 100% de las series prescritas en los satélites sin omitir ejercicios por fatiga.
Forma de revertir: Restaurar series_base: 3 en los puestos de brazos de data/programa.json.
Información pendiente: Evaluación de la recuperación de bíceps y tríceps tras la primera semana de ciclo.
```

```markdown
ID: DEC-09
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: tools/operativo.py empareja series para progresión mediante coincidencia parcial de texto (match_ejercicio) sin validar la identidad de estación (machine_id) ni load_basis.
Evidencia: tools/operativo.py, líneas 283-299; docs/REGLAS_DEL_ENTRENADOR.md, líneas 15 y 17.
Consecuencia práctica para Daniel: Si Daniel utiliza una máquina de remo con discos (ej. GYM-ROW-CHEST-01) y en la siguiente sesión usa la máquina de poleas Low Row (GYM-ROW-LOW-01), el prescriptor transfiere los kilos de una a otra por llamarse ambas 'Remo', con grave riesgo biomecánico y de sobrecarga.
Propuesta concreta: Incorporar una verificación estricta en match_ejercicio(): si el puesto del programa tiene un machine_id definido y la serie previa tiene un machine_id diferente no equivalente en data/maquinas.json, descalificar la comparación y forzar un mensaje explícito de calibración por cambio de estación.
Dependencias y riesgos: Depende de que las series importadas conserven el machine_id o machine_settings.
Esfuerzo estimado y fundamento: 1.5 horas de desarrollo y testing en tools/operativo.py.
Beneficio esperado (medido vs estimado): Medido: cero transferencias inadvertidas de carga entre máquinas no comparables.
Criterio verificable de éxito: Un test donde se cambia de máquina entre dos sesiones arroja 'Calibrar carga inicial por cambio de estación' en vez de mantener los kilos de la estación anterior.
Forma de revertir: Volver a la comparación por subcadena de texto.
Información pendiente: Completar los machine_id faltantes en data/maquinas.json.
```

```markdown
ID: DEC-10
Rol: Auditor de Decisiones del Entrenador
Estado: demostrado
Problema o funcionamiento correcto: Mantenimiento de cuestionarios y preguntas obsoletas o irrelevantes en docs/PERFIL_PERSONAL_UNIFICADO.md que vulneran el estilo de colaboración pactado con Daniel.
Evidencia: docs/PERFIL_PERSONAL_UNIFICADO.md, líneas 99-123 (19 pendientes, incluyendo fecha exacta de nacimiento, productos de cuidado facial/corporal y uso del suplemento de 5 lb ya respondido el 09/10); data/conflictos_fuentes.json, líneas 26, 50, 80.
Consecuencia práctica para Daniel: Fatiga por interrogatorio innecesario. Daniel ha expresado reiteradamente que valora la eficiencia ('conclusión/acción primero') y que el exceso de registro dificulta su adherencia.
Propuesta concreta: Purgar la tabla de 'Respuestas pendientes' de docs/PERFIL_PERSONAL_UNIFICADO.md, eliminando preguntas no operativas (nacimiento, piel, 5 lb resuelto) y reduciéndola estrictamente a las 2 variables de impacto inminente: 1) Molestias/dolor presentes en la articulación diana de la sesión, y 2) Identificación de estación/ajustes si difieren de la habitual.
Dependencias y riesgos: Ninguno; alinea la documentación con las directivas de comunicación directa.
Esfuerzo estimado y fundamento: 20 minutos de edición de docs/PERFIL_PERSONAL_UNIFICADO.md.
Beneficio esperado (medido vs estimado): Estimado: disminución drástica de la fricción comunicativa y aumento de la adherencia operativa.
Criterio verificable de éxito: La tabla de respuestas pendientes queda acotada a un máximo de 3 ítems puramente operativos.
Forma de revertir: Restaurar la lista exhaustiva de 19 ítems.
Información pendiente: Ninguna.
```

---

## 4. CONCLUSIÓN Y HOJA DE RUTA RECOMENDADA

La arquitectura de DAME CAÑA es conceptualmente sólida, pero requiere saneamiento urgente en tres puntos de fricción técnica:
1. **Prioridad Crítica Inmediata:** Corregir la expresión regular en [`tools/registro_local.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/registro_local.py) (`[A-E]`) y sincronizar [`docs/INFORME_SINCRONIZACION_CHATGPT.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/INFORME_SINCRONIZACION_CHATGPT.md) para evitar que ChatGPT prescriba sesiones radicalmente distintas a las de la app local.
2. **Prioridad Alta (Consistencia de Prescripción):** Ajustar [`tools/operativo.py`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/tools/operativo.py) para que busque el historial de marcas en cualquier sesión previa y no únicamente en el mismo día, y requerir N=2 exposiciones estables antes de prescribir aumentos de carga en `aconsejar_doble_progresion()`.
3. **Prioridad Media (Higiene de Datos):** Actualizar [`data/taxonomia_operativa.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/taxonomia_operativa.json) al split 5D, retirar el estado `CONFIRMADO_ACTUAL` de los datos de salud de agosto en [`data/estado_y_decisiones.json`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/data/estado_y_decisiones.json) y podar la lista de preguntas pendientes en [`docs/PERFIL_PERSONAL_UNIFICADO.md`](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/docs/PERFIL_PERSONAL_UNIFICADO.md).

Quedo a disposición del agente coordinador para profundizar en cualquiera de los hallazgos documentados.