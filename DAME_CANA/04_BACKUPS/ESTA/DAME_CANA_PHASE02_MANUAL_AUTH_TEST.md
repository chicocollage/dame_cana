# DAME CAÑA — Prueba manual de acceso Google (Fase 2, solo copia)

Estado: **PENDIENTE de ejecución humana**. Esta prueba no hace ningún POST ni autoriza producción.

## Recursos aislados

- Operativo: `DAME_CANA_OPERATIVO_v3_PHASE02_COPY_20260823`
  - ID: `1XIRU5Ffr41q76GmiuviO36HLeBuIYHV_Qf_I4rXfDlQ`
- Catálogos: `DAME_CANA_CATALOGOS_v3_PHASE02_COPY_20260823`
  - ID: `1PiQjrS4YbedIcb5u2ZlCH8SnkEkuXbI4Lqo4JeKSsUY`
- Carpeta de ejecución: `DAME_CANA_PHASE02_RUNTIME_TEST_20260823`
  - ID: `1x-zqi-fJoMtkVQytkuAtFde3mD60wNYe`
- Receptor candidato local: `integration/apps-script/Code.gs`
- PWA candidata local: rama `codex/dame-cana-phase02-20260823`, versión `v41`.

## 1. Preparar el Apps Script de la copia

1. Abre únicamente el libro Operativo de copia indicado arriba.
2. Entra en **Extensiones > Apps Script**.
3. Sustituye el contenido de `Código.gs` por el candidato local `integration/apps-script/Code.gs` y guarda.
4. No ejecutes `setupDameCana`, `installTriggers`, `scanTrainingInbox` ni ninguna función de escritura.
5. No retires todavía la validación `GOOGLE_SYNC_SECRET` de `doPost`.

## 2. Crear un despliegue Web App de prueba restringido

1. En Apps Script, selecciona **Implementar > Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Descripción: `DAME CANA FASE2 AUTH COPY 20260823`.
4. Ejecutar como: **Yo** (la cuenta propietaria de la copia).
5. Quién tiene acceso: **Solo yo**.
6. Autoriza los permisos solicitados y copia la URL terminada en `/exec`.
7. No reutilices la URL de producción.

## 3. Demostrar que Google protege el endpoint

### Cuenta propietaria

Abre la URL `/exec` en una ventana normal con la cuenta propietaria iniciada. Debe aparecer JSON con:

```json
{"ok":true,"status":"PHASE02_AUTH_PROBE","code":200}
```

### Sin sesión u otra cuenta

Abre la misma URL en una ventana privada sin iniciar sesión, y después —si está disponible— con otra cuenta Google. Ninguna debe mostrar el JSON `PHASE02_AUTH_PROBE`; deben pedir acceso o denegarlo.

Si una cuenta distinta obtiene el JSON, **detente**: el despliegue no está restringido correctamente.

## 4. Demostrar que la PWA puede leer el endpoint autenticado

Con la PWA de copia abierta en el navegador y la cuenta propietaria iniciada, abre las herramientas de desarrollo y ejecuta, sustituyendo la URL:

```js
fetch("PEGA_AQUI_LA_URL_EXEC_DE_PRUEBA", {
  method: "GET",
  credentials: "include",
  redirect: "follow"
}).then(async (response) => ({
  http_status: response.status,
  final_url: response.url,
  response_type: response.type,
  body: await response.text()
})).then(console.log).catch(console.error);
```

Resultado necesario: la promesa termina correctamente y `body` contiene `PHASE02_AUTH_PROBE`.

Si aparece un error CORS, una página HTML de inicio de sesión, un `opaque response` o cualquier resultado que no permita leer ese JSON, **detente**. En ese caso una PWA estática no puede usar con seguridad este Web App restringido de forma directa; no se elimina el token y habrá que diseñar un relé privado.

## 5. Evidencia que debes devolver

Sin incluir cookies, tokens ni datos personales, copia al chat:

- `propietaria directa: OK/NO`
- `privada u otra cuenta: BLOQUEADA/NO`
- `fetch desde PWA: OK/ERROR`
- el objeto de resultado del `fetch` o el texto exacto del error CORS.

Hasta recibir esos tres resultados, el receptor conserva su validación por token y la PWA mantiene vacío `DAME_CANA_SYNC_ENDPOINT`; por tanto no puede escribir en ningún libro.

## Rollback de esta prueba

1. En Apps Script, abre **Implementar > Gestionar implementaciones**.
2. Archiva únicamente la implementación `DAME CANA FASE2 AUTH COPY 20260823`.
3. Deja `public/app/sync-config.js` con `self.DAME_CANA_SYNC_ENDPOINT = "";`.
4. No borres libros, filas, logs ni evidencias de Fase 1 o Fase 2.


