(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingTechnicalTools = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const technicalIds = ["G01","G02","G03","G04","G05","G06","G07","G08","G09","G10","G11","G12","G13","G14","G15","G16","G17","G18","S01","S02","S03","S04","S05","S06","S07","B01","B02","B03","B04","B05","B06","B07","B08","B09","C01","C02","C03","C04","C05","C06","C07","A01","A02","A03","A04","A05","L01","L02","L03","L04","L05","L06","T01","T02","T03","B10"];
  const catalogMap = Object.fromEntries(technicalIds.map((id, index) => [`E${String(index + 1).padStart(3, "0")}`, id]));
  const extraCatalogMap = {
    E057: "A06", E058: "G19", E059: "G20", E060: "S08",
    E061: "C05", E062: "C02", E063: "C05", E064: "C05", E065: "C05", E066: "C05", E067: "C07", E068: "C07",
    E069: "B02", E070: "B02", E071: "B01", E072: "B01", E073: "B06", E074: "B09", E075: "B07", E076: "S01", E077: "S05",
    E078: "S07", E079: "S07", E080: "S07", E081: "S03", E082: "S02", E083: "S04", E084: "S07",
    E085: "A01", E086: "A01", E087: "A02", E088: "A02", E089: "A03", E090: "A03", E091: "A04", E092: "A03",
    E093: "G06", E094: "G06", E095: "G06", E096: "L01", E097: "G10", E098: "G08", E099: "G07", E100: "G04",
    E101: "G11", E102: "G11", E103: "G12", E104: "G12", E105: "G03", E106: "G01", E107: "L03", E108: "G11", E109: "G15",
    E110: "T02", E111: "T02", E112: "T03", E113: "B10", E114: "L04", E115: "L04"
  };
  Object.assign(catalogMap, extraCatalogMap);
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
    "forward lean shrug en smith": "B10", "encogimiento en smith con inclinacion anterior": "B10", "encogimiento kelso en smith": "B10", "kelso shrug en smith": "B10", "shrug en smith": "B10", "encogimientos trapecio en smith": "B10",
    "dual cable cross pushdown": "A06", "cross pushdown": "A06",
    "kickback diagonal de gluteo en polea baja": "G19", "kickback diagonal": "G19", "patada diagonal": "G19",
    "cossack squat sentadilla cosaca": "G20", "cossack squat": "G20", "sentadilla cosaca": "G20",
    "encogimientos trapecio en smith con inclinacion hacia delante": "S08",
    "press banca plano con barra": "C05", "press banca plano": "C05", "press banca": "C05", "bench press": "C05",
    "press inclinado con barra": "C02", "press declinado con barra o smith": "C05", "press declinado": "C05",
    "press plano con mancuernas": "C05", "fondos en paralelas para pecho dips": "C05", "fondos en paralelas": "C05", "dips": "C05",
    "flexiones de pecho push ups": "C05", "flexiones de pecho": "C05", "push ups": "C05",
    "cruces de poleas de abajo hacia arriba": "C07", "cruces de poleas de arriba hacia abajo": "C07",
    "dominadas pronas pull ups": "B02", "dominadas pronas": "B02", "pull ups": "B02",
    "dominadas supinas chin ups": "B02", "dominadas supinas": "B02", "chin ups": "B02",
    "jalon al pecho agarre ancho": "B01", "jalon al pecho agarre supino": "B01",
    "remo con barra pendlay 45": "B06", "remo con barra": "B06", "remo pendlay": "B06",
    "remo con mancuerna a una mano": "B09", "remo con mancuerna": "B09", "remo en punta t bar libre": "B07", "remo en punta": "B07",
    "remo al menton upright row": "S01", "remo al menton": "S01", "face pull en polea alta": "S05", "face pull": "S05",
    "press militar de pie con barra ohp": "S07", "press militar de pie con barra": "S07", "press militar": "S07", "ohp": "S07",
    "press militar sentado con mancuernas": "S07", "press arnold con mancuernas": "S07", "press arnold": "S07",
    "elevaciones laterales sentado con mancuernas": "S03", "elevacion lateral tumbado en banco inclinado": "S02",
    "pajaros con mancuernas rear delt flyes": "S04", "pajaros con mancuernas": "S04", "pajaros": "S04",
    "elevacion frontal con mancuernas o disco": "S07", "elevacion frontal": "S07",
    "press frances con barra z": "A01", "press frances con mancuernas": "A01", "press frances": "A01",
    "fondos entre bancos bench dips": "A02", "fondos entre bancos": "A02", "extension unilateral de triceps en polea": "A02",
    "curl de biceps con barra recta o z": "A03", "curl de biceps con barra": "A03", "curl con barra": "A03",
    "curl de biceps alterno con mancuernas": "A03", "curl alterno con mancuernas": "A03",
    "curl inclinado con mancuernas en banco 60": "A04", "curl inclinado con mancuernas": "A04", "curl inclinado": "A04",
    "curl de concentracion con mancuerna": "A03", "curl de concentracion": "A03",
    "sentadilla trasera con barra back squat": "G06", "sentadilla trasera con barra": "G06", "back squat": "G06", "sentadilla libre": "G06",
    "sentadilla frontal con barra front squat": "G06", "sentadilla frontal con barra": "G06", "front squat": "G06",
    "sentadilla goblet con mancuerna": "G06", "sentadilla goblet": "G06",
    "sentadilla sissy sissy squat": "L01", "sentadilla sissy": "L01", "sissy squat": "L01",
    "zancadas caminando walking lunges": "G10", "zancadas caminando": "G10",
    "step up en cajon sesgado a gluteo": "G08", "step up en cajon": "G08", "step up": "G08",
    "prensa unilateral a una pierna": "G07", "prensa unilateral": "G07",
    "belt squat sentadilla con cinturon": "G04", "belt squat": "G04",
    "peso muerto convencional con barra": "G11", "peso muerto convencional": "G11", "deadlift": "G11",
    "peso muerto sumo con barra": "G11", "peso muerto sumo": "G11", "sumo deadlift": "G11",
    "peso muerto rumano con barra rdl": "G12", "peso muerto rumano con barra": "G12",
    "peso muerto rumano unilateral b stance": "G12", "peso muerto rumano unilateral": "G12",
    "glute bridge con barra en suelo": "G03", "glute bridge": "G03", "puente de gluteo": "G03",
    "frog pump con mancuerna o banda": "G01", "frog pump": "G01",
    "nordic hamstring curl curl nordico": "L03", "nordic hamstring curl": "L03", "curl nordico": "L03",
    "buenos dias con barra good mornings": "G11", "buenos dias con barra": "G11", "buenos dias": "G11",
    "aduccion de cadera en maquina": "G15", "aduccion de cadera": "G15", "aduccion en maquina": "G15",
    "rueda abdominal ab wheel rollout": "T02", "rueda abdominal": "T02", "ab wheel rollout": "T02", "ab wheel": "T02",
    "elevacion de piernas colgado en barra": "T02", "elevacion de piernas colgado": "T02",
    "plancha frontal isometrica plank": "T03", "plancha frontal isometrica": "T03", "plancha frontal": "T03", "plank": "T03",
    "paseo del granjero farmer walk": "B10", "paseo del granjero": "B10", "farmer walk": "B10",
    "elevacion de talones tipo burro donkey calf raise": "L04", "elevacion de talones tipo burro": "L04", "donkey calf raise": "L04",
    "elevacion de talones unilateral con mancuerna": "L04", "elevacion de talones unilateral": "L04"
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
