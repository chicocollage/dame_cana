# Traspaso técnico — Registro de entrenamiento v14

Fecha: 2026-08-02
Estado: código validado y versión 6 publicada de forma privada en Sites.

## Cambio principal

La v14 corrige el temporizador y no modifica los contratos deportivos ni el almacenamiento del historial.

- `body --timer-progress` es la única fuente visual del porcentaje restante.
- La cortina usa `transform: scaleY(var(--timer-progress))` con origen inferior; el borde superior desciende hasta desaparecer.
- La barra usa `scaleX()` con la misma variable.
- No se escriben ni animan `height`, `width` o `top` durante la cuenta atrás.
- El overlay no intercepta interacción y queda entre el contenido y los controles.
- `prefers-reduced-motion` oculta la cortina sin eliminar el contador ni la barra.

## Audio

- El contexto se crea durante Iniciar o Probar sonido.
- Un contexto `closed` solo se recrea bajo un nuevo gesto del usuario.
- Los estados distintos de `running`, incluidos `suspended` e `interrupted`, intentan reanudarse.
- Los errores de creación, reanudación o programación se convierten en un resultado controlado.
- El reloj comienza sin esperar al audio.
- La finalización visual y la vibración ocurren aunque el audio falle.
- La bocina deportiva añade energía entre 410 y 620 Hz además del cuerpo grave.

Web Audio no puede garantizar un aviso exactamente a cero si Android congela completamente la PWA en segundo plano. Al recuperar la app, v14 intenta reanudar el contexto y completar el aviso. Una garantía absoluta con la pantalla bloqueada requeriría capacidades nativas ajenas a esta PWA.

## Compatibilidad y validación

- Sin cambios en `training_log.v1`, `training_history.v1` o `app_feedback.v1`.
- Sin cambios en las claves de historial o borradores.
- Caché y assets PWA actualizados de v13 a v14.
- Construcción correcta y 64/64 pruebas automatizadas superadas.
- Revisiones independientes de audio, UX móvil y pruebas sin hallazgos P0/P1.

## Pendiente real

Probar instalada y sin conexión en el Samsung Galaxy S24 Ultra:

1. **Probar sonido** con volumen multimedia activo para los tres perfiles.
2. Finalización normal con la pantalla encendida.
3. Cambio de app y regreso después de vencer el descanso.
4. Bluetooth y ruido real del gimnasio.
5. Cortina durante scroll, pausa, +30 segundos y movimiento reducido.

## Publicación verificada

- URL: `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`
- Sites: versión 6, despliegue completado correctamente el 2026-08-02.
- Código de aplicación publicado: commit `762fe1445d95598ea5881af05f7263cd9ca0dfb9`.
