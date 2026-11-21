# Guía operativa de la PWA con el entrenador local (Antigravity / Gemini)

Versión 2.0 · 31/10/2026. El sistema local gobierna la prescripción y la trazabilidad (`README.md`, `AGENTS.md`). La PWA actúa como interfaz de captura en el gimnasio y visor de fichas técnicas compiladas desde `data/`.

## 1. Antes de entrenar

1. Pide al asistente **«prepara mi sesión»** (o ejecuta `python tools/operativo.py sesion`). El asistente verifica que no haya sesiones pendientes en `data/inbox_app/`, confirma tu recuperación y posibles molestias articulares actuales, y genera **dos bloques**:
   - **Bloque 1 (Note v1):** texto listo para pegar en la PWA con cabecera `# Día A/B/C/D/E — ...`, prescripción (`M5-5D-v1.0`), `Último registro:` fechado y directriz `Hoy:` adaptada al marco 40+ de Alto SFR.
   - **Bloque 2 (Calentamiento):** movilidad articular dirigida (3–4 min) y rampas neuromusculares (`RIR > 4`).
2. Pega el **Bloque 1** en el importador de notas de la PWA y revisa la vista previa antes de iniciar: comprueba orden, series, rangos, RIR, descansos y base de carga. Las plantillas estáticas antiguas del navegador pueden diferir de ajustes recientes si no se ha sincronizado; cuando se modifique `data/programa.json` o `data/indicaciones_tecnicas.json`, sincroniza con `python tools/operativo.py sincronizar_app --desplegar`.
3. Las fichas técnicas base ya viajan compiladas en la app; el campo editable **Notas** de cada ejercicio empieza vacío para que registres ajustes reales, sensaciones tendinosas o variantes ejecutadas hoy.

## 2. Después de entrenar

1. Al finalizar la sesión en la PWA, exporta el archivo JSON (`training_log.v1`) y deposítalo en `data/inbox_app/`.
2. Pide **«actualiza el registro»** o ejecuta `python tools/operativo.py actualizar` (también cubierto por la revisión local `tools/revision_diaria.py`).
3. El importador valida el esquema y `session.id`, guarda copia inmutable del JSON original en `data/originales_app/`, crea respaldo previo de `data/registro.json`, incorpora las series evitando duplicados (y bloqueando conflictos reales de contenido) y regenera automáticamente `CONTEXTO_ENTRENADOR.json`, `MI_SISTEMA.html`, los libros Excel y los datos compilados de los clientes PWA.
