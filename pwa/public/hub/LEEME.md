# DC Studio — Panel de consulta y análisis

Webapp local que complementa a DCLog (móvil): ver cómo vas, gestionar máquinas y añadir sesiones.

## Cómo abrir
Doble clic en `index.html` (offline, sin servidor).

## Qué hay
1. **Inicio**: qué día te toca, días desde el último entreno, separación entre sesiones (verde ≤2 d, ámbar 3–4, rojo 5+), constancia semanal, esfuerzo (RIR) y series por músculo.
2. **Progreso**: por ejercicio, mejor serie primera vez → última, con línea de evolución.
3. **Historial**: sesiones con cada serie y días de hueco respecto a la anterior.
4. **Máquinas**: fotos y ajustes propios (se guardan en este navegador).
5. **Programa** y **Revisión semanal**: consulta.
6. **Añadir sesión**: arrastra o pega el JSON de DCLog; vista previa antes de incorporar.

## Archivos
`index.html`, `styles.css`, `hub.js`, `modules/` (métricas, máquinas, importador), `data-seed.js` (datos).

## No tocar
- `data-seed.js` se regenera con `python tools/generar_hub_data.py`; no editar a mano.
- Lo importado aquí vive solo en el navegador: para que cuente en el sistema, el JSON debe ir a `data/inbox_app/`.
