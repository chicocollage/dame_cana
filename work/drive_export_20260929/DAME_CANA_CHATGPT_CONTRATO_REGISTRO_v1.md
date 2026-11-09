# DAME CAÑA — Contrato de registro con ChatGPT v1

Estado: especificación para implementar y probar. ChatGPT todavía no guarda entrenamientos mediante este contrato.

# Objetivo y límite

Permitir que Daniel dicte o escriba series en ChatGPT y termine con una sesión registrada una sola vez en DAME\_CANA\_OPERATIVO\_v3. La app y ChatGPT serán dos entradas al mismo historial. Este documento no cambia el programa, el esquema training\_log.v1 ni las tablas existentes por sí mismo.

# Autoridad y recorrido

La ejecución real se expresa como training\_log.v1. La app actual ya usa este esquema y su importador vuelca sesiones y series a 03\_SESIONES y 04\_SERIES, con trazabilidad en 99\_IMPORT\_LOG y un JSON bruto en 02\_JSON\_PROCESADOS.  
ChatGPT no añadirá filas directamente a esas pestañas. El adaptador de registro deberá enviar el mismo contrato al proceso de importación existente, conservar session.id y event\_id y leer después el resultado. Si el adaptador no está disponible, el resultado es un borrador o un texto para la app, nunca una sesión guardada.

# Estados de una sesión

BORRADOR: datos capturados y corregibles; todavía no cuentan como entrenamiento realizado. El borrador debe sobrevivir a cerrar o interrumpir el chat mediante una persistencia probada, compatible con el flujo de borrador de la app o con un almacén equivalente.  
PENDIENTE\_DE\_REVISION: Daniel ve fecha, día, ejercicios, series reales, unidades, RIR, notas y campos desconocidos. Las series prescritas no se copian como realizadas.  
ENVIADA: Daniel confirma la finalización y el adaptador remite un training\_log.v1 válido una sola vez, con identificadores estables.  
VERIFICADA: se observa el mismo session.id en 03\_SESIONES, sus series en 04\_SERIES y el evento en 99\_IMPORT\_LOG. IMPORTED confirma una incorporación; DUPLICATE solo se acepta como reintento correcto cuando el contenido coincide con lo ya guardado.  
ERROR: no hay confirmación de persistencia. Se conserva el borrador y se muestra qué quedó pendiente, sin afirmar que se guardó.

# Datos que se capturan

Sesión: session.id estable desde el inicio, fecha local de entrenamiento, título o día si se conoce, estado finished y recuentos calculados desde resultados reales.  
Ejercicio: orden, nombre e identidad disponible; variante, máquina, ajustes, load\_basis, resistencia y carácter por lado cuando se conozcan. El nombre comercial solo no establece comparabilidad.  
Serie realizada: índice, carga y unidad o resistencia, repeticiones, RIR y notas relevantes. Un campo no aportado queda vacío o null conforme al esquema; nunca se transforma en cero ni en objetivo cumplido.  
Evento: event\_id estable para reintentos y hora de exportación. La fecha de sesión y la hora técnica de envío deben normalizarse y probarse con la zona horaria de Daniel y la de la hoja.  
Fotos, medidas, salud y cambios de programa no se insertan dentro de training\_log.v1 por comodidad: siguen sus dominios y permisos propios.

# Reglas de conversación

Aceptar frases cortas y correcciones como «la segunda serie fueron 9, no 10». Repetir solo lo necesario para resolver ambigüedades que afecten identidad, carga, repeticiones o seguridad. Mostrar el borrador actualizado antes del envío.  
Si Daniel cambia una máquina, resistencia o ajuste, conservar el dato y revisar si rompe la comparabilidad con exposiciones anteriores. No asignar machine\_id ni comparability\_group sin identificación suficiente.  
«Prepara la sesión» no registra nada. «Terminé» permite preparar la revisión; «finaliza y guarda» autoriza el envío del resumen revisado. Si falta la ruta de escritura, explicar que no hubo guardado y ofrecer el texto estructurado para la app.  
Una decisión de cambiar volumen, ejercicio o carga objetivo se registra por el flujo de decisiones; un entrenamiento completado no reescribe por sí solo 02\_PROGRAMA\_ACTIVO.

# Reintentos y correcciones

La misma sesión no puede crear filas duplicadas por cambio de chat, reconexión o reenvío del JSON bruto. Reintentar con session.id y event\_id estables. Si existe el mismo session.id con contenido diferente, detener el reintento y tratarlo como conflicto.  
La corrección de una sesión ya importada necesita una operación explícita, con versión o auditoría y reconciliación de sus series. El importador actual deduplica; hasta verificar una ruta de corrección, no prometer edición de sesiones cerradas ni crear una segunda sesión para ocultar el error.

# Puertas antes de activar

Prueba de captura y recuperación de borrador después de interrumpir el chat.  
Prueba de esquema training\_log.v1 con series reales, campos ausentes y ejercicios por lado.  
Prueba de importación única y reintento idéntico sin duplicados; conflicto de contenido detectado.  
Prueba de lectura posterior en 03\_SESIONES, 04\_SERIES y 99\_IMPORT\_LOG, y conservación del JSON bruto.  
Prueba de fechas y zonas horarias sin desplazar el día de entrenamiento.  
Prueba de que una máquina no identificada no genera una progresión de carga automática.  
Solo después de superar estas puertas se podrá describir el registro por ChatGPT como operativo.  
