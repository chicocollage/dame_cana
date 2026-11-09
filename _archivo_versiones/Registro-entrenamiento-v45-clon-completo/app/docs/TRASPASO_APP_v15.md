# Traspaso técnico — Registro de entrenamiento v15

Fecha: 2026-08-02
Estado: código validado y versión 7 publicada de forma privada en Sites.

## Cambio principal

La v15 adapta el temporizador a la referencia visual aportada y no modifica los contratos deportivos ni la persistencia.

- `body --timer-progress` sigue siendo la única fuente visual del porcentaje restante, ahora expresada como porcentaje CSS.
- La zona inferior turquesa representa el tiempo restante y desciende mediante `transform: translate3d()` sin deformar el degradado.
- Un borde luminoso desciende mediante `transform: translate3d()` hasta la parte inferior.
- Una capa tenue distingue la zona ya recorrida mientras el temporizador está activo.
- Todo el efecto se desvanece al terminar; la pausa conserva la posición con menor intensidad.
- La capa mantiene `pointer-events: none`, queda bajo el dock y respeta `prefers-reduced-motion`.
- No se animan `height`, `width` ni `top` durante la cuenta atrás; la barra compacta usa `clip-path` con la misma variable.

## Compatibilidad y validación

- Sin cambios en `training_log.v1`, `training_history.v1` o `app_feedback.v1`.
- Sin cambios en claves de historial, borradores o preferencias del temporizador.
- Audio y vibración conservan el comportamiento de v14.
- Caché y referencias de assets PWA actualizadas de v14 a v15.
- Construcción correcta y 66/66 pruebas automatizadas superadas.

## Pendiente en dispositivo real

Probar instalada en el Samsung Galaxy S24 Ultra:

1. Comparar intensidad del turquesa y del borde con el vídeo de referencia.
2. Confirmar legibilidad de formularios bajo el filtro en interior y gimnasio.
3. Comprobar descenso, pausa, continuación y suma de 30 segundos.
4. Verificar que todos los controles bajo la capa siguen respondiendo.
5. Repetir las comprobaciones de volumen, Bluetooth y segundo plano de v14.

## Publicación

- URL: `https://registro-entrenamiento-daniel.danielabrilcortes.chatgpt.site`
- Sites: versión 7, despliegue completado correctamente el 2026-08-02.
- Código de aplicación publicado: commit `98f3becc7477240608339b3fe57b57ffbda97aeb`.
