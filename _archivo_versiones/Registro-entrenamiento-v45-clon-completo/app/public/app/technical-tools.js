(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingTechnicalTools = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const technicalIds = ["G01","G02","G03","G04","G05","G06","G07","G08","G09","G10","G11","G12","G13","G14","G15","G16","G17","G18","S01","S02","S03","S04","S05","S06","S07","B01","B02","B03","B04","B05","B06","B07","B08","B09","C01","C02","C03","C04","C05","C06","C07","A01","A02","A03","A04","A05","L01","L02","L03","L04","L05","L06","T01","T02","T03"];
  const catalogMap = Object.fromEntries(technicalIds.map((id, index) => [`E${String(index + 1).padStart(3, "0")}`, id]));
  const normalized = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const aliases = { "sentadilla bulgara en smith": "G08" };
  function find(exercise, data, catalog) {
    if (!exercise || !data || data.schema !== "dame_cana_indicaciones_tecnicas.v1") return null;
    const records = data.ejercicios || {};
    const name = normalized(exercise.name);
    const identified = (Array.isArray(catalog) ? catalog : []).find((item) => item.id === exercise.catalogId && normalized(item.name) === name);
    const fromCatalog = (Array.isArray(catalog) ? catalog : []).find((item) => normalized(item.name) === name);
    // Exact names also cover notes and imported sessions that lack a catalogId.
    const id = (identified && catalogMap[identified.id]) || (fromCatalog && catalogMap[fromCatalog.id]) || aliases[name];
    if (id && records[id]) return records[id];
    const matches = Object.values(records).filter((item) => normalized(item.nombre) === name);
    return matches.length === 1 ? matches[0] : null;
  }
  function mount(card, exercise, data, catalog) {
    const document = card.ownerDocument;
    const technical = find(exercise, data, catalog);
    const inner = document.createElement("div"); inner.className = "exercise-flip-inner";
    const front = document.createElement("div"); front.className = "exercise-front";
    while (card.firstChild) front.appendChild(card.firstChild);
    const back = document.createElement("section"); back.className = "exercise-back";
    const backId = `exercise-tech-${card.dataset.exerciseCard}`;
    back.id = backId; back.setAttribute("aria-label", `Técnica de ${exercise.name}`); back.setAttribute("aria-hidden", "true"); back.inert = true;
    const open = document.createElement("button"); open.type = "button"; open.className = "tech-open no-print"; open.textContent = "↻ Ver técnica";
    open.setAttribute("aria-controls", backId); open.setAttribute("aria-expanded", "false"); open.setAttribute("aria-label", `Ver técnica de ${exercise.name}`);
    front.querySelector(".exercise-card-header").after(open);
    const close = document.createElement("button"); close.type = "button"; close.className = "tech-close no-print"; close.textContent = "↶ Volver al registro";
    const heading = document.createElement("h3"); heading.textContent = exercise.name;
    back.append(close, heading);
    function section(parent, label, content) {
      if (!content) return;
      const title = document.createElement("h4"); title.textContent = label;
      const text = document.createElement("p"); text.textContent = content;
      parent.append(title, text);
    }
    function disclosure(label) {
      const details = document.createElement("details");
      const summary = document.createElement("summary"); summary.textContent = label;
      details.append(summary); back.append(details); return details;
    }
    if (!technical) {
      section(back, "Ficha pendiente", "No hay indicaciones técnicas vinculadas a este nombre o variante de ejercicio.");
    } else {
      const status = document.createElement("p"); status.className = "tech-status";
      status.textContent = `${technical.base.estado || "Estado sin especificar"} · ${data.fecha_actualizacion || ""}`; back.append(status);
      section(back, "Zona principal", technical.region_principal);
      section(back, "Configuración base", technical.base.configuracion);
      section(back, "Objetivo técnico", technical.base.objetivo);
      if ((technical.variantes || []).length) {
        const variants = disclosure("Variantes y sensaciones");
        technical.variantes.forEach((variant) => {
          section(variants, "Cambio", variant.cambio);
          section(variants, "Sensación buscada", variant.sensacion_buscada);
          section(variants, "Configuración", variant.configuracion);
          section(variants, "Objetivo", variant.objetivo);
        });
      }
      if (technical.respaldo_cientifico) {
        const science = disclosure("Respaldo incluido en la ficha");
        section(science, "Justificación biomecánica", technical.respaldo_cientifico.justificacion_biomecanica);
        const list = document.createElement("ul");
        (technical.respaldo_cientifico.fuentes || []).forEach((source) => { const item = document.createElement("li"); item.textContent = source; list.append(item); });
        science.append(list);
      }
    }
    function flip(showBack) {
      card.dataset.techFlipped = String(showBack);
      front.inert = showBack; front.setAttribute("aria-hidden", String(showBack));
      back.inert = !showBack; back.setAttribute("aria-hidden", String(!showBack));
      open.setAttribute("aria-expanded", String(showBack));
      if (showBack) { back.scrollTop = 0; close.focus({ preventScroll: true }); }
      else open.focus({ preventScroll: true });
    }
    open.addEventListener("click", (event) => { event.stopPropagation(); flip(true); });
    close.addEventListener("click", (event) => { event.stopPropagation(); flip(false); });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button,input,textarea,select,label,summary,a,details,[contenteditable]")) return;
      const selection = card.ownerDocument.defaultView?.getSelection();
      if (selection && !selection.isCollapsed) return;
      flip(card.dataset.techFlipped !== "true");
    });
    card.addEventListener("keydown", (event) => { if (event.key === "Escape" && card.dataset.techFlipped === "true") { event.stopPropagation(); flip(false); } });
    inner.append(front, back); card.append(inner); card.dataset.techFlipped = "false";
  }
  return { find, mount, catalogMap };
});
