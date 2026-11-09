# INFORME DE AUDITORÍA EXHAUSTIVA DE DATOS E HISTORIAL · DAME CAÑA

**Rol:** Auditor de Datos e Historial  
**Fecha de auditoría:** 14 de octubre de 2026  
**Alcance:** data/registro.json, data/maquinas.json, data/catalogos.json, data/conflictos_fuentes.json, data/confirmaciones_usuario.json, data/inbox_app/, data/originales_app/, data/fuentes/, tools/registro_local.py, tools/revision_diaria.py.

---

## RESUMEN EJECUTIVO Y ESTADO DE LOS DATOS

- **Sesiones auditadas:** 29 sesiones totales (28 finalizadas reales/históricas y 1 sesión general sin desglose; 1 sesión de prueba retirada previamente).
- **Filas de series auditadas:** 421 filas totales (363 con repeticiones positivas, 58 sin repeticiones correspondientes a series planificadas no ejecutadas o aproximaciones archivadas en notas).
- **Identidad de máquinas en series:** **0 de 421 series** (0%) disponen de `machine_id`, `comparability_group` o `exercise_id` estructurado.
- **Bases de carga:** 183 `total_kg`, 202 `unknown`, 19 `per_side_kg`, 2 `bodyweight`, más **15 anomalías de enumeración** (12 `unknown_kg_basis` y 3 `per_side`).
- **Inbox vs Originales:** 4 archivos activos en `data/inbox_app/`, 100% preservados bit a bit en `data/originales_app/` con huella SHA-256 verificada. Permanecen en inbox por ausencia de paso de archivado/limpieza tras la copia (`shutil.copy2`).
- **Trazabilidad y truncados:** Se demuestran truncamientos de texto heredados en `machine_settings` y `movement_notes`, caracteres invisibles Zero-Width Space (`\u200b`), pérdida sistemática de prescripciones de la app (`coach_cue`, rangos de reps y RIR objetivo), y strings `"None"` en campos numéricos/nulos de RIR.

---

## HALLAZGOS ESTRUCTURADOS (DAT-01 a DAT-11)

### ID: DAT-01
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Ausencia total (100%) de `machine_id`, `comparability_group` y `exercise_id` en las 421 filas de series de `data/registro.json`.  
**Evidencia:** `data/registro.json`, campos `series[].machine_id`, `series[].comparability_group` y `series[].exercise_id`, líneas 548-550, 573-575 y sistemáticamente en las 421 series; confirmado por `outputs/operativo/CONTEXTO_ENTRENADOR.json`, líneas 202-205 (`"exercise_id": 421, "machine_id": 421, "comparability_group": 421`).  
**Consecuencia práctica para Daniel:** El motor de prescripción no puede verificar si una carga previa se levantó en la misma estación, leva o ajuste. Esto fuerza a recurrir a coincidencia aproximada de texto (`match_ejercicio` en `tools/operativo.py`), que no distingue variantes críticas (ej. Hack Matrix vs Hack guiada, o remo de discos vs polea), impidiendo una doble progresión automatizada y segura.  
**Propuesta concreta:** Crear un reconciliador determinista offline (`tools/reconciliar_identidades.py`) que asocie cada serie histórica y cada slot de `data/programa.json` con el `exercise_id` del catálogo técnico y el `comparability_group` canónico, dejando `machine_id` condicionado a confirmación fotográfica o de estación. Modificar `tools/registro_local.py` para mapear el ejercicio de la app con el catálogo local durante la ingesta.  
**Dependencias y riesgos:** Depende de la estabilidad de nombres de `data/programa.json` y `data/catalogos.json`. Riesgo nulo si no se altera el dato original y solo se enriquecen los campos nulos.  
**Esfuerzo estimado y fundamento:** 4 horas (diseñar matriz de mapeo ejercicio->slot->grupo comparable para los 21 ejercicios del programa y script de migración no destructivo).  
**Beneficio esperado (medido vs estimado):** Medido: 0% -> 100% de series del programa activo asignadas a grupos de comparabilidad válidos.  
**Criterio verificable de éxito:** `sum(s.get('comparability_group') is not None for s in registro['series']) >= 363` (todas las series con repeticiones positivas categorizadas).  
**Forma de revertir:** Restaurar `data/registro.json` desde su respaldo automático previo en `data/backups/`.  
**Información pendiente:** Ninguna para ejercicios del programa estándar; solo fotos de placa para máquinas no bautizadas.

---

### ID: DAT-02
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Existencia de valores no canónicos e inválidos en el campo `load_basis`: 12 series con `'unknown_kg_basis'` y 3 series con `'per_side'`. Falta de validación en el importador.  
**Evidencia:**  
1. `data/registro.json`, sesión `msppelcx-yful6r` (12/08/2026), líneas 1228, 1253, 1278, 1303, 1328, 1353, 1378, 1403, 1428, 1453, 1478, 1503: `"load_basis": "unknown_kg_basis"`.  
2. `data/registro.json`, sesión `mv83bq2i-em72t9` (14/10/2026), líneas 10726, 10750, 10774: `"load_basis": "per_side"`.  
3. `tools/registro_local.py`, línea 139: `"load_basis": limpio(identity.get("load_basis")) or "unknown"` acepta cualquier cadena sin validar contra el enum canónico `('total_kg', 'per_side_kg', 'bodyweight', 'unknown')`.  
**Consecuencia práctica para Daniel:** Inconsistencia en filtros y cálculos de carga acumulada/efectiva. El valor `'per_side'` en la sesión de hoy (Dual-cable cross pushdown) puede inducir a que un algoritmo multiplique por 2 la carga si busca `'per_side_kg'`, o la trate como desconocida.  
**Propuesta concreta:**  
1. Normalizar en `data/registro.json`: convertir las 12 series de `unknown_kg_basis` a `unknown`, y las 3 series de `per_side` a `per_side_kg`.  
2. Modificar `tools/registro_local.py` añadiendo un normalizador estricto de `load_basis`: si recibe `'per_side'` mapearlo a `'per_side_kg'`; si no pertenece al cuarteto oficial, registrar incidencia o fallar.  
**Dependencias y riesgos:** Ninguna dependencia externa. Riesgo nulo de pérdida de datos.  
**Esfuerzo estimado y fundamento:** 30 minutos (edición JSON + 5 líneas de normalización en `tools/registro_local.py`).  
**Beneficio esperado (medido vs estimado):** Medido: Eliminación del 100% (15 de 15) de valores fuera de especificación en `load_basis`.  
**Criterio verificable de éxito:** `set(s['load_basis'] for s in registro['series']) == {'total_kg', 'per_side_kg', 'bodyweight', 'unknown'}`.  
**Forma de revertir:** `git checkout data/registro.json tools/registro_local.py`.  
**Información pendiente:** Ninguna.

---

### ID: DAT-03
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Pérdida sistemática de información de prescripción técnica (`coach_cue`, `reps_min`, `reps_max`, `target_rir`, `rest`) al convertir exportaciones de la app en series de `data/registro.json`.  
**Evidencia:**  
1. `data/inbox_app/2026-10-14-dia-b-mv83bq2i.json`, líneas 24-32 y 78-86: el objeto `prescription` incluye `"coach_cue": "Hoy: 9 kg. Mantener en las 3 series si el RIR se estabiliza en 1."`, `"reps_min": 10`, `"reps_max": 12`, `"target_rir": "1"`, `"rest": "90-120 s"`.  
2. `tools/registro_local.py`, líneas 130-149: la función de conversión solo extrae `bool(prescription.get("per_side", False))`. Todo el resto del bloque `prescription` es ignorado y omitido.  
3. `data/registro.json`, líneas 10643-10978: las series almacenadas carecen de la pauta que Daniel recibió antes de levantar.  
**Consecuencia práctica para Daniel:** Se pierde el contexto operativo con el que entrenó: Daniel no puede saber en el futuro si levantó 9 kg porque esa era la indicación prescrita por el entrenador o por decisión sobre la marcha. Imposibilita contrastar el cumplimiento de la prescripción frente a la ejecución real.  
**Propuesta concreta:** Extender el esquema de series de `dame_cana_registro.v1` para incluir un campo opcional `"prescribed": {"reps_min": ..., "reps_max": ..., "rir": ..., "coach_cue": ...}` en `tools/registro_local.py`.  
**Dependencias y riesgos:** Requiere actualizar `tools/registro_local.py` y `tools/generar_hojas.py`. No invalida datos históricos existentes ya que sería opcional.  
**Esfuerzo estimado y fundamento:** 1.5 horas (actualizar parser, esquema de validación y pruebas de ingesta).  
**Beneficio esperado (medido vs estimado):** Preservación del 100% de indicaciones del entrenador asociadas a las sesiones futuras.  
**Criterio verificable de éxito:** En la próxima importación, `series[].prescribed.coach_cue` contiene la nota exacta emitida en el JSON original.  
**Forma de revertir:** Revertir los cambios en `tools/registro_local.py`.  
**Información pendiente:** Ninguna.

---

### ID: DAT-04
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Contaminación del campo `rir` con valores string `"None"` en lugar de `null` en series históricas de la sesión `msppelcx-yful6r`.  
**Evidencia:** `data/registro.json`, sesión `msppelcx-yful6r` (12/08/2026):  
- Línea 1383 (`msppelcx-yful6r__E3__S3`): `"rir": "None"`.  
- Línea 1433 (`msppelcx-yful6r__E4__S2`): `"rir": "None"`.  
- Línea 1508 (`msppelcx-yful6r__E6__S1`): `"rir": "None"`.  
**Consecuencia práctica para Daniel:** Provoca errores de tipo o inconsistencias lógicas en herramientas de análisis estadístico, hojas de cálculo (`tools/generar_hojas.py`) o scripts que esperan que `rir` sea `None` (null), un número entero/flotante o un rango tipográfico normalizado.  
**Propuesta concreta:** Sustituir los tres literales `"None"` por `null` en `data/registro.json`. Asegurar que `rir_valor()` en `tools/registro_local.py` limpie cadenas que coincidan con `"none"` insensible a mayúsculas.  
**Dependencias y riesgos:** Riesgo nulo; restaura el tipo de dato correcto.  
**Esfuerzo estimado y fundamento:** 15 minutos.  
**Beneficio esperado (medido vs estimado):** 0 valores string `"None"` en la base de datos de registro.  
**Criterio verificable de éxito:** `any(s.get('rir') == 'None' for s in registro['series']) is False`.  
**Forma de revertir:** `git checkout data/registro.json`.  
**Información pendiente:** Ninguna.

---

### ID: DAT-05
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Permanencia indefinida de archivos ya importados en `data/inbox_app/` y riesgo de fallo del sistema al reimportar si hay discrepancias menores.  
**Evidencia:**  
1. `data/inbox_app/` contiene 4 archivos que ya han sido importados y archivados en `data/originales_app/`: `2026-09-30-dia-b-registro-ia.json`, `DIRECT_SYNC_20261010_183006.json`, `2026-10-13-dia-c-mv6ly2iv.json`, `2026-10-14-dia-b-mv83bq2i.json`.  
2. `tools/registro_local.py`, líneas 350-356: utiliza `shutil.copy2(path, target)`, dejando el archivo en `data/inbox_app/`.  
3. `tools/revision_diaria.py`, líneas 39-57: examina diariamente todos los `*.json` en inbox y los clasifica como `duplicado_igual`.  
4. `tools/registro_local.py`, líneas 328-338: si algún metadato de una sesión previa en `registro.json` es ajustado (ej. notas, ajustes, identidades), la reimportación del inbox falla con `ErrorRegistro: Conflicto: {sid} ya existe con ...; no se modifica`, deteniendo todo el proceso diario.  
**Consecuencia práctica para Daniel:** Crecimiento no acotado de la carpeta inbox, repetición innecesaria de lecturas I/O en cada cron diario, y riesgo crítico de que un ajuste manual legítimo en `registro.json` bloquee la ingesta de nuevos entrenamientos debido a los archivos antiguos atascados en inbox.  
**Propuesta concreta:** Crear un subdirectorio `data/inbox_app/procesados/` o mover los archivos procesados a `data/inbox_app/archivados/` (o eliminarlos una vez verificado el hash idéntico en `data/originales_app/`). Añadir a `tools/registro_local.py` una opción `--limpiar-inbox` o moverlos automáticamente tras validar la copia idéntica.  
**Dependencias y riesgos:** Requiere documentar el cambio en `docs/GUIA_APP.md` y `README.md`. No hay riesgo de pérdida porque `data/originales_app/` ya custodia el original con hash SHA-256.  
**Esfuerzo estimado y fundamento:** 1 hora (implementar y probar la transición de archivos en `revision_diaria.py` y `registro_local.py`).  
**Beneficio esperado (medido vs estimado):** Inbox limpio con 0 archivos procesados residuales; eliminación de chequeos redundantes diarios (4 archivos examinados innecesariamente cada 24 horas).  
**Criterio verificable de éxito:** `len(list(Path('data/inbox_app').glob('*.json'))) == 0` tras ejecutar la importación.  
**Forma de revertir:** Mover de vuelta los archivos desde la carpeta de procesados a `data/inbox_app/`.  
**Información pendiente:** Confirmar si Daniel prefiere que se muevan a una subcarpeta o se eliminen tras confirmarse la copia en `originales_app/`.

---

### ID: DAT-06
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Truncamiento y mutilación de cadenas de texto en `machine_settings` y `movement_notes` procedentes de migraciones de hoja y de la captura en la app.  
**Evidencia:** `data/registro.json`:  
- `"machine_settings": "Asiento y"`: líneas 3502, 3527, 7577, 7602, 7627, 8906, 8930, 8954 (mutilado, falta altura o respaldo).  
- `"machine_settings": "topes · posición de"`: líneas 6627, 8027, 8052 (mutilado, falta posición de pies o plataforma).  
- `"machine_settings": "posición de"`: líneas 1702, 1727.  
- `"machine_settings": "respaldo durante"`: líneas 2152, 2177, 2202.  
- `"machine_settings": "asiento y"`: líneas 2227, 2252, 2277.  
- `"movement_notes": "Hice una serie con polea a 5 kilos, voy sobrado pero la siguiente placa es demasiado ya para más de 4 re"`: líneas 1910, 1935, 1960 (mutilado en «4 re...», palabra repeticiones cortada).  
- Confirmado en originales: `data/originales_app/DIRECT_SYNC_20260926_182824.json`, línea 70 ya contiene el texto truncado `"topes · posición de"`.  
**Consecuencia práctica para Daniel:** Pérdida irrecuperable en el historial de la configuración exacta de esas máquinas (no se sabe qué número de asiento o posición de respaldo se usó en agosto/septiembre), imposibilitando reproducir de forma idéntica la geometría en dichas fechas.  
**Propuesta concreta:**  
1. No inventar los datos mutilados del pasado; documentar los fragmentos conocidos en `docs/CALIDAD_Y_PENDIENTES.md`.  
2. Revisar la longitud de campos en la app cliente PWA para verificar si existe un límite artificial de caracteres en los formularios de `machine_settings` o `movement_notes` que esté cortando las notas al escribir.  
**Dependencias y riesgos:** Requiere inspección del código fuente de la PWA cliente.  
**Esfuerzo estimado y fundamento:** 1 hora de revisión de los inputs de la app.  
**Beneficio esperado (medido vs estimado):** Prevención de truncamientos en el 100% de futuras sesiones capturadas.  
**Criterio verificable de éxito:** Validación de que la PWA y su esquema exportan strings sin límite arbitrario de 20-30 caracteres.  
**Forma de revertir:** N/A.  
**Información pendiente:** Verificar en la app móvil el input de ajustes.

---

### ID: DAT-07
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Infiltración de caracteres Unicode invisibles Zero-Width Space (`\u200b`, U+200B) en nombres de ejercicios y títulos de sesiones.  
**Evidencia:** `data/registro.json`:  
- Título de sesión, línea 205: `"\u200bDía C"`.  
- Nombres de ejercicios en series: líneas 2522, 2547, 2572, 2597, 2922, 2972, 3047, 3522, 3547, 3622, 4297, 4372, 5122, 6522, 6547, 6622, 7222, 7247, 7322, 7372, 7522, 7572, 7647, 7722, 7772, 7847, 7897 (ej. `"\u200bPeso muerto rumano en Smith"`).  
**Consecuencia práctica para Daniel:** Fallos silenciosos en comparaciones de cadenas exactas (`if row['exercise_name'] == 'Peso muerto rumano en Smith':` evalúa a `False`), búsquedas en catálogos y ordenamiento. En `tools/operativo.py`, se tuvo que añadir lógica de coincidencia flexible y `strip()` porque las cadenas no coincidían de forma nativa.  
**Propuesta concreta:**  
1. Ejecutar un script de limpieza sobre `data/registro.json` que elimine `\u200b` de todos los campos de texto (`replace('\u200b', '')`).  
2. Incorporar en la función `limpio(value)` de `tools/registro_local.py` la eliminación de caracteres invisibles y espacios no separables (`\u200b`, `\u00a0`, `\ufeff`).  
**Dependencias y riesgos:** Riesgo nulo; homogeniza los identificadores de texto.  
**Esfuerzo estimado y fundamento:** 30 minutos.  
**Beneficio esperado (medido vs estimado):** 0 caracteres invisibles en el registro (de >30 detectados a 0). Coincidencias de texto 100% deterministas.  
**Criterio verificable de éxito:** `any('\u200b' in json.dumps(registro) for _ in [0]) is False`.  
**Forma de revertir:** `git checkout data/registro.json tools/registro_local.py`.  
**Información pendiente:** Ninguna.

---

### ID: DAT-08
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Discrepancia activa de carga en el registro para el press horizontal de la sesión `mu42lknz-kvq0wx` (16/09/2026): figura etiquetado como `per_side_kg` con 70 kg, cuando Daniel confirmó expresamente que 70 kg era la carga total.  
**Evidencia:**  
1. `data/registro.json`, líneas 7653-7656, 7678-7681, 7703-7706 (`mu42lknz-kvq0wx__E3__S1..3`): `"load_basis": "per_side_kg"`, `"load_kg": 70`.  
2. `data/confirmaciones_usuario.json`, líneas 41-49: confirmación del 02/10/2026: `"carga_total_kg": 70, "carga_por_lado_kg": 35`, fuente: `Daniel: entre ambos, al aclarar los 70 kg del press del 16/09`.  
3. Sin embargo, en `data/conflictos_fuentes.json` no se creó una entrada de resolución que permita a `aplicar_resoluciones_confirmadas()` actualizar estas series en `registro.json`.  
**Consecuencia práctica para Daniel:** Si cualquier algoritmo o entrenador lee `load_basis: "per_side_kg"` y `load_kg: 70`, inferirá erróneamente que Daniel movió 140 kg en lugar de 70 kg, proponiendo progresiones potencialmente lesivas o absurdas.  
**Propuesta concreta:**  
1. Incorporar la resolución expresa en `data/conflictos_fuentes.json` y `data/registro.json` ajustando `load_basis` a `"total_kg"` (o mantener `per_side_kg` con `load_kg: 35`, pero respetando la regla confirmada por Daniel de registrar el peso total levantado).  
2. Dejar trazabilidad en `correcciones_usuario` de `data/registro.json`.  
**Dependencias y riesgos:** Requiere coordinar con `data/conflictos_fuentes.json`. Riesgo nulo al contar con la confirmación explícita de Daniel en `confirmaciones_usuario.json`.  
**Esfuerzo estimado y fundamento:** 30 minutos.  
**Beneficio esperado (medido vs estimado):** Prevención de una sobreestimación del 100% en la carga histórica de ese ejercicio (70 kg reales vs 140 kg interpretados).  
**Criterio verificable de éxito:** `registro.json` refleja `load_basis: "total_kg"` y `load_kg: 70` en las series `mu42lknz-kvq0wx__E3__S1..3`.  
**Forma de revertir:** Restaurar desde `data/backups/`.  
**Información pendiente:** Ninguna (confirmado por Daniel el 02/10/2026).

---

### ID: DAT-09
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Desfase sistemático documentado entre el recuento declarado (`recorded_set_count`) y las filas de series archivadas en 13 de las 29 sesiones.  
**Evidencia:** `outputs/operativo/CONTEXTO_ENTRENADOR.json`, líneas 126-192 (`recuentos_historicos_distintos`):  
- `msppelcx-yful6r` (declarado: 11, filas: 12)  
- `msvek8wz-k1lvmc` (declarado: 15, filas: 18)  
- `msxem6n0-ahud97` (declarado: 5, filas: 18)  
- `msydy5i0-12m57v` (declarado: 16, filas: 18)  
- `msyt67hh-k0dw0k` (declarado: 0, filas: 18)  
- `mt2jhvki-uf6g4h` (declarado: 15, filas: 16)  
- `mt2sisvi-f18tjx` (declarado: 0, filas: 1)  
- `mt5hniss-pe1osb` (declarado: 17, filas: 18)  
- `mtb82l2r-31iccy` (declarado: 16, filas: 17)  
- `mthb5t2c-qmdksz` (declarado: 14, filas: 19)  
- `mts8kfej-fehx6t` (declarado: 15, filas: 18)  
- `mu18ew6n-pil4bv` (declarado: 13, filas: 19)  
- `mv83bq2i-em72t9` (declarado: 11, filas: 14)  
**Consecuencia práctica para Daniel:** No presupone pérdida de entrenamientos (las filas sin repeticiones son series planificadas que no se realizaron por tiempo/fatiga, o aproximaciones). Sin embargo, si un auditor o algoritmo cuenta `len(series)` en vez de filtrar por repeticiones efectivas (`reps > 0`), sobreestimará el volumen de entrenamiento en 58 series (421 filas totales vs 363 series reales).  
**Propuesta concreta:** Mantener la política de no alterar el pasado por suposición (las 58 filas vacías conservan valor como evidencia de qué ejercicios se omitieron). Formalizar en todos los orquestadores y vistas operativas la regla estricta: `volumen_real = count(reps is not None and reps > 0)`, excluyendo filas no ejecutadas de métricas de hipertrofia o fatiga.  
**Dependencias y riesgos:** Ninguna.  
**Esfuerzo estimado y fundamento:** Ya implementado en `tools/operativo.py` y `CONTEXTO_ENTRENADOR.json`; requiere mantener la regla documentada.  
**Beneficio esperado (medido vs estimado):** Claridad absoluta para Daniel: 363 series ejecutadas, 58 planificadas omitidas.  
**Criterio verificable de éxito:** Las vistas de volumen reflejan 363 series y no 421.  
**Forma de revertir:** N/A.  
**Información pendiente:** Ninguna.

---

### ID: DAT-10
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Inconsistencia y deriva estructural en el esquema de series de `data/registro.json` según el canal de procedencia.  
**Evidencia:**  
1. Series de la migración inicial de Drive (ej. líneas 540-1200): poseen `_fila_fuente` y `fecha_original`, pero carecen de `resistance_difficulty`.  
2. Series de la sesión `muwivoul-amrtj0` (líneas 9400-9600): poseen un campo ad-hoc `fecha_correccion_usuario: "2026-10-08"`.  
3. Series importadas localmente por `tools/registro_local.py` (ej. líneas 8392-8822, 10643-10978): poseen `resistance_difficulty: null`, pero carecen de `_fila_fuente` y `fecha_original`.  
**Consecuencia práctica para Daniel:** Dificulta la validación automática del esquema JSON (JSON Schema) y genera ramas condicionales complejas en herramientas analíticas.  
**Propuesta concreta:** Definir formalmente `dame_cana_registro.v2` unificando las claves de cada serie: establecer valores por defecto explícitos (`null`) para metadatos de importación y corrección, asegurando que todos los objetos compartan exactamente las mismas claves.  
**Dependencias y riesgos:** Requiere actualizar `tools/registro_local.py` y validar compatibilidad con `generar_hojas.py`.  
**Esfuerzo estimado y fundamento:** 1 hora (migración de esquema y ajuste de serializador).  
**Beneficio esperado (medido vs estimado):** Esquema 100% homogéneo y validable por herramientas estándar de JSON Schema.  
**Criterio verificable de éxito:** `set.intersection(*(set(s.keys()) for s in registro['series'])) == set.union(*(set(s.keys()) for s in registro['series']))`.  
**Forma de revertir:** `git checkout data/registro.json tools/registro_local.py`.  
**Información pendiente:** Ninguna.

---

### ID: DAT-11
**Rol:** Auditor de Datos e Historial  
**Estado:** demostrado  
**Problema o funcionamiento correcto:** Trazabilidad e inalterabilidad de los archivos originales verificada con éxito, pero con omisión de actualización del manifiesto maestro `data/fuentes/manifest.json`.  
**Evidencia:**  
1. Los 6 archivos importados localmente tras el 29/09/2026 cuentan con su correspondiente copia original intacta en `data/originales_app/` con huella SHA-256 exacta registrada en `registro.json` (`importaciones_locales`, líneas 11527-11582).  
2. Sin embargo, `data/fuentes/manifest.json` contiene únicamente los 20 archivos previos al 29/09/2026 (líneas 1-105). La función `validar_fuentes()` de `tools/registro_local.py` solo comprueba los 20 archivos antiguos y no verifica la integridad de los 6 originales locales recientes.  
**Consecuencia práctica para Daniel:** Si un archivo original reciente en `data/originales_app/` fuera alterado o corrompido accidentalmente, el comando de validación del sistema (`python tools/registro_local.py validar`) reportaría erróneamente que todas las fuentes están íntegras porque no las tiene registradas en el manifiesto.  
**Propuesta concreta:** Actualizar `data/fuentes/manifest.json` incorporando las 6 copias de `data/originales_app/` con sus respectivos tamaños en bytes y hashes SHA-256. Extender `tools/registro_local.py` para que al archivar una sesión en `data/originales_app/` actualice automáticamente el manifiesto maestro de fuentes.  
**Dependencias y riesgos:** Ninguna. Refuerza la seguridad de los respaldos.  
**Esfuerzo estimado y fundamento:** 45 minutos.  
**Beneficio esperado (medido vs estimado):** Cobertura de verificación de integridad del 100% de fuentes maestras (de 20/26 archivos a 26/26).  
**Criterio verificable de éxito:** `python tools/registro_local.py validar` comprueba 26 archivos de fuentes.  
**Forma de revertir:** `git checkout data/fuentes/manifest.json`.  
**Información pendiente:** Ninguna.

---

## CONCLUSIONES Y PLAN DE ACCIÓN RECOMENDADO

1. **Prioridad 1 (Integridad y Seguridad de Progresión):**
   - Resolver DAT-08 (corregir `per_side_kg` de 70 kg a 70 kg totales en press horizontal del 16/09).
   - Resolver DAT-02 y DAT-04 (corregir anomalías `unknown_kg_basis`, `per_side` y strings `"None"` en RIR).
   - Resolver DAT-07 (eliminar caracteres invisibles `\u200b`).

2. **Prioridad 2 (Flujo Operativo e Ingesta):**
   - Resolver DAT-05 (limpieza y archivado ordenado de archivos en `data/inbox_app/`).
   - Resolver DAT-03 (capturar el bloque `prescription` para no perder notas del entrenador).

3. **Prioridad 3 (Arquitectura y Comparabilidad a Largo Plazo):**
   - Resolver DAT-01 (reconciliar `comparability_group` y `exercise_id` en las series históricas y de programa).
   - Resolver DAT-11 (actualizar `manifest.json` con todas las fuentes locales).
   - Resolver DAT-10 (homogeneizar esquema de series a versión v2 unificada).

El historial de Daniel es extraordinariamente rico y verídico (363 series reales conservadas con notas descriptivas de altísimo valor), pero requiere estas correcciones quirúrgicas en la capa de datos para que el motor de inferencia opere con rigor absoluto y sin ambigüedades.