# Traspaso técnico — Registro de entrenamiento v16

Fecha: 2026-08-02
Estado: código validado y versión 8 publicada de forma privada en Sites.

## Problema corregido

La v14 consideraba preparado el audio cuando `AudioContext.state` era `running`, pero no arrancaba ninguna fuente durante el gesto de Iniciar. En Android esa comprobación no demuestra que la salida física haya quedado desbloqueada.

La v16 usa conjuntamente las dos rutas admitidas por Chrome:

- crea o recupera el contexto y llama a `resume()` durante el toque;
- antes del primer `await`, conecta y arranca una fuente silenciosa de 20 ms;
- cuando el contexto está operativo, programa la alarma completa en su reloj interno para la hora final.

## Ciclo de la alarma

- Iniciar o continuar: desbloquea y programa.
- Pausar o reiniciar: cancela la alarma pendiente.
- Añadir 30 segundos: cancela y vuelve a programar para el nuevo final.
- Cambiar perfil: vuelve a programar con el perfil elegido.
- Desactivar sonido: cancela; volver a activarlo prepara y programa si el reloj sigue activo.
- Finalización: reconoce una alarma ya programada; si el contexto fue suspendido, intenta una reproducción controlada de respaldo.
- Preescucha: muestra un mensaje tanto si se envía al dispositivo como si el navegador la bloquea, sin poder confirmar el volumen físico.

## Compatibilidad y validación

- Sin cambios en `training_log.v1`, `training_history.v1` o `app_feedback.v1`.
- Sin cambios en claves de historial, borradores o preferencias.
- La cortina visual v15 permanece igual.
- Caché y referencias de assets PWA actualizadas de v15 a v16.
- Construcción correcta y 77/77 pruebas automatizadas superadas.

## Límite de plataforma

La v16 mejora la alarma con la app visible y el contexto activo. Una PWA no puede garantizar sonido si Android congela, descarta o cierra la página, ni sustituye un servicio de alarma nativo con la pantalla bloqueada.

## Prueba pendiente en Galaxy S24 Ultra

1. Cerrar completamente la versión anterior y abrir v16.
2. Abrir opciones y pulsar **Probar sonido** con volumen multimedia activo y Bluetooth desconectado.
3. Iniciar un descanso de un minuto y mantener la PWA visible.
4. Repetir con Bluetooth y después cambiando temporalmente de aplicación.
5. Registrar si aparece **Aviso enviado**, **Sonido preparado** o el mensaje de bloqueo.

## Publicación

- URL: `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`
- Sites: versión 8, despliegue completado correctamente el 2026-08-02.
- Código de aplicación publicado: commit `64e1383f9c2aa1d5436fab1f84bda26bcc209b1a`.
