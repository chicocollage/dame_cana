# Revisión de Drive y actualización documental
Biblioteca 1.1 · 10/10/2026.

La revisión directa de Drive completa la unificación local del 09/10. Se conserva el corpus básico de 42 archivos y se añade una capa de fuentes históricas de consulta. No cambia el programa, la aplicación, los registros ni el perfil personal.

## Qué se leyó y comparó
- 88 archivos de Drive: 74 del paquete de investigaciones y 14 fuentes relacionadas de DAME CAÑA.
- 46 archivos de texto/documentos/PDF, y 42 hojas de cálculo con 47 pestañas.
- Todas las pestañas examinadas se leyeron con nombres y límites comprobados en sus metadatos; la lectura llegó hasta la fila 1000 o el límite inferior de la pestaña. Las últimas filas con contenido aparecieron entre la 1 y la 88. Se capturaron valores mostrados; no se auditó la lógica de todas las fórmulas.
- Se agotaron las páginas devueltas para las búsquedas ESTUDIOS, CORPUS, EVIDENCIA y GLUTEO; se enumeraron las carpetas y el contenido del paquete. MEJORAS no devolvió un paquete B1–B5 independiente equivalente a la carpeta local.
- Lecturas y comparación se apoyan en el inventario local previo, el corpus y las fuentes locales externas. Esto cubre el paquete identificado y las fuentes relacionadas encontradas, no certifica todos los documentos posibles de la cuenta.

## Resultado de la comparación
| Conjunto | Resultado | Decisión |
|---|---|---|
| 41 tablas del paquete | Valores de celdas iguales a equivalentes locales tras normalizar blancos/Unicode; no solo nombres iguales | Conservar tablas locales; no duplicarlas |
| Documentos del paquete | Coincidencias de texto y diferencias de conversión: listas, marcadores y enlaces no expuestos en la extracción de Google Docs | Conservar Markdown local y sus enlaces; no reemplazarlo por texto de menor fidelidad |
| Ciencia y biblioteca v2/v3 | Contenido histórico ya localizado en documentos externos al corpus; dos representaciones con diferencias de envoltorio y formato | Incorporar consulta fechada sin cambiar autoridad operativa |
| Matriz de selección v2 | Se leyeron sus seis pestañas; no estaba en el corpus como un archivo de consulta propio | Captura conjunta en JSON, con procedencia y límites |
| Dos PDF «Ensayo - Glúteo Estético Masculino» | SHA-256 idéntico entre ambos y al PDF local: 12e11c18d5d9505fd2b555f283621601f14eea31dab9e7450e3f5498ac88ff15 | Una sola copia del PDF en la ampliación |
| Informe completo v3 | Síntesis general posterior al corte de agosto; no se localizó un equivalente propio | Incorporar como informe histórico, no como fuente primaria de salud o rutina actual |

La igualdad textual automática inicial encontró 12 documentos y 41 pestañas iguales después de normalizar. Una similitud alta no acredita equivalencia completa. El registro de comparación conserva los candidatos, sus diferencias y la decisión, sin ocultar esa limitación.

## Qué se incorpora
1. [Ciencia y biblioteca en Markdown](ampliaciones/2026-10-10/DOC_3_CIENCIA_Y_BIBLIOTECA.md): preserva la presentación de la fuente textual y sus referencias.
2. [Ciencia y biblioteca v3, texto leído de Google Docs](ampliaciones/2026-10-10/CIENCIA_Y_BIBLIOTECA_V3.txt): versión de migración 14/08; complementa procedencia, no gobierna la persistencia actual.
3. [Matriz de selección v2](ampliaciones/2026-10-10/MATRIZ_SELECCION_V2.json): seis pestañas en un archivo —LEEME, Ejercicios, Sustituciones, Criterios, Transferencia y Fuentes—.
4. [Ensayo glúteo estético masculino](ampliaciones/2026-10-10/ENSAYO_GLUTEO_ESTETICO_MASCULINO.pdf): síntesis histórica, una copia.
5. [Informe general v3](ampliaciones/2026-10-10/INFORME_DAME_CANA_V3_HISTORICO.txt): explicación histórica del sistema.

Estas cinco fuentes no son cinco modificaciones aceptadas de rutina. Se consultan desde la misma biblioteca y se convierten en decisiones solo mediante la lógica de complementos.

## Límites que se mantienen
- No se ha vuelto a contrastar cada publicación con el artículo primario. Comparar archivos no valida la evidencia científica.
- En esta revisión de Drive las ocho variantes aún estaban pendientes. Se resolvieron después mediante contraste con publicaciones externas: [resolución y límites](CONTRASTE_BIBLIOGRAFICO_2026-10-10.md), incorporada en CMP-2026-REF01. La coincidencia de Drive con las tablas no fue la prueba utilizada.
- La matriz histórica ofrece opciones; no se suman ejercicios ni se transfieren kilos por semejanza.
- El informe menciona dificultad para cubrir calorías con sólidos y uso de productos líquidos/sustitutivos. Es una afirmación de una síntesis histórica, sin confirmación primaria identificada en esta revisión: no actualiza automáticamente el perfil ni una pauta nutricional.
- Los ejemplos, datos personales de agosto y reglas antiguas que designan Drive como autoridad son antecedentes. El proyecto local, su perfil fechado y las confirmaciones posteriores gobiernan el sistema actual.
- No se han borrado fuentes remotas anteriores ni archivos originales externos.

## Copia local y copia Drive
La biblioteca se conserva como archivos originales —Markdown, CSV, JSON, TXT y PDF— con la misma estructura de carpetas, sin convertirlos a documentos nativos. Esto permite una copia de bytes y evita perder enlaces o formatos al convertir.

Carpeta remota: [DAME_CANA_BIBLIOTECA_UNIFICADA](https://drive.google.com/drive/folders/15U4eC8QLB_1Xo5vzCVoSAMANvxvvB-3l).

El espejo se verifica mediante rutas, recuentos y SHA-256 de los archivos descargados desde Drive. La evidencia final de la operación se guarda fuera de la biblioteca para no generar un manifiesto que cambie su propio hash. No se activa sincronización automática: al modificar la biblioteca deberán actualizarse y verificarse las dos copias.

La navegación con enlaces relativos funciona al descargar la estructura local. En la vista de Drive los archivos son copias originales, no un portal web; los vínculos al sistema operativo padre quedan fuera del espejo científico.

## Reversión
Respaldo íntegro anterior: data/backups/biblioteca_drive_20261010/biblioteca/ dentro del proyecto local. Restaurarlo revierte esta edición; los originales externos y remotos anteriores siguen en sus ubicaciones.

