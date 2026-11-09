# Formulario personal DAME CAÑA

**Enlace para móvil y PC:** [Abrir la ficha en Sites](https://dame-cana-ficha-daniel.danielabrilcortes.chatgpt.site). Sitio privado para Daniel, publicado el 30/09/2026; entra con la misma cuenta de ChatGPT. Funciona desde cualquier conexión y con el PC apagado.

Si ya rellenaste respuestas en la dirección local, descarga allí **Guardar copia para continuar** y recupérala en el enlace nuevo. Los borradores pertenecen al navegador y a la dirección donde se rellenaron.

Abre `index.html` con tu navegador. Es una web autónoma: funciona sin conexión y no necesita cuentas, instalaciones ni Google. Puedes copiar ese archivo a otro dispositivo y abrirlo allí.

1. Completa los apartados que te resulten útiles. Incluye las 25 preguntas del documento original, 21 fichas de estaciones y la elección del patrón de sentadilla. No tienes que repetir las series de entrenamiento.
2. El borrador se guarda en el mismo navegador, dispositivo y ubicación web. Para llevarlo a otro dispositivo o conservarlo si limpias el navegador, pulsa **Guardar copia para continuar** en **Revisar y descargar**. Esa copia JSON se recupera con **Continuar desde una copia de respuestas**.
3. Pulsa **Descargar documento** para generar un archivo Markdown legible por el entrenador. También puedes ver y copiar el documento desde la web y pegarlo en el chat.
4. Adjunta el documento al chat, o guárdalo en `data/respuestas_formulario/` dentro del proyecto y pide **«integra mis respuestas del formulario»**. El entrenador revisará su procedencia y los datos antes de incorporarlos a los archivos del sistema.

Todos los campos son opcionales. Un cero es una respuesta; un campo vacío queda «sin responder». «No sé» y «no aplica» se conservan. Una estación con alguna respuesta todavía puede tener ajustes o base de carga pendientes. Las fotos se mencionan por nombre de archivo; las imágenes se guardan por separado en `data/fotos_maquinas/`.

Las respuestas del cuestionario se guardan en `data/respuestas_formulario/`. La bandeja `data/inbox_app/` está destinada a las exportaciones de sesiones de la app.

La vista abierta en Codex se sirve temporalmente en `http://127.0.0.1:8764/`. El archivo `index.html` funciona de forma independiente de esa vista. Abrir la web desde otra dirección o navegador crea un borrador distinto; usa la copia de respuestas para trasladarlo.

El proyecto de publicación está en `site/`, con vínculo de Sites en `site/.openai/hosting.json`. Solo se publica el formulario estático. Los documentos de respuestas se generan en el navegador; las sesiones de entrenamiento y los archivos de datos locales permanecen en esta carpeta.

Fuente: `PREGUNTAS_PARA_DANIEL.md`, versión consultada el 30/09/2026. La web conserva la huella de esa fuente en los documentos exportados. Si cambia el cuestionario, se debe regenerar y comprobar la correspondencia antes de recuperar una copia antigua.
