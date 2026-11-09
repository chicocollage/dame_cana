/**
 * DC Studio - Módulo de Importación de Sesiones JSON
 * Arrastrar, soltar, previsualizar y validar registros de entrenamiento
 * sin hashes crudos ni códigos de depuración.
 */

window.DCStudioImporter = (function () {
  let pendingImport = null;

  function renderDropzone() {
    return `
      <div class="importer-bento-container">
        <div class="dropzone-box" id="hubDropzone" tabindex="0">
          <input type="file" id="hubFileInput" accept=".json,application/json" hidden />
          <div class="dropzone-inner">
            <span class="dropzone-icon" aria-hidden="true">📥</span>
            <h3 class="dropzone-title">Arrastra aquí tu registro de entrenamiento (.json)</h3>
            <p class="dropzone-hint">O pulsa para seleccionar el archivo exportado desde tu móvil (DCLog)</p>
            <button type="button" class="btn-select-file" id="hubBrowseBtn">Seleccionar archivo JSON</button>
          </div>
        </div>

        <div class="paste-zone">
          <details class="paste-details">
            <summary>¿Prefieres pegar el código JSON directamente?</summary>
            <div class="paste-body">
              <textarea id="hubJsonPaste" rows="5" placeholder='Pega aquí el contenido JSON {"schema": "training_log.v1", ...}'></textarea>
              <button type="button" class="btn-action-sm" id="hubProcessPasteBtn">Procesar JSON pegado</button>
            </div>
          </details>
        </div>

        <div id="importPreviewArea" class="import-preview-area" hidden></div>
      </div>
    `;
  }

  function parsePayload(rawString) {
    try {
      const data = typeof rawString === "string" ? JSON.parse(rawString) : rawString;
      if (!data) throw new Error("JSON vacío o no legible.");

      // Soporte para training_log.v1
      if (data.schema === "training_log.v1" || data.session) {
        const s = data.session || data;
        const exercises = Array.isArray(s.exercises) ? s.exercises : [];
        let totalSets = 0;
        exercises.forEach((ex) => {
          totalSets += Array.isArray(ex.entries) ? ex.entries.length : 0;
        });

        return {
          type: "training_log.v1",
          date: s.date || "Fecha sin registrar",
          day: s.day || s.title || "Sesión",
          exerciseCount: exercises.length,
          setCount: totalSets,
          exercises: exercises,
          notes: s.notes || "",
          raw: data
        };
      }

      // Soporte para checkin.v1
      if (data.schema === "checkin.v1") {
        return {
          type: "checkin.v1",
          date: data.date || "Semana actual",
          day: "Check-in semanal",
          sleepHours: data.sleep_hours,
          sleepQuality: data.sleep_quality,
          fatigue: data.fatigue,
          weight: data.weight_avg,
          raw: data
        };
      }

      // Si es un array de sesiones
      if (Array.isArray(data)) {
        return {
          type: "session_array",
          count: data.length,
          raw: data
        };
      }

      throw new Error("Formato no reconocido. Asegúrate de que es un archivo exportado de DCLog.");
    } catch (err) {
      return { error: err.message };
    }
  }

  function renderPreview(parsed) {
    if (parsed.error) {
      return `
        <div class="preview-card alert-error">
          <span class="preview-badge error">Error de lectura</span>
          <h4>No se pudo procesar el archivo</h4>
          <p>${parsed.error}</p>
        </div>
      `;
    }

    if (parsed.type === "training_log.v1") {
      let exRows = "";
      parsed.exercises.forEach((ex, idx) => {
        const entries = (ex.entries || []).map((e) => `${e.load || '—'}kg × ${e.reps || '—'} (RIR ${e.rir ?? '—'})`).join(" · ");
        exRows += `
          <div class="preview-exercise-row">
            <strong>${idx + 1}. ${ex.name}</strong>
            <span class="preview-series tabular">${entries || "Sin series"}</span>
          </div>
        `;
      });

      return `
        <div class="preview-card success">
          <div class="preview-header">
            <div>
              <span class="preview-badge success">Registro Válido detectado</span>
              <h3 class="preview-title">${parsed.day} · ${parsed.date}</h3>
            </div>
            <div class="preview-stats tabular">
              <span><strong>${parsed.exerciseCount}</strong> ejercicios</span>
              <span><strong>${parsed.setCount}</strong> series totales</span>
            </div>
          </div>
          <div class="preview-exercises-list">
            ${exRows}
          </div>
          <div class="preview-actions">
            <button type="button" class="btn-primary" id="btnConfirmImport">✓ Incorporar al Historial y Métricas del Hub</button>
            <button type="button" class="btn-secondary" id="btnDownloadValidated">💾 Guardar archivo para el entrenador</button>
          </div>
        </div>
      `;
    }

    return `<div class="preview-card info"><p>Archivo procesado correctamente.</p></div>`;
  }

  function bindEvents(container, onSessionImported) {
    const dropzone = container.querySelector("#hubDropzone");
    const fileInput = container.querySelector("#hubFileInput");
    const browseBtn = container.querySelector("#hubBrowseBtn");
    const previewArea = container.querySelector("#importPreviewArea");
    const pasteBtn = container.querySelector("#hubProcessPasteBtn");
    const pasteInput = container.querySelector("#hubJsonPaste");

    if (browseBtn && fileInput) {
      browseBtn.addEventListener("click", () => fileInput.click());
    }

    function handleFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parsePayload(e.target.result);
        pendingImport = parsed;
        previewArea.hidden = false;
        previewArea.innerHTML = renderPreview(parsed);
        bindPreviewActions();
      };
      reader.readAsText(file);
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
    }

    if (dropzone) {
      dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
      dropzone.addEventListener("dragleave", () => { dropzone.classList.remove("dragover"); });
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (pasteBtn && pasteInput) {
      pasteBtn.addEventListener("click", () => {
        const text = pasteInput.value.trim();
        if (!text) return;
        const parsed = parsePayload(text);
        pendingImport = parsed;
        previewArea.hidden = false;
        previewArea.innerHTML = renderPreview(parsed);
        bindPreviewActions();
      });
    }

    function bindPreviewActions() {
      const confirmBtn = previewArea.querySelector("#btnConfirmImport");
      const downloadBtn = previewArea.querySelector("#btnDownloadValidated");

      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          if (pendingImport && !pendingImport.error && onSessionImported) {
            onSessionImported(pendingImport);
            previewArea.innerHTML = `
              <div class="preview-card success toast-success">
                <h4>🟢 Sesión incorporada con éxito</h4>
                <p>Las métricas, historial y gráficos se han actualizado con estos datos.</p>
              </div>
            `;
          }
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          if (pendingImport && pendingImport.raw) {
            const blob = new Blob([JSON.stringify(pendingImport.raw, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `sesion-${pendingImport.date || 'nueva'}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    }
  }

  return {
    renderDropzone,
    bindEvents
  };
})();
