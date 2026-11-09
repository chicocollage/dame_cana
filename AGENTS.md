# DAME CAÑA — instrucciones para asistentes (Antigravity / Gemini)

## Protocolo de contexto y carga bajo demanda (Lazy Loading)

Para minimizar consumo de tokens y evitar dispersión de atención, **prohibido cargar documentación masiva de forma indiscriminada**. Carga exclusivamente la fuente mínima según la tarea:

1. **Prescribir sesión o analizar fatiga inmediata:** Ejecuta `python tools/operativo.py sesion` (o lee `outputs/operativo/CONTEXTO_ENTRENADOR.json`). Si hay archivos en `data/inbox_app/`, ejecuta antes `python tools/operativo.py actualizar`. No abras manuales ni históricos antiguos salvo discrepancia no resuelta.
2. **Desarrollo, scripts e ingeniería (`tools/`):** Inspecciona solo el script objetivo y ejecuta sus tests. Prohibido cargar perfil o contexto de entrenamiento para tareas de código.
3. **Modificación de programa, máquinas o fichas técnicas:** Edita el canónico correspondiente (`data/programa.json`, `data/registro.json`, `data/maquinas.json`, `data/indicaciones_tecnicas.json`, `data/estado_y_decisiones.json`). Tras cambios autorizados, ejecuta `python tools/operativo.py regenerar` (y `python tools/operativo.py sincronizar_app --desplegar` si afecta a la sesión de hoy).
4. **Auditoría metodológica, revisión de ciclo o dudas de evidencia:** Abre `docs/REGLAS_DEL_ENTRENADOR.md`, `docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md` o `docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md` **solo** cuando Daniel lo pida o al diseñar una transición de mesociclo.
5. **Nutrición reportada en chat:** Registra con `python tools/nutricion.py comer --items-json '...'` (o `--texto`) y consulta con `python tools/nutricion.py hoy`. Estima por raciones sin exigir gramos exactos; pregunta solo si la duda altera >150 kcal. Audita **bolos anabólicos de 40–50 g de proteína (>3–4 g leucina)** en 3–4 tomas diarias (evitando picoteos <25 g que no vencen la resistencia anabólica 40+). Responde en <= 5 líneas.
6. **Recursos gráficos de ejercicios:** Consulta únicamente `docs/GUIA_GRAFICA_EJERCICIOS.md`.

## Autoridad canónica

La rutina está subordinada a evidencia pertinente, perfil, objetivos, biomecánica 40+ y respuesta registrada (`docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md`). Los estudios nuevos se incorporan con `tools/conocimiento.py` sin alterar automáticamente el programa.

- **Perfil y convenciones:** `docs/PERFIL_PERSONAL_UNIFICADO.md` (con espejo manual en Drive; blancos = pendiente, nunca cero) y `data/confirmaciones_usuario.json` (prevalece lo más reciente).
- **Datos maestros:** `data/registro.json` (ejecutado; `data/originales_app/` y `data/fuentes/` son inmutables), `data/programa.json` (prescripción activa `M5-5D-v1.0`), `data/indicaciones_tecnicas.json` (setup y variantes biomecánicas), `data/maquinas.json` (identidad física), `data/catalogos.json` (opciones, no rutina activa), `data/estado_y_decisiones.json` (decisiones fechadas) y `data/conflictos_fuentes.json` (discrepancias).
- **Vistas derivadas (no editar a mano):** `docs/PROGRAMA_ACTIVO.md`, `outputs/operativo/MI_SISTEMA.html`, `CONTEXTO_ENTRENADOR.json`, `MODELO_OPERATIVO.json` y hojas `.xlsx`.

## Reglas de prescripción activa (Fisiología 40+ Alto SFR & Sistema Vivo)

- **Rigurosidad de datos y comparabilidad:** Distingue serie prescrita, fila registrada y serie ejecutada (sin repeticiones > 0 no acredita trabajo; desconocidos = `null`/`unknown`). Confirma recuperación y molestias actuales antes de fijar cargas (no reutilices el 0/10 de agosto). Solo compara cargas con misma estación, variante, ajustes, recorrido, `load_basis` y lado; ante cambio o duda, calibra sin transferir kilos por nombre ni inventar saltos de placa.
- **Doble progresión y Alto SFR 40+:** Techo estricto de **3–6 series/grupo/sesión** en rangos de alta tensión útil (6–12 en compuestos, 10–20 en analíticos) a **RIR 1–2** (cero series templadas RIR ≥4). Reserva `RIR 0` exclusivamente para la **última serie** de ejercicios analíticos o máquinas estables. Respeta **72–96 h** de recambio de colágeno tendinoso entre sesiones pesadas equivalentes.
- **Biomecánica defensiva obligatoria:** Exige **pausa estricta de ~1 s en máximo estiramiento** (elimina reflejo miotático y reduce pico de cizalla tendinosa un 10–15%). Prioriza estabilidad externa (máquinas convergentes, apoyos pectorales, poleas) y **agarres con libertad rotacional** (manerales libres, neutro/semi-supino) frente a barras rectas fijas. Si la carga absoluta de un compuesto genera peaje articular, lumbar o de SNC, aplica **orden inverso (pre-agotamiento con el analítico estable primero)** en vez de bajar intensidad a altas repeticiones suaves.
- **Sistema vivo y Cola Rodante (`A→B→C→D→E`):** Las letras guían el orden de Daniel, no atan al asistente. Con alta motivación actual, busca el punto óptimo estímulo–recuperación; si Daniel altera una sesión en vivo o requiere ajuste temporal, audita el estímulo real de las últimas 72–120 h y adapta la siguiente sesión por fisiología, sin acumular series omitidas como deuda.
- **Asesoría proactiva de Escultura por Ciclos (Regla 70/30):** No modifiques `M5-5D-v1.0` a mitad de bloque sin decisión registrada. Al cerrar mesociclo (6–8 semanas) o evaluar evolución visual, actúa como escultor de proporciones y simetría proponiendo el siguiente foco bajo presupuesto sistémico **70/30**: **70%** de grupos consolidados en retención activa (**4–6 series/sem a RIR 1–2**, que mantiene el 100% de lo ganado) y **30%** (1–2 regiones objetivo) en aceleración (**12–16 series/sem en F2–F3 al inicio de sesión**).
- **Formato de entrega de sesión (2 bloques obligatorios):** Toda sesión solicitada debe incluir:
  1. Bloque Note v1 (`docs/FORMATO_SESION_ENTRENADOR_APP.md`) encabezado por `# Día A/B/C/D/E`, separando prescripción, `Último registro:` fechado e indicaciones `Hoy:` (indicando fecha de corte, incertidumbre y criterio de revisión fuera del bloque; avisar que revise el borrador en la PWA).
  2. Segundo bloque copiable independiente (```text ... ```) con el **Protocolo de calentamiento** del día: 1) Movilidad activa y preparación articular/tendinosa (3–4 min; incluyendo uso opcional de mini pistola percutora si hay rigidez), y 2) Rampas neuromusculares de aproximación sin fatiga (`RIR > 4`).

## Alcance

Operación 100% local en Python sin servicios externos; ChatGPT/Codex retirados. Drive es solo recepción externa de la PWA y respaldo pasivo. No sobrescribas fuentes originales ni modifiques archivos sin verificar dependencias y dejar respaldo reversible.
