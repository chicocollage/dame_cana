/**
 * DC Studio - Módulo de Estaciones y Máquinas
 * Gestión visual de equipamiento, fotos locales, ajustes de asiento/clavija
 * y eliminación completa de códigos hash o UUIDs en la vista.
 */

window.DCStudioMachines = (function () {
  const PHOTO_STORAGE_KEY = "dc_studio_machine_photos_v1";
  const SETTINGS_STORAGE_KEY = "dc_studio_machine_settings_v1";

  function getStoredPhotos() {
    try {
      return JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getStoredSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function savePhoto(machineId, dataUrl) {
    const photos = getStoredPhotos();
    photos[machineId] = dataUrl;
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
  }

  function saveSetting(machineId, settingText) {
    const settings = getStoredSettings();
    settings[machineId] = settingText;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function render(machines, filter = "") {
    const photos = getStoredPhotos();
    const customSettings = getStoredSettings();

    const normalizedFilter = filter.toLowerCase().trim();
    const filtered = (machines || []).filter((m) => {
      if (!normalizedFilter) return true;
      const haystack = `${m.nombre_visible_estacion || ""} ${m.familia_slot || ""} ${m.tipo_carga || ""}`.toLowerCase();
      return haystack.includes(normalizedFilter);
    });

    if (!filtered.length) {
      return `<p class="empty-state">No se encontraron estaciones que coincidan con "${filter}".</p>`;
    }

    let html = `<div class="machines-grid">`;

    filtered.forEach((m) => {
      const mid = m.machine_id;
      const photo = photos[mid] || null;
      const currentSetting = String(customSettings[mid] || "").replace(/"/g, "&quot;");
      const title = m.nombre_visible_estacion || "Estación sin nombre";
      const family = m.familia_slot || "Entrenamiento general";
      const loadType = m.tipo_carga || "Guiada / Placas";

      html += `
        <article class="machine-card" data-machine-id="${mid}">
          <div class="machine-photo-wrap">
            ${
              photo
                ? `<img src="${photo}" alt="Foto de ${title}" class="machine-img" />`
                : `<div class="machine-photo-placeholder">
                    <span class="icon-camera" aria-hidden="true">📷</span>
                    <span>Sin foto aún</span>
                   </div>`
            }
            <label class="btn-upload-photo" title="Subir o cambiar foto">
              <span>Subir foto</span>
              <input type="file" accept="image/*" class="machine-file-input" data-id="${mid}" hidden />
            </label>
          </div>
          <div class="machine-card-body">
            <div class="machine-badges">
              <span class="pill-family">${family}</span>
              <span class="pill-load">${loadType}</span>
            </div>
            <h4 class="machine-name">${title}</h4>
            <div class="machine-adjustments">
              <label class="adjustment-label">
                <span>Ajuste físico actual:</span>
                <input type="text" class="machine-setting-input" data-id="${mid}" value="${currentSetting}" placeholder="Ej: Clavija 4, Asiento 2" />
              </label>
            </div>
          </div>
        </article>
      `;
    });

    html += `</div>`;
    return html;
  }

  function bindEvents(container, onUpdate) {
    container.addEventListener("change", (e) => {
      if (e.target.classList.contains("machine-file-input")) {
        const file = e.target.files[0];
        const mid = e.target.dataset.id;
        if (!file || !mid) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          savePhoto(mid, event.target.result);
          if (onUpdate) onUpdate();
        };
        reader.readAsDataURL(file);
      } else if (e.target.classList.contains("machine-setting-input")) {
        const mid = e.target.dataset.id;
        const val = e.target.value.trim();
        saveSetting(mid, val);
      }
    });
  }

  return {
    render,
    bindEvents,
    getStoredPhotos,
    getStoredSettings
  };
})();
