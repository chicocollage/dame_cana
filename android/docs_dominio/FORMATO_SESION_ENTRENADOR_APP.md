# Formato de sesión del entrenador para la app (Note v1 + Calentamiento)

Versión 1.2 · 31/10/2026. Convención operativa para Antigravity / Gemini adaptada a la arquitectura de 5 días (`M5-5D-v1.0` — Cola Rodante Asíncrona: Días A, B, C, D y E) y al Marco Fisiológico 40+ de Alto SFR. Compatible con el parser Note v1 de la PWA.

## Estructura obligatoria de respuesta (2 bloques independientes)

Al pedir «prepara mi sesión» (o ejecutar `python tools/operativo.py sesion`), el entrenador verifica que no falten JSON en `data/inbox_app/`, confirma recuperación/molestias actuales y entrega **dos bloques copiables separados** (además de indicar fuera de ellos la fecha de corte, incertidumbre y criterio de revisión):

1. **Bloque 1 — Sesión Note v1 para pegar en la PWA:**
   - **Prescripción:** series (techo 3–6 por grupo/sesión), repeticiones, RIR objetivo (`1–2`; `RIR 0` solo indicado en última serie analítica/estable) y descanso.
   - **Último registro:** fecha `AAAA-MM-DD`, carga, repeticiones y `@RIR` por serie; solo presentado como comparable si la estación/configuración está confirmada.
   - **Hoy:** directriz concreta de doble progresión o calibración bajo biomecánica defensiva 40+ (pausa ~1 s en máximo estiramiento; opción de orden inverso si hubiera fatiga axial/articular).
   - **Indicaciones selectivas:** `Configuración:`, `Objetivo:` (solo si aplica variante activa distinta de la ficha base) y `Registra:`.
2. **Bloque 2 — Protocolo de Calentamiento y Aproximación Neuromuscular (` ```text ... ``` `):**
   - **1) Movilidad activa y preparación articular/tendinosa (3–4 min):** lubricación específica de las articulaciones implicadas (y uso opcional de mini pistola de masaje percutor 30–45 s si hay rigidez localizada).
   - **2) Series de aproximación / rampa neuromuscular:** escalones al ~50% y ~75% con pocas repeticiones y `RIR > 4` (cero fatiga metabólica previa) para el primer patrón y transiciones clave.

## Plantilla del Bloque 1 (Note v1)

Primera línea obligatoria: `# Día A/B/C/D/E — descripción breve`. Después, un bloque por ejercicio sin tablas ni comentarios administrativos intercalados:

```text
# Día D — Nuclear 3 · Glúteo y Cadena Posterior

Nombre exacto del ejercicio — 3 × 8–12
RIR 1–2 · Descanso 2–3 min
Último registro: 2026-10-18; 60 kg × 11 @1; 60 kg × 10 @1; 60 kg × 10 @1.
Hoy: [carga inicial, objetivo de reps/RIR con pausa 1 s en estiramiento, o dato mínimo a calibrar].
Configuración: [estación, variante activa, ajustes y base de carga].
Registra: [solo la observación clave para esta exposición].
```

*(La plantilla es ilustrativa; tomar siempre los puestos, rangos y variantes activas de `data/programa.json`).*

## Reglas estrictas del parser Note v1

- La cabecera del ejercicio lleva `series × repeticiones` (ej. `3 × 8–12`). Nunca usar el patrón `N × M` dentro de las líneas de historial o notas para no crear un ejercicio fantasma.
- `RIR … · Descanso …` va inmediatamente debajo de la cabecera.
- Usar literalmente `Último registro:` con fecha `AAAA-MM-DD` y series separadas por `;` (`60 kg × 11 @1`, donde `@1` es RIR 1). No inventar RIR ni cargas ausentes.
- Si la estación/ajustes no están confirmados como equivalentes, escribir `Último registro: ninguno comparable.` y añadir `Antecedente no comparable: …` como indicación informativa.
- **No duplicar fichas técnicas base:** La PWA ya integra las fichas base compiladas desde `data/indicaciones_tecnicas.json`. Omitir párrafos largos de setup estándar; incluir línea `Objetivo variante:` únicamente cuando el puesto tenga una variante biomecánica activa en `data/programa.json` (ej. `G04-V1`, `G08-V1`, `L02-V1`) o se prescriba un ajuste específico para hoy (`--variante`).
- Especificar siempre la base de carga real confirmada (suma de discos añadidos ambos lados excluyendo barra en Smith/Hack/Remo discos, número del selector en placas, peso por mancuerna, etc.). Para autocarga o TRX, describir configuración sin inventar kg equivalentes.
- Recordar a Daniel revisar el borrador en la pantalla previa de la PWA antes de iniciar el registro.
