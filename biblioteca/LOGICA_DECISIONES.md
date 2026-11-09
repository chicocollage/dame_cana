# Una lógica para todas las modificaciones

Versión 1.0 — 09/10/2026. Esta lógica organiza decisiones de investigación, entrenamiento, datos y aplicación. No ejecuta cambios automáticamente.

## Cómo actuar con un complemento

1. **Identifica el problema y el destino.** ¿Qué decisión, regla, archivo o función concreta quieres cambiar? Si no está definido, la ficha es una idea pendiente.
2. **Separa el dato de su interpretación.** Marca cada apoyo como fuente científica, inferencia, dato personal, requisito o resultado de una prueba. Una referencia escrita todavía puede estar sin verificar.
3. **Compara antes y después.** Describe una modificación acotada, su utilidad, su coste, qué sustituye y qué queda igual. Comprueba propuestas rivales y dependencias.
4. **Decide.** Daniel acepta, rechaza o pide una prueba. La existencia de una ficha, una etiqueta histórica «activo» o una fecha más reciente no acreditan aceptación.
5. **Aplica y verifica.** Una aceptación es permiso para el alcance registrado, no prueba de ejecución. Guarda la versión anterior y comprueba el resultado en la fuente de destino.
6. **Revisa o revierte.** La ficha incluye un criterio observable, cuándo medirlo y cómo volver al estado anterior. Un cambio sustituido conserva su procedencia.

## Estados y significado

| Estado | Qué permite |
|---|---|
| Propuesto | Leer, contrastar y decidir. No modifica la base vigente. |
| Aceptado | Preparar o aplicar únicamente el alcance aceptado y fechado. |
| En prueba | Aplicación provisional autorizada, con duración y salida definidas. |
| Incorporado | Cambio aplicado y comprobado en su destino. |
| Rechazado | Conservar el motivo; no aplicar. |
| Sustituido | Conservar historia y enlazar la ficha que lo reemplaza. |

«Pendiente de datos» es un bloqueo de una ficha, no aceptación ni rechazo. Toda aceptación necesita fecha y referencia a la decisión de Daniel; toda incorporación necesita comprobación del destino. Una ficha puede ser aceptada para una sesión y seguir propuesta para el programa semanal.

## Efecto sobre el contenido central

Usar uno: confirma, amplía, matiza, contradice, sustituye o no afecta. Si contradice, no combinar silenciosamente ambas versiones: indicar conflicto, ámbito y fuente pendiente. Si sustituye, identificar qué deja de gobernar y guardar su versión anterior.

El corpus es una edición documental fechada; no una garantía de validez científica. Se conservan copias originales inalteradas. Una corrección se publica como complemento. Para una futura edición del corpus se necesita un registro de qué se incorporó, qué se sustituyó y verificación de referencias.

## Qué gobierna en cada dominio

- **Investigación:** corpus + complementos incorporados cuyo alcance sea investigación. Las propuestas siguen separadas. Los resultados originales de publicaciones necesitan verificación cuando sean decisivos.
- **Entrenamiento previsto:** `../data/programa.json`; adaptar una sesión no reescribe la plantilla semanal.
- **Lo realizado:** `../data/registro.json`; una propuesta nunca cuenta como entrenamiento ejecutado.
- **Carga y máquinas:** `../data/maquinas.json` y confirmaciones fechadas; comparar solo montajes equivalentes.
- **Decisiones personales:** `../data/estado_y_decisiones.json` y `../data/confirmaciones_usuario.json`; las fechas limitan qué puede afirmarse como actual.
- **Aplicación:** proyecto protegido RegistroEntrenamientoApp. Una especificación no acredita desarrollo ni despliegue.
- **Biblioteca:** las fichas Markdown son el registro de cada complemento. `control/COMPLEMENTOS.csv` y `.json` son vistas derivadas; actualizar ambas al modificar una ficha y verificar que coincidan.

## Control eficiente

Registrar una vez la decisión en su fuente de dominio y enlazarla desde la ficha. Daniel puede decir «revisa CMP-…», «acepto CMP-… para…» o «revierte CMP-…»; el asistente completa los campos, compara fuentes y verifica. No pedir que vuelva a transcribir series ni crear una obligación de leer todo el corpus antes de cada sesión.

Antes de actuar, devolver solo: cambio, motivo, dato decisivo, incertidumbre, alcance y siguiente acción. Cuando falten evidencia o autorización del alcance, mantener la propuesta visible. No progresar cargas, añadir volumen, editar la app ni fusionar fichas científicas por el mero hecho de aparecer aquí.
