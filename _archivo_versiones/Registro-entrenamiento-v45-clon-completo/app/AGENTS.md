# Instrucciones del proyecto — Registro de entrenamiento

## Contexto obligatorio

Antes de diseñar o implementar cambios, leer completamente:

1. `docs/TRASPASO_APP_v9.md`
2. `docs/TRASPASO_APP_v22.md`
3. `docs/ROADMAP.md`
4. `docs/CONTEXTO_PRODUCTO_ENTRENADOR.md`

Inspeccionar después el código y confirmar el estado real del repositorio. Los documentos orientan, pero el código y las pruebas determinan el comportamiento existente.

## Responsabilidad de la aplicación

- La app interpreta, presenta, registra, conserva y exporta entrenamientos prescritos por el entrenador AI.
- La app no diseña programas, cambia ejercicios, prescribe cargas, diagnostica molestias ni sustituye las decisiones del entrenador.
- Mantener la interfaz rápida y utilizable con una mano en un Samsung Galaxy S24 Ultra.
- Mantener el procesamiento de la nota y el historial en el dispositivo, salvo autorización expresa para cambiar el modelo de privacidad.

## Contratos que no deben romperse

- Conservar compatibilidad con `training_log.v1` y `training_history.v1`.
- No borrar sesiones locales al importar o restaurar.
- No autorrellenar repeticiones realizadas ni RIR.
- Comparar únicamente ejercicios con identidad y modo de resistencia compatibles.
- Una corrección manual prevalece sobre una detección automática.
- Mantener carga externa, autocarga y TRX como modos distintos.
- Cuando cambien recursos de la PWA, actualizar de forma coherente la caché del service worker y las versiones de los assets.

## Forma de trabajar

- Git es la fuente canónica; Sites debe derivarse siempre de un commit validado y recuperable.
- Preservar cambios ajenos y comprobar `git status` antes de editar.
- Implementar el cambio mínimo robusto solicitado; el roadmap no constituye autorización para desarrollar todos sus puntos.
- Actualizar las pruebas afectadas y ejecutar `npm test` antes de entregar.
- No aplicar automáticamente correcciones de dependencias que puedan romper compatibilidad.
- El proyecto usa Sites. Para cambios publicables, seguir las skills `sites-building` y `sites-hosting` y desplegar solo cuando el encargo incluya implementar/publicar la actualización.
- Mantener actualizados los documentos obligatorios cuando cambien arquitectura, contratos, decisiones de producto o prioridades.

## Comunicación

- Responder en español salvo indicación contraria.
- Empezar por el resultado práctico.
- Diferenciar hechos verificados, inferencias y pendientes de comprobar en el móvil real.
