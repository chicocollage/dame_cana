# Guía de navegación para el chat entrenador

## Propósito

Este documento señala dónde localizar cada bloque de investigación solicitado. El corpus mezcla tres capas que el entrenador debe mantener separadas:

1. **Evidencia directa:** estudios, revisiones, tablas de resultados, referencias y DOI/enlaces.
2. **Síntesis e inferencia biomecánica:** interpretación explícita de evidencia directa, útil pero no equivalente a un ensayo.
3. **Aplicación rotulada:** reglas, dosis o protocolos derivados. No convertirlos en resultados científicos universales.

Siempre que una decisión sea importante, partir de las bases de estudios y comprobar después el informe narrativo correspondiente.

## 1. Hipertrofia y regionalización del glúteo

### Entrada principal

| Necesidad | Archivo | Dónde buscar |
|---|---|---|
| Anatomía funcional, glúteo mayor/medio/menor, longitud muscular y evidencia longitudinal | `01_GLUTEO/01_ANATOMIA_HIPERTROFIA_REGIONAL_Y_LONGITUD.md` | Secciones 1–4 y 6–7 |
| Volumen, frecuencia, carga, fallo, descanso y límites de certeza | `01_GLUTEO/02_DOSIFICACION_DE_LA_HIPERTROFIA.md` | Secciones 2, 5–7 |
| Hip thrust, sentadilla, prensa, unilateral, bisagras, abducción y redundancias | `01_GLUTEO/03_EJERCICIOS_BIOMECANICA_Y_REDUNDANCIAS.md` | Secciones 3–5 y 13 |
| Técnicas avanzadas, parciales en elongación, microseries, fatiga, estancamiento y controversias | `01_GLUTEO/07_PROGRAMACION_AVANZADA_Y_CONTROVERSIAS.md` | Secciones 2–13 |
| Estudios con población, duración, intervención, medida, limitaciones y DOI/enlace | `04_BASES_NEUTRALES/01_ESTUDIOS_GLUTEO_Y_AREAS_ASOCIADAS.csv` | Filtrar por ID, intervención o resultado |
| Conclusiones neutras con fuentes vinculadas | `04_BASES_NEUTRALES/02_RESULTADOS_SINTETIZADOS.csv` | Columnas `conclusion`, `confianza`, `limite`, `fuentes` |
| Curvas de resistencia, elongación, estabilidad, limitantes y relación estímulo-fatiga | `04_BASES_NEUTRALES/03_DATOS_BIOMECANICOS_EJERCICIOS.csv` | Una fila por ejercicio/variante |

### Uso correcto

- No afirmar que una región superior, media o inferior del glúteo puede aislarse de forma exacta salvo que la fuente lo demuestre.
- No usar EMG, sensación de activación o congestión como prueba de hipertrofia.
- Diferenciar un resultado longitudinal de una inferencia biomecánica.

## 2. Físico y estética masculina integral

### Entrada principal

| Necesidad | Archivo | Dónde buscar |
|---|---|---|
| Fuerza percibida, relación hombros-cadera, preferencias musculares y límites de la evidencia estética | `02_FISICO_MASCULINO/01_EVIDENCIA_INICIAL_ESTETICA_Y_MUSCULARIDAD.md` | Secciones 2–7 |
| Estudios de percepción estética masculina y prescripción general de hipertrofia | `02_FISICO_MASCULINO/02_BASE_EVIDENCIA_ESTETICA_MASCULINA.csv` | Columnas `Resultado relevante`, `Limitaciones`, `URL` |
| Anatomía visual de hombros, pecho, espalda, brazos, pierna, pantorrilla y tronco | `02_FISICO_MASCULINO/03_ATLAS_ANATOMIA_VISUAL_Y_PRIORIDAD_REGIONAL.md` | Secciones 4–13 |
| Estudios sobre hipertrofia regional de otros grupos musculares | `02_FISICO_MASCULINO/04_BASE_EVIDENCIA_HIPERTROFIA_REGIONAL.csv` | Columnas `Región`, `Hallazgo principal`, `Límite relevante`, `URL` |
| Selección de ejercicios para deltoides, espalda, pectoral, brazos, pierna y pantorrilla | `02_FISICO_MASCULINO/05_SINTESIS_EJERCICIOS_Y_MAQUINAS.md` | Secciones 2–8 |
| Matriz de prioridades regionales e incertidumbre por región | `02_FISICO_MASCULINO/07_MATRIZ_PRIORIDAD_REGIONAL.csv` | Usar como interpretación, no como evidencia primaria |

### Uso correcto

- Los estudios de atractivo y siluetas describen percepción, no cambios causales logrados mediante ejercicios concretos.
- No perseguir ratios universales de hombros, cintura o cadera: el corpus no los respalda.
- Tratar las prioridades regionales como una hipótesis estética ajustable, no como una ley biológica.

## 3. Máquinas, ejercicios y transferencia biomecánica

### Entrada principal

| Necesidad | Archivo | Dónde buscar |
|---|---|---|
| Método para evaluar una máquina: geometría, estabilidad, curva, ajuste y tolerancia | `03_GIMNASIO/01_MAPA_PREGUNTAS_Y_MARCO_DE_EVALUACION.md` | Secciones 3–8 |
| Máquinas frente a pesos libres, hip thrust/glute drive, prensa, hack, belt squat, multipower, bisagra y abducción | `03_GIMNASIO/02_EVIDENCIA_MAQUINAS_Y_EJERCICIOS.md` | Secciones 4–14 |
| Matriz para comparar aparatos por función y filtros de encaje | `03_GIMNASIO/03_MATRIZ_INTERPRETATIVA_DE_MAQUINAS.md` | Secciones 2–10 |
| Ensayos y revisiones específicos de máquinas, con DOI/enlaces | `03_GIMNASIO/04_ESTUDIOS_ESPECIFICOS_DE_GIMNASIO.csv` | Todas las columnas; `doi_url` es el enlace verificable |
| Conclusiones y límites específicos de gimnasio | `03_GIMNASIO/05_CONCLUSIONES_ESPECIFICAS_DE_GIMNASIO.csv` | Columnas `conclusion`, `limite`, `fuentes` |
| Taxonomía e inventario de categorías de máquinas | `03_GIMNASIO/06_INVENTARIO_Y_TAXONOMIA_DE_MAQUINAS.csv` | No usar como prueba de superioridad |
| Datos transversales de los ejercicios, independientemente del entorno | `04_BASES_NEUTRALES/03_DATOS_BIOMECANICOS_EJERCICIOS.csv` | Comparar función, curva y limitantes |

### Regla de transferencia biomecánica

Una conclusión sobre una máquina concreta no se transfiere automáticamente a otra de nombre parecido. Registrar marca, modelo, trayectoria, topes, ángulos, soporte y forma de carga. El rendimiento debe compararse dentro del mismo equipo, no por el número de placas frente a kilos libres.

## 4. Informes de Work, referencias, DOI/enlaces y tablas de estudios

No hay un único archivo denominado “Work”. La investigación generada en ese proceso se conserva en estos formatos:

| Qué necesitas | Archivos prioritarios |
|---|---|
| Informes extensos con fuentes al final | Todos los `.md` de `01_GLUTEO`, `02_FISICO_MASCULINO` y `03_GIMNASIO`; localizar el epígrafe `Fuentes principales`, `Estudios incorporados` o `Fuentes nuevas` |
| Base maestra de estudios de glúteo y temas asociados | `04_BASES_NEUTRALES/01_ESTUDIOS_GLUTEO_Y_AREAS_ASOCIADAS.csv` |
| Tablas de estudios de estética masculina y desarrollo regional | `02_FISICO_MASCULINO/02_BASE_EVIDENCIA_ESTETICA_MASCULINA.csv` y `02_FISICO_MASCULINO/04_BASE_EVIDENCIA_HIPERTROFIA_REGIONAL.csv` |
| Tabla de estudios de máquinas | `03_GIMNASIO/04_ESTUDIOS_ESPECIFICOS_DE_GIMNASIO.csv` |
| Estudios usados en presentación visual y programación avanzada | `05_RESULTADOS_POR_FASE/01_ESTUDIOS_PRESENTACION_VISUAL.csv` y `05_RESULTADOS_POR_FASE/03_ESTUDIOS_PROGRAMACION_AVANZADA.csv` |
| Procedencia exacta de cada archivo y control de integridad | `99_MANIFIESTO_Y_TRAZABILIDAD.csv` |

Las tablas contienen DOI, PubMed, PMC u otros enlaces en las columnas `doi_url` o `URL`. Cuando una referencia carezca de enlace o se vaya a usar para una decisión relevante, verificar su existencia y que respalda la afirmación exacta.

## 5. Orden de consulta eficiente

1. Define primero la pregunta concreta y el resultado que se quiere optimizar.
2. Localiza los estudios en las bases CSV.
3. Lee el informe narrativo que contextualiza esos estudios.
4. Separa: hallazgo directo, inferencia biomecánica y aplicación práctica.
5. Si hay conflicto, consulta `00_CONTEXTO_Y_METODO/03_PREGUNTAS_PENDIENTES.md` y `01_GLUTEO/07_PROGRAMACION_AVANZADA_Y_CONTROVERSIAS.md`.
6. Solo después propone una decisión de entrenamiento.

## Instrucción lista para el entrenador

> Usa `10_GUIA_NAVEGACION_PARA_ENTRENADOR.md` como índice de este corpus. Para cada pregunta, empieza por las tablas de estudios y revisa después el informe narrativo correspondiente. Distingue explícitamente evidencia directa, inferencia biomecánica y aplicación rotulada. No presentes una EMG ni una preferencia estética como prueba directa de hipertrofia. Conserva IDs, DOI/enlaces y limitaciones al justificar decisiones.

