// Ejecutar manualmente en la consola de la app de origen. No enviar ni borrar datos.
(() => {
  const keys = ["registro-entrenamiento-v1", "training_active_draft.v1", "registro-entrenamiento-nota-v1", "registro-entrenamiento-historico-borrador-v1", "exercise_catalog_custom.v1", "registro-entrenamiento-feedback-v1", "training_sync_queue.v1", "checkin_log.v1", "registro-entrenamiento-pantalla-activa-v1", "registro-entrenamiento-sonido-v1", "registro-entrenamiento-sonido-perfil-v1"];
  const values = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  const payload = { schema: "registro_entrenamiento_browser_backup.v1", exported_at: new Date().toISOString(), origin: location.origin, values };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "registro-entrenamiento-browser-backup.json";
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
})();
