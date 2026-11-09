# Registro de cambios — Registro de entrenamiento

Este archivo anota las versiones funcionales posteriores a v9. Los cambios mantienen `training_log.v1` y `training_history.v1` y procesan los datos en el dispositivo.

## v45 — 2026-10-12

- Incorporadas las fichas técnicas de los 55 ejercicios de `indicaciones_tecnicas.json`, conservando contenido y estado de borrador.
- Consulta desde la tarjeta o «Ver técnica», con giro, vuelta al registro, Escape y respeto de movimiento reducido. Los controles de series no activan el giro; las fichas no modifican datos de sesión.
- Vinculación por catálogo y nombres exactos/alias definidos; ejercicios no identificados muestran ficha pendiente. Recursos incluidos en caché offline v45.

## v44 — 2026-10-06

- Corregida la detección de «máquina» con tilde en el catálogo y alineada la variante de cable con el intérprete.
- Al añadir un ejercicio se recupera la identidad del último registro del mismo nombre y modo con resultados anteriores; no se copian resultados realizados. Las referencias siguen comparando estrictamente variante, ajustes y base de carga.
- Cuando una sesión ya abierta tiene otra identidad, se ofrece recuperarla mediante confirmación sin cambiar sus series. Los registros históricos y contratos permanecen intactos.
- Aplicación y caché sincronizadas en v44. Pruebas de regresión cubren tres referencias, datos antiguos, ausencia de resultados, modos incompatibles y ajustes diferentes.

## v32 — 2026-08-18

- Compactada la tarjeta de ejercicio para móvil: el control **Sustituir** pasa a la cabecera, la regla lateral desaparece y los títulos principales se ajustan a 22 px.
- Reorganizada cada serie en una rejilla táctil; carga y repeticiones evitan el zoom de Safari, RIR se concentra en una píldora y el borrado tiene un área de toque de 40 × 40 px sin ampliar el icono visual.
- La cortina del temporizador pasa a verde lima translúcido y no intercepta toques ni desplazamiento.
- El catálogo de ejercicios ofrece filtros musculares horizontales; las confirmaciones de borrado, importación, cambios incompatibles y finalización usan un diálogo HTML local, sin `window.confirm()` ni `window.alert()`.
- Conservados la persistencia local, `training_active_draft.v1`, temporizador, sincronización y los contratos `training_log.v1` y `training_history.v1`. Sincronizados aplicación, caché PWA y recursos en v32.

## v27 — 2026-08-14

- Añadido `public/app/checkin.html`, un formulario autónomo y responsivo de check-in semanal, medidas corporales y dolor/incidencias con CSS y JavaScript embebidos.
- Incorporado el contrato `checkin.v1` y el envío explícito por `POST` al Web App de Google Apps Script autorizado por Daniel; el endpoint recibe únicamente el formulario al pulsar **Guardar Check-in**.
- Añadidos promedios en vivo de cintura y cadera, ratio cadera/cintura, estados accesibles de envío y selector de tipo de registro.
- Añadido acceso **Check-in** en la cabecera sin modificar el flujo ni los contratos `training_log.v1` y `training_history.v1`.
- Sincronizados aplicación, caché PWA y referencias de recursos en v27; cada navegación conserva ahora su propia respuesta offline.

## v22 — 2026-08-12

- Reconciliadas las dos líneas que divergían desde `ae66da4`: Sites v21 (`cb84aba7`) y el pulido visual local (`9c00011`).
- Conservadas las funciones de v21: rediseño v20, borrado individual con confirmación y descansos rápidos de 15 y 30 segundos.
- Integrado el pulido visual local sobre la interfaz v21 sin cambiar la persistencia ni los contratos deportivos.
- Establecido Git como fuente canónica; Sites pasa a ser un despliegue derivado de un commit validado y recuperable.
- Sincronizados `APP_VERSION`, caché PWA y referencias de assets en v22.
- Validación local completa (`npm test`: construcción y 83 pruebas superadas); publicación pendiente. La producción continúa en Sites versión 11.

## v21 — 2026-08-09

- Publicada como versión 11 privada de Sites desde `cb84aba7`.
- Añadido borrado individual del historial, limitado a la sesión elegida y protegido por confirmación explícita.
- Añadidas duraciones rápidas de descanso de 15 y 30 segundos.
- Actualizadas pruebas de seguridad, ajustes móviles, caché y assets a v21.

## v20 — 2026-08-09

- Publicada como versión 10 privada de Sites desde `8e884f2`.
- Aplicado un rediseño visual amplio manteniendo el comportamiento y los contratos de datos de v17.
- Sincronizados aplicación, caché y assets en v20.

## v17 — 2026-08-09

- Publicada como versión 9 privada de Sites en `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`.
- Añadido `training_active_draft.v1`: un borrador local, completo y versionado de la sesión activa, separado de los contratos de historial y exportación.
- Cada edición y los eventos de ocultación/cierre de la PWA protegen la sesión antes de actualizar el historial normal.
- Una sesión no finalizada vuelve a abrirse automáticamente tras bloquear el móvil o reiniciar la PWA.
- El borrador solo se elimina después de guardar con éxito una finalización en el historial.
- Actualizada la caché PWA a v17 y añadidas pruebas de restauración, ciclo de vida y protección ante historial ilegible.

## v16 — 2026-08-02

- Publicada como versión 8 privada de Sites en `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`.
- Corregido el desbloqueo de Web Audio en Android: al tocar Iniciar, activar sonido o Probar sonido se arranca una fuente silenciosa antes del primer `await`.
- La alarma queda programada desde el inicio en el reloj preciso de `AudioContext`, en lugar de depender exclusivamente del intervalo JavaScript al llegar a cero.
- Pausar, reiniciar, ampliar el tiempo, silenciar o cambiar de perfil cancela o reprograma la alarma de forma coherente.
- La preescucha informa tanto del envío como del bloqueo sin afirmar que el altavoz físico se haya oído, y un fallo al preparar el audio se comunica al comenzar el descanso.
- Reforzada la banda media de la bocina deportiva para el altavoz integrado del móvil.
- Evitada la reproducción parcial si falla la construcción de uno de los tonos.
- Caché PWA y recursos sincronizados en v16.
- Pruebas ampliadas hasta 77 casos, incluyendo desbloqueo, programación futura, cancelación, reloj suspendido, silenciamiento durante `resume()` y fallos parciales.

## v15 — 2026-08-02

- Publicada como versión 7 privada de Sites en `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`.
- Rediseñada la cortina tomando como referencia el vídeo aportado: zona restante turquesa saturada, borde horizontal luminoso y zona ya recorrida ligeramente atenuada.
- El borde desciende de la parte superior a la inferior y todo el efecto desaparece al llegar a cero.
- Sustituida la compresión visual con `scaleY()` por traslación mediante `transform`, evitando deformar el degradado y favoreciendo la composición móvil.
- Una única variable porcentual `--timer-progress` gobierna cortina, borde y barra compacta.
- Conservados los controles sobre el efecto, los toques mediante `pointer-events: none` y la alternativa para movimiento reducido.
- Caché PWA y recursos sincronizados en v15.
- Pruebas ampliadas hasta 66 casos, incluidos el contrato visual y el orden de capas de la nueva cortina.

## v14 — 2026-08-02

- Publicada como versión 6 privada de Sites en `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`.
- Sustituida la marea basada en altura por una cortina a pantalla completa controlada con `--timer-progress` y `transform: scaleY()`.
- La cortina cubre al iniciar y su borde superior desciende hasta desaparecer en el borde inferior al llegar a cero.
- Eliminadas las escrituras animadas de `height` y `width`; la barra y la cortina comparten una sola fuente de progreso.
- Conservados los toques sobre la interfaz mediante `pointer-events: none` y añadida una alternativa sin cortina para movimiento reducido.
- Corregido el ciclo de Web Audio para recrear contextos cerrados y reanudar contextos suspendidos o interrumpidos.
- Un fallo de audio ya no retrasa ni interrumpe el temporizador, la vibración o el estado visual.
- Reforzada la bocina deportiva con armónicos medios y mayor energía para altavoces móviles.
- Añadido un aviso visible cuando el dispositivo bloquea el audio.
- Caché PWA y recursos sincronizados en v14.
- Pruebas ampliadas hasta 64 casos, con contratos visuales, ciclo de audio Android y finalización asíncrona idempotente.

## v13 — 2026-08-02

- Publicada como versión 5 privada de Sites en `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`.
- Añadida la importación directa de entrenamientos antiguos desde texto.
- Añadido un intérprete local estricto con errores por línea, advertencias y soporte para carga externa, TRX y autocarga.
- Añadida una vista previa editable antes del alta y un borrador de texto local.
- El alta histórica es acumulativa, crea un ID nuevo, avisa de posibles duplicados y nunca reemplaza por fecha o título.
- Bloqueadas las escrituras cuando el historial local no puede leerse de forma segura.
- Evitados los datos ocultos incompatibles al corregir el modo de resistencia; el cambio requiere confirmación si debe limpiar carga o dificultad.
- Corregido el borrado de la fecha en la vista previa para que impida guardar.
- Ordenado el historial visible por fecha descendente.
- Mejorada la accesibilidad del temporizador para que la región viva anuncie solo cambios de estado.
- El temporizador activo conserva sus controles al navegar fuera de la sesión y el aviso visual ya no se solapa con su panel móvil.
- Ampliado el contexto de los comentarios de uso con ejercicio, serie y campo, manteniendo compatibilidad con entradas v1 anteriores.
- Pruebas ampliadas hasta 54 casos, incluyendo ida y vuelta de ambos contratos JSON, almacenamiento ilegible, cambios de modo y texto histórico parcial o incompatible.

## v12 — 2026-08-02

- Añadidos tres perfiles de alarma offline: bocina deportiva, campana limpia y pulso grave.
- Añadidas selección persistente, preescucha, silencio y vibración de respaldo.
- Confirmado que pausar, reiniciar o cancelar no reproduce la alarma.

## v11 — 2026-08-02

- Rediseñado el temporizador como dock fijo de mayor peso visual.
- Añadida una marea de color descendente, etapas cromáticas, pausa, +30 segundos y panel de opciones.
- Adaptado el dock a teclado móvil, áreas seguras y movimiento reducido.

## v10 — 2026-08-02

- Añadido el botón **Anotar mejora** y un formulario rápido de fricción.
- Guardado local separado del historial deportivo mediante `app_feedback.v1`.
- Añadidas consulta, exportación y normalización compatible de comentarios.

## v9 y anteriores

El estado base y sus decisiones se conservan en `TRASPASO_APP_v9.md`.
