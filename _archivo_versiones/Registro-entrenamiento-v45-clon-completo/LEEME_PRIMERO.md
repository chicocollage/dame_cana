# Registro de entrenamiento — paquete de clonación v45

Exportado el 12 de octubre de 2026 desde la fuente de Sites. Commit: `ac182d852243ebc3c875e2fddbac56f8a799d3b5`. Versión Sites: 30. Aplicación y caché: v45.

## Contenido

- `app/`: todos los archivos versionados del commit, incluidos código, iconos, biblioteca PDF, documentación histórica, pruebas, dependencias fijadas y configuración de compilación.
- `guias/`: arquitectura actual, reproducción, datos e instrucciones para la IA.
- `datos/indicaciones_tecnicas.v1.json`: las 55 fichas extraídas de la copia incluida en la app publicada, con su contenido y estado originales.
- `datos/historial-navegador-actual.training_history.v1.json`: exportación real obtenida mediante Historial → Exportar historial para IA, en el navegador integrado de Codex. Contiene cinco sesiones; no acredita que sean todo el historial personal de Daniel ni los datos de su móvil.
- `herramientas/exportar_almacenamiento.js`: exportación local opcional de las claves de datos de esta app; debe ejecutarse por su propietario en la consola del navegador de origen.
- `despliegue/registro-entrenamiento-v45.tar.gz`: paquete de despliegue conservado de este mismo commit, publicado con éxito. No equivale a una distribución independiente de Cloudflare/Sites.
- `referencias/ficha-tecnica-hip-thrust.png`: imagen de la revisión visual local de v45.
- `verificacion/`: resultados de pruebas y manifiesto de integridad de archivos.

## Límites de la copia

El código y los recursos se conservan exactamente, sin rediseño ni traducción de frameworks. `node_modules` se reinstala con `npm ci`; no se incluye una instalación específica de Windows.

La app no tiene base SQL activa: `d1` y `r2` son `null` y `db/schema.ts` está vacío. Las carpetas DB/Drizzle son infraestructura de ejemplo y configuración, no una base de datos con entrenamientos. La información real de la app vive en localStorage de cada origen y navegador.

No se ha recuperado el código ni los datos del servicio externo de Google Apps Script/Sheets. El cliente original y su URL están incluidos tal cual. Para una copia independiente de la sincronización y Comandos IA, hay que aportar ese proyecto externo o implementar y verificar su contrato. Las cuentas, permisos privados y credenciales de Sites tampoco son archivos portables.

No reutilices el identificador `.openai/hosting.json` para publicar un proyecto nuevo sobre la aplicación original. Sigue `guias/02_CLONAR_Y_VALIDAR.md`. No se han incluido tokens de fuente, cookies, contraseñas, archivos .env ni configuración Git con credenciales.

Empieza entregando `guias/04_PROMPT_PARA_LA_IA.md` a la IA que va a clonar el proyecto.
