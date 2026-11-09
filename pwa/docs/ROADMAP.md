# Backlog vigente — Registro de entrenamiento

Fecha de revisión: 2026-08-22
Alcance: solo trabajo no resuelto, validaciones pendientes o decisiones descartadas. El historial de entregas se conserva en Git y en `CHANGELOG.md`.

## Correcciones visuales prioritarias

### Selector RIR cubierto por el temporizador

- **Estado:** resuelto en v40; pendiente de confirmar en Galaxy real.
- **Problema:** al abrir las opciones del RIR, el dock fijo de descanso las tapa y no permite seleccionar los valores inferiores.
- **Criterio de aceptación:** el selector queda completamente visible y operable por encima del dock, sin romper el cierre al elegir, tocar fuera o pulsar Escape.
- **Implementación:** el picker abierto usa `z-index: 30` por encima del dock (`z-index: 15`), conservando el cierre por selección, clic externo y Escape.

### Borde y progreso del temporizador fuera del panel

- **Estado:** resuelto en v40; pendiente de confirmar en Galaxy real.
- **Problema:** el borde/progreso turquesa queda expuesto fuera del bloque visual del temporizador.
- **Criterio de aceptación:** el borde y la barra de progreso quedan contenidos dentro del panel del temporizador, sin perder lectura ni áreas de toque.
- **Implementación:** el dock móvil conserva `overflow: visible` y el progreso se recorta dentro de un `rest-dock-shell` interno con `overflow: hidden`, sin alterar controles ni zonas de toque.

## Mejoras funcionales en espera

### Alias personales y registro TRX más granular

- **Estado:** pendiente.
- **Decisión:** incorporar alias y campos específicos solo después de observar vocabulario y configuraciones reales, sin añadir complejidad prematura.

### Persistencia del temporizador ante cierre forzado de Android

- **Estado:** pendiente de evaluar.
- **Límite conocido:** recalcular al volver a la PWA no garantiza sobrevivir si Android finaliza el proceso.
- **Criterio de decisión:** valorar una solución solo tras probar suspensiones y cierres reales en el dispositivo.

### Flujo rápido entre series y analítica

- **Estado:** pendiente.
- **Decisión:** diseñarlo cuando exista suficiente historial estructurado; no debe invadir las decisiones del entrenador ni alterar datos realizados.

### Sustitución del icono de marca

- **Estado:** pendiente opcional.
- **Condición:** si se aprueba, generar derivados para `icon-192`, `icon-512`, `icon-maskable-512` y `apple-touch-icon`, y actualizar de forma coherente los recursos de la PWA.

## Validación pendiente en dispositivo real

- Conservar historial y sesión activa tras actualizar la PWA instalada.
- Comprobar audio con la app visible y con Bluetooth en un entorno real.
- Comprobar pantalla bloqueada, suspensión prolongada y cierre forzado de Android.
- Revisar áreas seguras, teclado y contraste en Samsung Galaxy S24 Ultra.

## Propuestas descartadas

- Ninguna propuesta figura como descartada de forma explícita. Cuando se descarte una, registrar aquí la decisión y su motivo antes de eliminarla del backlog.
