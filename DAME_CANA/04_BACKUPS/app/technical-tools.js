(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingTechnicalTools = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const technicalIds = ["G01","G02","G03","G04","G05","G06","G07","G08","G09","G10","G11","G12","G13","G14","G15","G16","G17","G18","S01","S02","S03","S04","S05","S06","S07","B01","B02","B03","B04","B05","B06","B07","B08","B09","C01","C02","C03","C04","C05","C06","C07","A01","A02","A03","A04","A05","L01","L02","L03","L04","L05","L06","T01","T02","T03","B10"];
  const catalogMap = Object.fromEntries(technicalIds.map((id, index) => [`E${String(index + 1).padStart(3, "0")}`, id]));
  const clean = (val) => String(val || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^[a-zA-Z0-9]{1,3}\.\s*/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const aliases = {
    "hip thrust en maquina discos": "G01", "hip thrust en maquina": "G01", "hip thrust maquina": "G01",
    "hip thrust en smith": "G02", "hip thrust smith": "G02", "hip thrust con barra": "G03",
    "sentadilla hack matrix profunda": "G04", "sentadilla hack matrix": "G04", "hack squat profunda": "G04", "hack squat": "G04",
    "sentadilla pendular profunda": "G05", "sentadilla profunda en smith": "G06", "prensa profunda": "G07",
    "sentadilla bulgara en smith": "G08", "sentadilla bulgara": "G08", "bulgarian split squat en smith": "G08", "bulgarian split squat": "G08", "bulgarian con mancuernas": "G09",
    "zancada inversa en smith": "G10",
    "peso muerto rumano en smith rdl": "G11", "peso muerto rumano en smith": "G11", "peso muerto rumano rdl": "G11", "rdl smith": "G11",
    "peso muerto rumano con mancuernas": "G12", "hiperextension a 45 sesgada a gluteo": "G13", "hiperextension 45 unilateral": "G13",
    "extension de cadera en cable": "G14", "rear kick": "G14",
    "abduccion sentada en maquina vaciado metabolico": "G15", "abduccion sentada en maquina": "G15", "abduccion sentada": "G15", "abduccion de cadera en maquina": "G15",
    "abduccion unilateral en cable": "G16", "abduccion cable": "G16",
    "power squat leverage power squat": "G17", "v squat lever v squat": "G18",
    "jalon medio o neutro": "B01", "jalon medio neutro": "B01", "jalon neutro": "B01",
    "dominada neutra asistida": "B02", "jalon unilateral en cable": "B03", "pullover en maquina": "B04",
    "pullover en polea alta con brazos rectos": "B05", "pullover en polea con brazos rectos": "B05", "pullover en polea con ambos brazos": "B05", "pullover en polea": "B05", "jalon con brazos rectos pullover cable": "B05", "jalon con brazos rectos": "B05",
    "remo con pecho apoyado banco o maquina": "B06", "remo con pecho apoyado": "B06", "remo posterior con pecho apoyado": "B06", "remo convergente con pecho apoyado": "B06", "remo bajo con maquina": "B06", "low row maquina": "B06", "low row": "B06",
    "remo t bar con pecho apoyado": "B07", "remo sentado en cable gironda": "B08", "remo sentado en cable": "B08", "remo unilateral en cable con apoyo": "B09",
    "press convergente inclinado moderado": "C01", "press inclinado moderado": "C01", "press inclinado en maquina": "C01", "press inclinado convergente": "C01",
    "press inclinado en smith 15 30": "C02", "press inclinado en smith": "C02", "press inclinado con mancuernas": "C03",
    "press horizontal convergente maquina": "C04", "press horizontal convergente": "C04", "press horizontal en maquina sentado": "C04", "press convergente horizontal": "C04", "press maquina": "C04",
    "press plano en smith o con mancuernas": "C05", "flexiones autocarga": "C05", "peck deck aperturas": "C06", "peck deck": "C06", "apertura en cable": "C07",
    "elevacion lateral en maquina": "S01", "elevacion lateral": "S01", "elevacion lateral unilateral en cable": "S02", "elevacion lateral en polea": "S02", "elevacion lateral con mancuernas": "S03",
    "peck deck inverso o remo posterior abierto": "S04", "peck deck inverso": "S04", "apertura inversa en cable": "S05",
    "remo posterior con pecho apoyado": "S06", "press de hombro en maquina": "S07",
    "extension de triceps overhead en cable katana": "A01", "extension de triceps overhead en cable": "A01", "extension de triceps overhead": "A01", "extension de triceps katana unilateral": "A01", "triceps katana": "A01",
    "extension de triceps en polea con cuerda": "A02", "pressdown en cable": "A02", "triceps cuerda polea": "A02", "triceps cuerda": "A02",
    "curl predicador en cable o maquina": "A03", "curl predicador en maquina": "A03", "curl predicador": "A03", "curl predicador o kinesiologico": "A03", "curl kinesiologico mancuerna": "A03",
    "curl bayesiano en cable": "A04", "curl bayesiano": "A04", "curl martillo en cable o mancuernas": "A05", "curl martillo": "A05",
    "extension de rodilla en maquina": "L01", "extension de rodilla": "L01",
    "curl femoral sentado": "L02", "curl femoral tumbado": "L03",
    "elevacion de talones de pie en maquina": "L04", "gemelo con rodilla extendida en hack": "L04", "gemelo con rodilla extendida": "L04", "gemelo hack": "L04", "gemelo en prensa con rodilla extendida": "L05", "elevacion de talones sentada": "L06",
    "crunch en cable o maquina": "T01", "crunch cargado en maquina": "T01", "crunch cargado": "T01",
    "reverse crunch controlado": "T02", "reverse crunch o elevacion de piernas": "T02", "reverse crunch": "T02", "pallof press": "T03",
    "forward lean shrug en smith": "B10", "encogimiento en smith con inclinacion anterior": "B10", "encogimiento kelso en smith": "B10", "kelso shrug en smith": "B10", "shrug en smith": "B10", "encogimientos trapecio en smith": "B10"
  };
  function heuristicMatch(name) {
    if (!name) return null;
    if (name.includes("katana")) return "A01";
    if (name.includes("bayesiano")) return "A04";
    if (name.includes("predicador") || name.includes("scott") || name.includes("kinesiologico")) return "A03";
    if (name.includes("low row")) return "B06";
    if (name.includes("pullover")) return "B05";
    if (name.includes("rdl")) return "G11";
    if (name.includes("shrug") || name.includes("encogimiento") || name.includes("kelso")) return "B10";
    if (name.includes("bulgar")) return name.includes("mancuerna") ? "G09" : "G08";
    if (name.includes("peck deck") && (name.includes("inverso") || name.includes("posterior"))) return "S04";
    if (name.includes("pallof")) return "T03";
    if (name.includes("reverse crunch")) return "T02";
    return null;
  }
  function find(exercise, data, catalog) {
    if (!exercise || !data || data.schema !== "dame_cana_indicaciones_tecnicas.v1") return null;
    const records = data.ejercicios || {};
    const name = clean(exercise.name);
    const identified = (Array.isArray(catalog) ? catalog : []).find((item) => item.id === exercise.catalogId && clean(item.name) === name);
    const fromCatalog = (Array.isArray(catalog) ? catalog : []).find((item) => clean(item.name) === name);
    const id = (identified && catalogMap[identified.id]) || aliases[name] || heuristicMatch(name) || (fromCatalog && catalogMap[fromCatalog.id]);
    if (id && records[id]) return records[id];
    if (exercise.slotId && data.mapeo_slots_programa && data.mapeo_slots_programa[exercise.slotId] && !exercise.catalogId) {
      const slotMapped = records[data.mapeo_slots_programa[exercise.slotId]];
      if (slotMapped) return slotMapped;
    }
    const matches = Object.values(records).filter((item) => clean(item.nombre) === name);
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
    function updateHeight() {
      if (!inner.style) return;
      const naturalHeight = back.scrollHeight || 0;
      const frontHeight = front.offsetHeight || 0;
      inner.style.minHeight = `${Math.max(naturalHeight + 24, frontHeight, 460)}px`;
    }
    function flip(showBack) {
      card.dataset.techFlipped = String(showBack);
      front.inert = showBack; front.setAttribute("aria-hidden", String(showBack));
      back.inert = !showBack; back.setAttribute("aria-hidden", String(!showBack));
      open.setAttribute("aria-expanded", String(showBack));
      if (showBack) {
        updateHeight();
        back.scrollTop = 0;
        close.focus({ preventScroll: true });
      } else {
        if (inner.style) inner.style.minHeight = "";
        open.focus({ preventScroll: true });
      }
    }
    back.addEventListener("toggle", () => {
      if (card.dataset.techFlipped === "true") updateHeight();
    }, true);
    open.addEventListener("click", (event) => { event.stopPropagation(); flip(true); });
    close.addEventListener("click", (event) => { event.stopPropagation(); flip(false); });
    card.addEventListener("click", (event) => {
      if (card.dataset.techFlipped === "true") return;
      if (event.target.closest("button,input,textarea,select,label,summary,a,details,[contenteditable]")) return;
      const selection = card.ownerDocument.defaultView?.getSelection();
      if (selection && !selection.isCollapsed) return;
      flip(true);
    });
    card.addEventListener("keydown", (event) => { if (event.key === "Escape" && card.dataset.techFlipped === "true") { event.stopPropagation(); flip(false); } });
    inner.append(front, back); card.append(inner); card.dataset.techFlipped = "false";
  }
  return { find, mount, catalogMap };
});
