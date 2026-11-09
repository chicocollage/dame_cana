# Traspaso técnico — Registro de entrenamiento v9

Fecha del traspaso: 2026-08-02  
Estado: aplicación estable, pruebas superadas y versión privada publicada.

Actualización posterior: el estado reconciliado v22 se documenta en `TRASPASO_APP_v22.md`. Este archivo conserva la arquitectura y decisiones base de v9.

Actualización local v26: Workout Note v1 incorpora revisión editable y confirmación hacia una sesión activa recuperable. Esa sesión no entra en el historial hasta pulsar **Finalizar sesión**; los contratos `training_log.v1` y `training_history.v1` no cambian.

## 1. Propósito de este documento

Este archivo permite continuar el desarrollo en otro chat sin depender del historial completo de la conversación original. Antes de modificar la app, el nuevo chat debe leer este documento, `TRASPASO_APP_v22.md`, `ROADMAP.md` y `CONTEXTO_PRODUCTO_ENTRENADOR.md`, inspeccionar el repositorio y confirmar que los datos indicados siguen vigentes.

## 2. Estado verificable actual

- Producto: PWA móvil para convertir una nota del entrenador en una sesión rellenable.
- Versión funcional de la aplicación: `v9`.
- Último commit publicado: `472ce8a9e6eacfab714c531062490e4526c14195`.
- Mensaje del commit: `Add adaptive resistance tracking and visual rest timer`.
- Sites: versión guardada número `4`.
- URL privada de producción: `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`
- Ruta efectiva de la PWA: `/app/index.html`; la raíz redirige a esa ruta.
- Proyecto de Sites: `appgprj_6a6e38d03a7481918f1301df11c77176`.
- Estado del repositorio al crear este documento: limpio.
- Persistencia alojada: ninguna; `.openai/hosting.json` tiene `d1: null` y `r2: null`.

## 3. Ubicaciones de trabajo

### Repositorio local canónico para continuar el desarrollo

`C:\Users\Daniel\Documents\Codex\RegistroEntrenamientoApp`

Este repositorio Git independiente es la nueva fuente de control para el desarrollo. Toda actualización destinada a producción debe implementarse y validarse aquí. Se creó desde el commit publicado `472ce8a9e6eacfab714c531062490e4526c14195`.

### Documentación incorporada

`C:\Users\Daniel\Documents\Codex\RegistroEntrenamientoApp\docs`

Contiene `ROADMAP.md`, `CONTEXTO_PRODUCTO_ENTRENADOR.md` y los documentos de traspaso. A partir de ahora, las actualizaciones de la documentación deben realizarse dentro de este repositorio. La antigua carpeta administrada por ChatGPT se conserva únicamente como respaldo y no debe utilizarse como ubicación principal de un nuevo chat local.

## 4. Arquitectura

La app visible está construida deliberadamente con HTML, CSS y JavaScript sin framework en `public/app/`. Vinext/Next se utiliza como envoltorio compatible con Sites:

- `app/page.tsx`: redirige la raíz a `/app/index.html`.
- `app/layout.tsx`: metadatos, idioma, manifest e iconos.
- `public/app/index.html`: estructura y plantillas de la interfaz.
- `public/app/styles.css`: diseño responsive orientado al móvil.
- `public/app/app.js`: estado de sesión, renderizado, almacenamiento, temporizador, Wake Lock y eventos.
- `public/app/parser.js`: interpretación local de notas compactas o por bloques.
- `public/app/exercise-metadata.js`: detección local de implemento, modo de resistencia, variante, ajustes y base de carga.
- `public/app/history-tools.js`: normalización, restauración, fusión y búsqueda de la última sesión comparable.
- `public/app/json-export.js`: creación y compartición de `training_log.v1` y `training_history.v1`.
- `public/app/pdf-export.js`: PDF técnico para procesamiento por IA.
- `public/app/vendor/pdf-lib-1.17.1.min.js`: dependencia incluida localmente para crear el PDF offline.
- `public/app/sw.js`: caché offline de la PWA. La caché actual es `registro-entrenamiento-v9`.
- `public/app/manifest.webmanifest` e iconos: instalación en Android.
- `tests/rendered-html.test.mjs`: prueba de compilación y presencia de capacidades críticas.

Requisitos de entorno declarados: Node.js `>=22.13.0` y npm.

## 5. Flujo funcional actual

1. Daniel pega la nota elaborada por el entrenador AI.
2. El parser extrae título, ejercicios, series, rango de repeticiones, RIR, descanso, técnica y la etiqueta opcional `Identidad:`.
3. Las reglas locales detectan menciones explícitas como Smith, máquina, Technogym, cable, barra, mancuernas, TRX, autocarga y ajustes.
4. Se crea una sesión con campos editables únicamente para el resultado realizado.
5. La variable principal se adapta al modo de resistencia:
   - `external`: carga, repeticiones y RIR.
   - `trx`: posición o dificultad práctica, repeticiones y RIR.
   - `bodyweight`: variante, ayuda o lastre, repeticiones y RIR.
6. La app muestra la última referencia solo si ejercicio, modo, variante, ajustes y base de carga son comparables.
7. La referencia puede copiar la carga o dificultad previa, pero nunca repeticiones ni RIR.
8. Cada edición se guarda inmediatamente en el dispositivo y aparece el indicador `Guardado` o `Sin guardar`.
9. La sesión o todo el historial pueden compartirse o descargarse como JSON para una IA.
10. El historial puede restaurarse desde esos JSON sin borrar sesiones locales.

## 6. Persistencia y privacidad

Todo el contenido del usuario permanece en `localStorage`; no hay cuenta, servidor, D1, R2, API de IA ni sincronización automática.

Claves actuales:

- `registro-entrenamiento-v1`: sesiones e historial.
- `registro-entrenamiento-nota-v1`: borrador de la nota.
- `registro-entrenamiento-pantalla-activa-v1`: preferencia de Wake Lock.
- `registro-entrenamiento-sonido-v1`: preferencia del aviso sonoro.
- `training_active_draft.v1`: copia local versionada de una sesión no finalizada; no participa en exportaciones ni restauraciones de historial.

Consecuencia importante: desinstalar la PWA, borrar los datos del navegador o cambiar de navegador puede eliminar el historial local. La salvaguarda portable es **Exportar historial para IA** y posteriormente **Importar o restaurar**.

No añadir D1 u otra persistencia remota salvo decisión explícita de Daniel, porque cambiaría el modelo de privacidad, sincronización y mantenimiento.

## 7. Contratos JSON que deben conservarse

### Sesión individual

- Esquema: `training_log.v1`.
- Identidad del ejercicio:
  - `resistance_mode`
  - `variant`
  - `machine_settings`
  - `load_basis`
- Resultado por serie:
  - `load_kg`, mantenido para carga externa y compatibilidad.
  - `resistance.mode`.
  - `resistance.difficulty`, usado por TRX y autocarga.
  - `reps`.
  - `rir`.

### Historial completo

- Esquema contenedor: `training_history.v1`.
- `session_schema`: `training_log.v1`.
- Contiene sesiones completas, ordenadas por fecha.

Regla de compatibilidad: añadir campos opcionales es preferible a renombrar o eliminar campos existentes. No incrementar el esquema sin una migración y pruebas de restauración. Los historiales anteriores, que no contienen `resistance_mode` ni `difficulty`, se normalizan como carga externa.

## 8. Importación y comparabilidad

- La restauración admite un archivo `training_log.v1` o `training_history.v1`.
- La fusión se realiza por identificador de sesión.
- Una sesión local solo se actualiza cuando la importada es posterior.
- Nunca se eliminan sesiones locales durante una importación.
- La comparación exige el mismo nombre normalizado y el mismo modo de resistencia.
- Si hay identidad registrada, también deben coincidir variante, ajustes y base de carga.
- Una corrección manual prevalece sobre la detección automática y queda disponible como identidad histórica.

## 9. Temporizador y funcionamiento móvil

- Duraciones seleccionables, inicio, pausa y reinicio.
- Barra que se vacía y cambia de verde a naranja y rojo.
- El tiempo se calcula contra una hora final real para corregirse al volver de segundo plano.
- Al terminar usa vibración y dos impulsos cortos generados con Web Audio.
- El audio se activa desde la pulsación del usuario para respetar las restricciones de Android.
- El sonido puede silenciarse y la preferencia se recuerda.
- Wake Lock opcional para mantener la pantalla encendida durante la sesión.
- La PWA funciona offline mediante el service worker.

Al modificar cualquier recurso cacheado, actualizar de forma coherente tanto el identificador `CACHE` como las versiones `?v=` y la lista `ASSETS` de `sw.js`. Si no se hace, un móvil instalado puede seguir sirviendo código antiguo.

## 10. Invariantes de producto

- Prioridad: uso rápido con una mano en un Samsung Galaxy S24 Ultra.
- La nota y los registros no se envían a servicios externos.
- La interpretación de la nota se hace localmente y debe ser conservadora.
- Una inferencia ambigua se deja vacía; no se adivina.
- Los campos detectados deben permanecer visibles y corregibles.
- No autorrellenar repeticiones realizadas ni RIR.
- No convertir autocarga en `0 kg`.
- No comparar máquinas, variantes, configuraciones o modos distintos.
- No romper la importación de historiales anteriores.
- El PDF es técnico para IA, no un documento visual.
- La UI debe seguir siendo instalable, responsive y funcional sin conexión.

## 11. Validación conocida

La v9 superó las siguientes comprobaciones el 2026-08-02:

- Sintaxis de `app.js`, `parser.js`, `history-tools.js`, `json-export.js` y `exercise-metadata.js`.
- Pruebas del intérprete.
- Pruebas de detección local de ejercicios.
- Pruebas de restauración y comparabilidad.
- Pruebas de exportación JSON.
- Generación y lectura del PDF técnico.
- `npm test`, que ejecuta el build de Vinext y las pruebas de la PWA.

Comprobaciones principales:

```powershell
Set-Location 'C:\Users\Daniel\Documents\Codex\RegistroEntrenamientoApp'
npm test
```

Pruebas unitarias adicionales conservadas temporalmente en la copia anterior:

```powershell
Set-Location 'C:\Users\Daniel\.codex\.chatgpt-projects\g-p-6a69e368cd3881919245fa7f0e2b9459\outputs\registro-entrenamiento'
node parser.test.js
node exercise-metadata.test.js
node history-tools.test.js
node json-export.test.js
node pdf-export.test.js
```

No afirmar que una actualización está lista únicamente porque compila: probar de forma enfocada el comportamiento modificado y, cuando afecte a interacción o sonido, verificarlo también en el dispositivo real.

## 12. Flujo de actualización y publicación

El proyecto contiene `.openai/hosting.json`; por tanto, las modificaciones de la web deben seguir las skills `sites-building` y `sites-hosting`, además de la skill de código correspondiente.

Secuencia recomendada:

1. Leer `AGENTS.md`, este documento, `TRASPASO_APP_v22.md`, `ROADMAP.md`, `CONTEXTO_PRODUCTO_ENTRENADOR.md` y las skills aplicables.
2. Confirmar `git status`, commit actual y cambios preexistentes.
3. Trabajar exclusivamente en el repositorio local canónico; no editar la copia interna administrada por el proyecto anterior.
4. Realizar cambios pequeños y compatibles.
5. Actualizar o añadir pruebas.
6. Ejecutar las pruebas unitarias afectadas y `npm test`.
7. Revisar `git diff --check` y confirmar que el árbol contiene solo cambios intencionados.
8. Actualizar la versión de caché de la PWA cuando proceda.
9. Crear un commit deliberado y subir exactamente ese commit al repositorio privado de Sites.
10. Empaquetar el build correspondiente al mismo commit.
11. Guardar una nueva versión de Sites y desplegarla de forma privada.
12. Esperar a estado `succeeded` y devolver la URL de producción.
13. No guardar ni mostrar credenciales temporales del repositorio.

## 13. Roadmap pendiente

Fuente detallada: `ROADMAP.md`.

Prioridades conocidas:

1. Cambiar el sonido actual por un honk más reconocible, inspirado en la bocina que marca el inicio de un partido de béisbol: corto, contundente, offline y probado en el Galaxy S24 Ultra.
2. Crear un diccionario personal de alias de máquinas y nombres usados por Daniel.
3. Ampliar TRX y autocarga con campos más granulares solo si el uso real demuestra que el campo práctico actual no basta.
4. Optimizar el flujo entre series y la copia de referencias.
5. Añadir analítica únicamente cuando exista historial estructurado suficiente y una pregunta concreta que resolver.

La próxima actualización no debe intentar implementar automáticamente todos estos puntos. Primero hay que cruzar el pedido concreto con el roadmap y elegir el cambio mínimo robusto.

## 14. Inicio recomendado del nuevo chat

Mensaje para pegar junto con este archivo y `ROADMAP.md`:

> Este chat queda dedicado exclusivamente al desarrollo de la app Registro de entrenamiento. Lee completamente `TRASPASO_APP_v9.md` y `ROADMAP.md`, inspecciona el repositorio canónico y confirma el estado actual antes de modificar nada. Mantén compatibilidad con el historial y los JSON existentes. Para cada actualización, implementa el cambio mínimo robusto, sincroniza la copia visible, actualiza las pruebas y publica mediante Sites cuando yo pida implementar una versión. No uses toda la lista de pendientes como autorización para desarrollarla.

## 15. Criterio de cierre del traspaso

El nuevo chat puede empezar a trabajar cuando confirme:

- que encuentra el repositorio canónico;
- que el commit base coincide o explica cualquier avance posterior;
- que ha leído el roadmap;
- que entiende la persistencia local y los contratos JSON;
- que `npm test` pasa antes de nuevos cambios;
- y que la URL publicada continúa operativa.
