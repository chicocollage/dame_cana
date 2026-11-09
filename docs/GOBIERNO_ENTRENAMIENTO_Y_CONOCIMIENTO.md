# Gobierno del entrenamiento, periodización y conocimiento

Versión 2.1 · 31/10/2026 (Operación local Antigravity / Gemini).

La rutina vigente es el resultado de aplicar evidencia pertinente y primeros principios biomecánicos al perfil, edad fisiológica (40+ con base), objetivos de proporción estética, restricciones articulares y respuesta registrada de Daniel. Se mantiene estable durante su mesociclo mientras las condiciones la justifiquen; no limita la incorporación crítica de nueva evidencia.

## 1. Fuentes de autoridad

- **Perfil, biometría y preferencias:** `docs/PERFIL_PERSONAL_UNIFICADO.md` (datos fechados; blancos = pendiente, nunca cero) y `data/confirmaciones_usuario.json` (confirmaciones expresas recientes prevalecen en su alcance).
- **Conocimiento científico:** `biblioteca/EMPEZAR_AQUI.md` y `data/actualizaciones_conocimiento.json`. Un estudio nunca modifica el programa automáticamente.
- **Respuesta empírica:** `data/registro.json` (series ejecutadas), `data/seguimiento.json` (pesajes/perímetros reales, excluyendo pruebas) y `data/nutricion.json` (adherencia energética y bolos proteicos).
- **Prescripción y técnica activa:** `data/programa.json` (`M5-5D-v1.0`), `data/indicaciones_tecnicas.json` (setup y variantes biomecánicas) y `data/estado_y_decisiones.json`.

## 2. Gobierno de cambios y rotación de mesociclos (Escultura 70/30)

El sistema distingue **ajustes tácticos intra-sesión** (gobernados por el principio de Sistema Vivo y orden inverso defensivo sin cambiar la plantilla) de **cambios estructurales de programa / transición de mesociclo**:

1. **Estabilidad del bloque activo:** Un mesociclo (típicamente 6–8 semanas, como `M5-5D-v1.0`) se mantiene sin mutar ejercicios cada semana para permitir aprendizaje motor y comparabilidad real de cargas.
2. **Evaluación de transición estética (Regla 70/30):** Al concluir un bloque o detectar estancamiento/asimetría visual, el entrenador audita proporciones, progresión comparable y fatiga tendinosa acumulada, proponiendo el siguiente bloque bajo presupuesto sistémico cerrado:
   - **Consolidación / Retención Activa (~70% de grupos):** 4–6 series semanales intensas (`RIR 1–2`) en máquinas estables para retener el 100% de las ganancias logradas (ej. mantener glúteo o pecho mientras otro foco acelera).
   - **Aceleración / Escultura (~30%, 1–2 regiones foco):** 12–16 series semanales en Frecuencia 2–3 (máx. 3–6 series/sesión), ubicadas en los primeros puestos de la sesión con frescura neural completa.
3. **Secuencia formal de decisión:**
   - Revisar objetivos vigentes, perfil 40+, salud tendinosa y actualidad del registro.
   - Seleccionar evidencia pertinente indicando población, diseño, resultados y límites de transferencia al caso de Daniel.
   - Proponer el cambio concreto o justificar mantener el bloque actual, documentando motivo, fuentes, datos personales y criterio de revisión.
   - Tras aceptación expresa de Daniel, registrar en `data/estado_y_decisiones.json`, versionar `data/programa.json` (conservando trazabilidad histórica) y ejecutar `python tools/operativo.py regenerar`.

Para decisiones nuevas en el modelo formal se validan `id`, `fecha`, `dominio`, `cambio`, `estado`, `motivo`, `objetivos`, `datos_personales`, `fuentes`, `revision` y `aceptacion` antes de declararlas aplicadas. Las decisiones históricas conservan su formato original de procedencia.

## 3. Biblioteca ampliable (`tools/conocimiento.py`)

Todo estudio nuevo entra como **pendiente de contraste** conservando archivo/fuente, título, ID, fecha y huella SHA-256:

```powershell
python tools/conocimiento.py incorporar --id EST-2026-001 --archivo "C:\ruta\estudio.pdf" --titulo "Título real" --fuente "DOI o URL" --tipo "Diseño" --poblacion "Población"
```

Tras verificar la simulación en seco, repetir con `--aplicar`. Para registrar evaluación crítica: `python tools/conocimiento.py revisar --id ... --resultado ... --limitaciones ... --aplicabilidad ... --contraste ... --revisado-por ... [--decision ID] --aplicar`. Después, ejecutar `python tools/operativo.py regenerar`.

## 4. Modelo de datos y vistas compatibles

Se preservan íntegros los esquemas de `registro.json`, `programa.json`, `maquinas.json` y `catalogos.json`.
- Movimiento, ejercicio/variante, estación física/ajustes, puesto del programa (`slot_id`) y exposición en sesión son niveles independientes. La comparabilidad de carga exige coincidencia de configuración física y base de carga (`load_basis`), nunca similitud nominal.
- `data/modelo_operativo.json` almacena vocabularios y `enlaces_confirmados` / `aliases_confirmados` con evidencia fechada; `outputs/operativo/MODELO_OPERATIVO.json` es proyección derivada.
- Seis vistas humanas habituales (`Inicio`, `Mi programa`, `Ejercicios y máquinas`, `Mi historial`, `Seguimiento`, `Cambios y decisiones`) conviven con las nueve tablas avanzadas en `TABLAS_OPERATIVAS.json`. Ninguna vista HTML o Excel es formulario maestro editable.
- `python tools/operativo.py respaldo` empaqueta datos, originales, biblioteca, documentación, scripts y vistas regeneradas en `outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip` verificando integridad SHA-256.
