# Conexión de DAME CAÑA PWA con tu nueva cuenta de Google Drive

Esta guía explica cómo activar la recepción automática de entrenamientos desde la PWA hacia tu nueva cuenta de Google sin depender del ChatGPT ni del servicio antiguo.

---

### Paso 1: Crear la carpeta receptora en Google Drive
1. Inicia sesión en [Google Drive](https://drive.google.com/) con tu **nueva cuenta**.
2. Crea una carpeta (por ejemplo: `DAME_CANA_INBOX`).
3. Abre esa carpeta y copia el **ID de la carpeta** desde la barra de direcciones del navegador:
   * URL de ejemplo: `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
   * El ID es: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`.

---

### Paso 2: Crear el proyecto Apps Script
1. Entra en [script.google.com](https://script.google.com/) con tu nueva cuenta de Google.
2. Pulsa en **Nuevo proyecto** (arriba a la izquierda).
3. Renombra el proyecto a `DAME_CANA_RECEPTOR`.
4. Borra el código por defecto (`function myFunction() {}`).
5. Copia y pega el contenido completo de [Codigo.gs](file:///c:/Users/Daniel/Workspace/_Experiments/DAME_CANA-gemini/pwa/google-apps-script/Codigo.gs).
6. En la línea 19, pega el ID de tu carpeta:
   ```javascript
   DRIVE_FOLDER_ID: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
   ```
7. Guarda los cambios (Ctrl + S o icono de disquete).

---

### Paso 3: Publicar la aplicación web
1. Pulsa el botón azul **Implementar** (arriba a la derecha) y selecciona **Nueva implementación**.
2. En el engranaje de tipo, elige **Aplicación web**.
3. Rellena los campos:
   * **Descripción:** `v1.0 receptor PWA`
   * **Ejecutar como:** `Yo (<tu-correo>@gmail.com)`
   * **Quién tiene acceso:** `Cualquiera` *(imprescindible para que el móvil sincronice sin ventana de login)*.
4. Pulsa **Implementar**.
5. Google te pedirá autorizar permisos de acceso a Drive. Acepta los permisos de tu propia cuenta.
6. Copia la **URL de la aplicación web** generada (termina en `/exec`).

---

### Paso 4: Conectar la PWA a tu nueva Web App
Para que tu PWA móvil envíe las sesiones a esa URL, puedes:
* **Opción A (Recomendada):** En la consola del navegador de la PWA (o ejecutando un comando rápido), establece:
  ```javascript
  localStorage.setItem("training_sync_endpoint", "TU_NUEVA_URL_APPS_SCRIPT");
  ```
* **Opción B (Fija en código):** Reemplazar `DEFAULT_ENDPOINT` en `pwa/public/app/sync-queue.js` y `pwa/public/app/gem-command-tools.js` antes de desplegar en Firebase.
