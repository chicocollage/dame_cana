# Contexto de producto — Relación con el entrenador físico

Fecha: 2026-08-02
Alcance: contexto mínimo necesario para desarrollar correctamente la aplicación.

## 1. Lugar de la app en el sistema

La aplicación es el puente operativo entre el entrenador AI y el registro de Daniel:

```text
Entrenador AI → prescribe la sesión → app registra la ejecución → JSON → entrenador AI actualiza el historial y decide
```

La responsabilidad está dividida de forma intencionada:

- **Entrenador AI:** selecciona programa y ejercicios, prescribe series, repeticiones, RIR y descansos, interpreta el historial y decide progresiones o sustituciones.
- **Aplicación:** interpreta la nota recibida, muestra una interfaz limpia, registra lo realizado, conserva el historial y lo exporta en un formato procesable.

La app no debe convertirse en un segundo entrenador ni duplicar dentro del código las reglas completas del proyecto de entrenamiento.

## 2. Contexto deportivo suficiente

El proyecto del entrenador busca desarrollar un físico masculino estético, musculado y proporcionado, manteniendo el glúteo como principal punto fuerte, junto con hombros, espalda y pectoral. Este dato explica el tipo de ejercicios y registros que pueden aparecer, pero no autoriza a la aplicación a priorizar, añadir o sustituir ejercicios.

Las decisiones del entrenador se apoyan en documentación especializada del proyecto principal. Esa investigación, los programas completos y los datos personales detallados permanecen fuera del repositorio de la app.

## 3. Entrada esperada: nota del entrenador AI

La app recibe una nota ya prescrita. Debe aceptar lenguaje natural estructurado sin exigir JSON.

Formato compacto recomendado:

```text
# Día A · Glúteo y torso
1. Hip thrust en máquina — 3 × 8–10 · RIR 2 · descanso 2–3 min · Pausa breve arriba.
Identidad: máquina Technogym · respaldo 3 · carga total
2. Remo en TRX — 3 × 10–12 · RIR 2 · descanso 90 s
Identidad: TRX · correas altura 5 · pies en marca 3
```

Formato por bloques admitido:

```text
Entrenamiento: Día A
Ejercicio: Hip thrust
Series: 3
Repeticiones: 8–10
RIR: 2
Descanso: 2–3 min
Técnica: Pausa breve arriba.
Identidad: máquina Technogym · respaldo 3 · carga total
```

La etiqueta `Identidad:` es opcional, pero es la vía recomendada cuando el entrenador necesita garantizar una variante o configuración exacta.

## 4. Conceptos que la interfaz debe respetar

- **Series prescritas:** número de intentos de trabajo que la app debe mostrar.
- **Repeticiones prescritas:** objetivo o rango indicado por el entrenador.
- **Repeticiones realizadas:** dato introducido por Daniel; nunca debe inventarse ni copiarse automáticamente.
- **RIR:** repeticiones que Daniel estima que todavía podría haber realizado al terminar la serie. El objetivo puede venir prescrito, pero el RIR realizado lo registra Daniel.
- **Carga:** peso externo utilizado, interpretado según `load_basis`.
- **Descanso:** tiempo recomendado entre series; alimenta el temporizador, pero no modifica por sí solo la prescripción.
- **Anotación de movimiento:** técnica, recorrido, ajuste, estabilidad, molestia u otra observación útil para la revisión posterior.

Congestión, quemazón, agujetas o una sesión aislada no son pruebas de crecimiento ni deben activar cambios automáticos en la app.

## 5. Identidad exacta del ejercicio

Un mismo nombre puede representar estímulos y cargas no comparables. La identidad debe conservar:

- modo de resistencia;
- variante, máquina o implemento;
- ajustes relevantes;
- forma de contabilizar la carga.

Ejemplos que no deben mezclarse automáticamente:

- hip thrust en Smith frente a hip thrust en máquina Technogym;
- remo en máquina con asiento 4 frente a asiento 6;
- peso por lado frente a carga total;
- remo con carga externa frente a remo en TRX.

La última referencia solo ayuda a introducir datos; no constituye por sí misma una recomendación de progresión.

## 6. Modos de resistencia

### Carga externa

Por serie se registra carga, repeticiones y RIR. La identidad aclara si la cifra representa carga total, carga por lado, marcador de máquina o lastre añadido.

### Autocarga

No debe representarse como `0 kg`. Por serie se registra una referencia práctica de dificultad, como variante, banda, asistencia, altura de apoyo o lastre, además de repeticiones y RIR.

### TRX

Por serie se registra una referencia reproducible de dificultad, por ejemplo `pies en marca 3`. La longitud o altura de correas y otros ajustes estables deben conservarse en la identidad del ejercicio.

## 7. Salida esperada: registro para el entrenador AI

La app exporta una sesión `training_log.v1` o el historial completo `training_history.v1`.

El registro debe permitir al entrenador recuperar:

- fecha y sesión;
- ejercicio prescrito;
- identidad exacta;
- carga o dificultad utilizada en cada serie;
- repeticiones y RIR realizados;
- anotaciones de movimiento;
- estado de finalización.

El entrenador AI utiliza estos datos junto con sus reglas de progresión, fatiga y seguridad. La app no debe deducir una subida de carga ni cambiar el programa sin una función futura expresamente diseñada y autorizada.

## 8. Flujo de uso previsto

1. El entrenador AI redacta el entrenamiento del día.
2. Daniel pega la nota en la app.
3. La app interpreta la estructura y muestra una revisión previa con la prescripción, instrucciones y referencias explícitas.
4. Daniel corrige la prescripción o vuelve al texto; al confirmar se crea una sesión activa recuperable que todavía no forma parte del historial.
5. Daniel corrige la identidad si es necesario y durante la sesión introduce carga o dificultad, repeticiones, RIR y notas.
6. La app guarda inmediatamente en el dispositivo y conserva de forma local una copia recuperable de la sesión no finalizada.
7. Solo al finalizar se incorpora la sesión al historial; entonces Daniel puede compartirla o exportar el historial como JSON.
8. El entrenador AI registra la información y la utiliza para futuras decisiones.

## 9. Límites de seguridad y criterio

- No diagnosticar lesiones ni problemas médicos.
- No convertir una anotación de molestia en un diagnóstico.
- No cambiar automáticamente el programa por una sesión mala o una medición aislada.
- No presentar una inferencia local como una decisión del entrenador.
- No ocultar los valores detectados: Daniel debe poder revisarlos y corregirlos.
- No enviar notas, historial ni datos personales a servicios externos sin autorización expresa.

Excepción autorizada el 2026-08-14: `public/app/checkin.html` envía exclusivamente el formulario `checkin.v1` al Web App de Google Apps Script indicado por Daniel cuando él pulsa **Guardar Check-in**. Esta salida no incluye la nota del entrenador, sesiones ni historial y no modifica su persistencia local.

## 10. Información que debe permanecer fuera de la app

- Investigación científica completa del entrenador.
- Programas y módulos M3–M7 íntegros.
- Fotografías, mediciones corporales o información médica.
- Perfil humano completo de Daniel.
- Razonamiento privado y reglas extensas de programación del entrenador.
- Historial maestro consolidado, salvo el archivo que Daniel importe voluntariamente en su dispositivo.

Separar esta información reduce contexto innecesario, evita duplicar fuentes de verdad y mantiene la aplicación sencilla.

## 11. Criterio para futuras funciones

Actualización autorizada el 2026-10-12: las tarjetas de ejercicio muestran una ficha técnica consultable con giro. El contenido procede de `indicaciones_tecnicas.json` del workspace DAME CAÑA, copiado como recurso estático offline de la app. Conserva su estado de borrador, variantes y fuentes sin presentarlo como validación científica nueva ni modificar prescripción o resultados. Se vincula por catálogo y nombres exactos/alias explícitos, sin inferir que una variante genérica es una estación concreta. La copia solo se actualiza mediante una nueva publicación autorizada; no existe sincronización automática con la carpeta local.

Una nueva función pertenece a la app si mejora al menos uno de estos puntos:

- interpretar mejor la nota sin inventar;
- registrar con menos fricción;
- identificar con más precisión;
- conservar o restaurar datos con seguridad;
- exportar información más procesable;
- facilitar la revisión por el entrenador.

Si la función decide qué entrenar, cómo progresar o cómo responder a fatiga o dolor, pertenece primero al proyecto del entrenador y solo debe trasladarse a la app mediante una especificación separada.
