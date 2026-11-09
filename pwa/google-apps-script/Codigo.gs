/**
 * DAME CAÑA — Backend Google Apps Script para Google Drive y Google Sheets
 * 
 * Instrucciones de despliegue en tu nueva cuenta de Google:
 * 1. Accede a https://script.google.com/ con tu nueva cuenta de Google.
 * 2. Crea un "Nuevo proyecto" y titúlalo "DAME_CANA_RECEPTOR".
 * 3. Borra el código existente y pega este archivo completo.
 * 4. Crea una carpeta en Google Drive (ej. "DAME_CANA_INBOX") y copia su ID en CONFIG.DRIVE_FOLDER_ID.
 * 5. (Opcional) Crea una hoja de cálculo Google Sheets y copia su ID en CONFIG.SPREADSHEET_ID.
 * 6. Haz clic en "Implementar" (arriba a la derecha) > "Nueva implementación".
 *    - Tipo de implementación: "Aplicación web".
 *    - Descripción: "v1.0 receptor PWA".
 *    - Ejecutar como: "Yo (tu cuenta de correo)".
 *    - Quién tiene acceso: "Cualquiera" (necesario para que la PWA móvil sincronice sin login OAuth de Google).
 * 7. Pulsa "Implementar", autoriza los permisos de Drive/Sheets y copia la URL terminada en "/exec".
 * 8. Configura esa URL en tu PWA (mediante localStorage.setItem("training_sync_endpoint", URL) o en la app).
 */

var CONFIG = {
  // Pega aquí el ID de la carpeta de Drive (aparece en la URL de Drive después de /folders/...)
  DRIVE_FOLDER_ID: "",

  // (Opcional) Pega aquí el ID de tu Google Sheet si deseas un resumen tabular automático
  SPREADSHEET_ID: ""
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return respond({ status: "ERROR", message: "Servidor ocupado. Reintentando..." }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ status: "ERROR", message: "Payload vacío." }, 400);
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return respond({ status: "ERROR", message: "JSON inválido." }, 400);
    }

    var schema = payload.schema;
    var eventId = payload.event_id || ("EVT-" + new Date().getTime());

    // 1. Sesión de entrenamiento finalizada
    if (schema === "training_log.v1") {
      var session = payload.session || {};
      var dateStr = session.date || Utilities.formatDate(new Date(), "GMT+1", "yyyy-MM-dd");
      var titleStr = session.title || "Entrenamiento";
      var sessionId = session.id || eventId;
      var fileName = dateStr + "_" + sanitizeFileName(titleStr) + "_" + sessionId + ".json";

      var driveFile = saveJsonToDrive(fileName, JSON.stringify(payload, null, 2));

      if (CONFIG.SPREADSHEET_ID) {
        appendSessionToSheet(payload);
      }

      return respond({
        status: "IMPORTED",
        code: 200,
        event_id: eventId,
        file_id: driveFile ? driveFile.getId() : null,
        message: "Entrenamiento sincronizado en Drive con éxito."
      });
    }

    // 2. Registro de Check-in
    if (schema === "checkin.v1") {
      var checkinDate = payload.date || Utilities.formatDate(new Date(), "GMT+1", "yyyy-MM-dd");
      var checkinFileName = "checkin_" + checkinDate + "_" + eventId + ".json";
      var checkinFile = saveJsonToDrive(checkinFileName, JSON.stringify(payload, null, 2));

      return respond({
        status: "IMPORTED",
        code: 200,
        event_id: eventId,
        file_id: checkinFile ? checkinFile.getId() : null,
        message: "Check-in registrado en Drive."
      });
    }

    // 3. Comandos de la IA
    if (schema === "gem_command.v1") {
      return respond({
        status: "IMPORTED",
        code: 200,
        event_id: eventId,
        message: "Comando recibido."
      });
    }

    return respond({ status: "ERROR", message: "Esquema no soportado: " + schema }, 400);

  } catch (err) {
    return respond({ status: "ERROR", message: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return respond({
    status: "OK",
    service: "DAME CAÑA Apps Script Receptor",
    timestamp: new Date().toISOString()
  });
}

function respond(data, httpCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function saveJsonToDrive(fileName, content) {
  var folder;
  if (CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID.trim() !== "") {
    try {
      folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID.trim());
    } catch (e) {
      folder = DriveApp.getRootFolder();
    }
  } else {
    folder = DriveApp.getRootFolder();
  }

  var existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    // Si ya existe el archivo exacto, actualizamos contenido sin duplicar
    var file = existing.next();
    file.setContent(content);
    return file;
  }
  return folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
}

function appendSessionToSheet(payload) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    var sheet = ss.getSheetByName("Sesiones") || ss.getSheets()[0];
    var s = payload.session || {};
    sheet.appendRow([
      s.date || "",
      s.title || "",
      s.id || "",
      s.exercise_count || 0,
      s.recorded_set_count || 0,
      payload.event_id || "",
      new Date()
    ]);
  } catch (err) {
    Logger.log("Error al escribir en Sheet: " + err.toString());
  }
}

function sanitizeFileName(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "_");
}
