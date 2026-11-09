# Respaldo operativo de DAME CAÑA · versión 2.1 (Local / Antigravity)

La fuente canónica del sistema reside en local (`DAME_CANA-gemini`), operada con **Antigravity / Gemini** y herramientas deterministas en Python (`tools/operativo.py`, `tools/nutricion.py`, `tools/conocimiento.py`). Google Drive actúa únicamente como respaldo pasivo y recepción separada de exportaciones de la PWA.

- **Vistas incluidas:** `MI_SISTEMA.html` y `DAME_CANA_OPERATIVO_LOCAL.xlsx` contienen las seis vistas humanas habituales (`Inicio`, `Mi programa`, `Ejercicios y máquinas`, `Mi historial`, `Seguimiento`, `Cambios y decisiones`), regeneradas desde `data/`. `CONTEXTO_ENTRENADOR.json`, `MODELO_OPERATIVO.json` y `TABLAS_OPERATIVAS.json` proveen las proyecciones estructuradas con el estado actualizado al instante de generación del paquete.
- **Integridad:** `MANIFIESTO.json` y `MANIFIESTO_RESPALDO.json` permiten auditar por SHA-256 todos los datos canónicos, originales de la app, biblioteca científica, documentación y scripts incluidos en el ZIP. Excluye respaldos previos, cachés, credenciales y entornos externos.
- **Restauración y uso:** Extraer el paquete, verificar hashes del manifiesto y abrir `README.md` y `AGENTS.md`. Para comprobar el corte exacto de sesiones y programa activo (`M5-5D-v1.0`), ejecutar `python tools/operativo.py resumen`.
