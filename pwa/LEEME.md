# PWA Registro de Entrenamiento (M4-3D-v2.0)

PWA local para registro de sesiones de fuerza adaptada a la rutina M4-3D-v2.0 y desacoplada de plataformas de terceros.

## Cómo usar
- **Test:** `npm test` (valida parser, plantillas y contratos, 133/133 tests).
- **Probar local:** `npx vite preview` o `npx serve public` y abrir `http://localhost:5000/app/`.
- **Desplegar en Firebase:** `firebase login` -> `firebase deploy --only hosting`.

## Mapa esencial
- `public/app/`: Frontend PWA (lógica, UI, `day-templates.js`, `parser.js`).
- `google-apps-script/`: `Codigo.gs` para recibir sesiones en Drive/Sheets de la nueva cuenta.
- `firebase.json`: Reglas de enrutamiento y caché de Google Firebase Hosting.
- `tests/`: Batería de pruebas automatizadas (Node / Vitest).

## Qué NO tocar
- No modificar regex de contratos en `tests/` sin actualizar `sync-queue.js`.
- No editar ficheros históricos en `../data/originales_app/` ni `../data/fuentes/`.
