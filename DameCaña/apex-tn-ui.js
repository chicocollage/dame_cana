/* ==========================================================================
   DameCañaTN — APEX STEALTH CHRONO-LAB UI ENGINE (apex-tn-ui.js)
   Capa puramente visual y táctil sobre los contratos originales de DCLog:
   1. Holograma Muscular Termográfico 3D (Wireframe + Infrared Core) por tarjeta.
   2. Rodillo vertical moleteado (#tnKnurledRoller) para control táctil ±15s.
   3. Horizonte Láser de Descanso con telemetría en vivo (#restLaserHud).
   4. Bobinas mecánicas de cinta (#tapeReelLeft / #tapeReelRight) al editar nota.
   5. Iluminación en acrílico ámbar translúcido del siguiente Día recomendado.
   ========================================================================== */
(function () {
  "use strict";

  const MUSCLE_HOLOGRAMS = {
    // 1. Pectoral
    pec_clavicular:   { label: "PEC // CLAVICULAR",   code: "30°-45°", file: "01_pectoral_clavicular.webp" },
    pec_esternal:     { label: "PEC // ESTERNAL",     code: "PLANO 0°", file: "02_pectoral_esternocostal.webp" },
    pec_abdominal:    { label: "PEC // COSTAL INF",   code: "DECL -30°", file: "03_pectoral_abdominal.webp" },
    // 2. Espalda y Cintura Escapular
    dorsal_sup:       { label: "LAT // TORÁCICO",     code: "TRACCIÓN", file: "04_dorsal_superiores_toracicas.webp" },
    dorsal_inf:       { label: "LAT // ILÍACO",       code: "SAGITAL", file: "05_dorsal_inferiores_iliacas.webp" },
    trapecio_sup:     { label: "TRAP // SUPERIOR",    code: "ELEVACIÓN", file: "06_trapecio_superior.webp" },
    trapecio_medio:   { label: "ROMB // TRAP MED",    code: "RETRACCIÓN", file: "07_trapecio_medio_romboides.webp" },
    trapecio_inf:     { label: "TRAP // INFERIOR",    code: "DEPRESIÓN", file: "08_trapecio_inferior.webp" },
    redondo_mayor:    { label: "TERES // MAYOR",      code: "PULLOVER", file: "09_redondo_mayor.webp" },
    // 3. Deltoides
    deltoides_ant:    { label: "DELT // ANTERIOR",    code: "FLEXIÓN", file: "10_deltoides_anterior.webp" },
    deltoides_lat:    { label: "DELT // LATERAL",     code: "ABD 90°", file: "11_deltoides_lateral.webp" },
    deltoides_post:   { label: "DELT // POSTERIOR",   code: "EXT HORIZ", file: "12_deltoides_posterior.webp" },
    // 4. Brazos
    biceps_larga:     { label: "BÍCEPS // LARGA",     code: "ELONGACIÓN", file: "13_biceps_cabeza_larga.webp" },
    biceps_corta:     { label: "BÍCEPS // CORTA",     code: "ACORTAM.", file: "14_biceps_cabeza_corta.webp" },
    braquial:         { label: "BRAQUIAL // RADIAL",  code: "NEUTRO", file: "15_braquial_braquiorradial.webp" },
    triceps_larga:    { label: "TRÍCEPS // LARGA",    code: "OVERHEAD", file: "16_triceps_cabeza_larga.webp" },
    triceps_lat:      { label: "TRÍCEPS // LAT-MED",  code: "EXTENSIÓN", file: "17_triceps_lateral_medial.webp" },
    // 5. Cadera y Glúteos
    gluteo_inf:       { label: "GLÚTEO // INFERIOR",  code: "ELONGACIÓN", file: "18_gluteo_mayor_inferior.webp" },
    gluteo_sup:       { label: "GLÚTEO // SUPERIOR",  code: "ACORTAM.", file: "19_gluteo_mayor_superior.webp" },
    gluteo_medio:     { label: "GLÚTEO // MEDIO",     code: "ABDUCCIÓN", file: "20_gluteo_medio_menor.webp" },
    // 6. Cuádriceps
    cuadriceps_vastos:{ label: "CUÁDR // VASTOS",     code: "FLEX ROD", file: "21_cuadriceps_vastos.webp" },
    recto_femoral:    { label: "RECTO // FEMORAL",    code: "BIARTIC.", file: "22_recto_femoral.webp" },
    // 7. Isquiosurales
    isquios_cadera:   { label: "ISQ // TENSIÓN MÁX",  code: "30° ELONG", file: "23_isquios_cadera_semis_biceps_larga.webp" },
    biceps_fem_corto: { label: "BF // CABEZA CORTA",  code: "FLEX ROD", file: "24_biceps_femoral_cabeza_corta.webp" },
    // 8. Pantorrilla
    gastrocnemio:     { label: "GASTRO // GEMELOS",   code: "RODILLA 0°", file: "25_gastrocnemio_gemelos.webp" },
    soleo:            { label: "SÓLEO // PROFUNDO",   code: "RODILLA 90°", file: "26_soleo_profundo.webp" },
    // 9. Core
    abs_sup:          { label: "RECTO // SUPERIOR",   code: "CRUNCH", file: "27_recto_abdominal_superior.webp" },
    abs_inf:          { label: "RECTO // INFERIOR",   code: "RETROVERS.", file: "28_recto_abdominal_inferior.webp" },
    oblicuos:         { label: "OBLICUOS // CORE",    code: "ANTI-ROT", file: "29_oblicuos_interno_externo.webp" },
    transverso:       { label: "TRANSVERSO // PROF",  code: "VACUUM", file: "30_transverso_abdominal.webp" }
  };

  // Mapa canónico directo por ID de catálogo (E001–E115) para precisión 100%
  const CATALOG_ID_TO_MUSCLE = {
    E001: "gluteo_sup",       // Hip thrust en máquina
    E002: "gluteo_sup",       // Hip thrust en Smith
    E003: "gluteo_sup",       // Hip thrust con barra
    E004: "cuadriceps_vastos",// Hack squat profunda
    E005: "cuadriceps_vastos",// Sentadilla pendular profunda
    E006: "cuadriceps_vastos",// Sentadilla profunda en Smith
    E007: "cuadriceps_vastos",// Prensa profunda
    E008: "gluteo_inf",       // Bulgarian split squat en Smith
    E009: "gluteo_inf",       // Bulgarian con mancuernas
    E010: "gluteo_inf",       // Zancada inversa en Smith
    E011: "isquios_cadera",   // Peso muerto rumano en Smith
    E012: "isquios_cadera",   // Peso muerto rumano con mancuernas
    E013: "gluteo_sup",       // Hiperextensión a 45º sesgada a glúteo
    E014: "gluteo_sup",       // Extensión de cadera en cable
    E015: "gluteo_medio",     // Abducción de cadera en máquina
    E016: "gluteo_medio",     // Abducción unilateral en cable
    E017: "cuadriceps_vastos",// Power Squat
    E018: "cuadriceps_vastos",// V-Squat
    E019: "deltoides_lat",    // Elevación lateral en máquina
    E020: "deltoides_lat",    // Elevación lateral unilateral en cable
    E021: "deltoides_lat",    // Elevación lateral con mancuernas
    E022: "deltoides_post",   // Peck-deck inverso
    E023: "deltoides_post",   // Apertura inversa en cable
    E024: "deltoides_post",   // Remo posterior con pecho apoyado
    E025: "deltoides_ant",    // Press de hombro en máquina
    E026: "dorsal_sup",       // Jalón medio/neutro
    E027: "dorsal_sup",       // Dominada neutra asistida
    E028: "dorsal_inf",       // Jalón unilateral en cable
    E029: "redondo_mayor",    // Pullover en máquina
    E030: "redondo_mayor",    // Jalón con brazos rectos (Pullover cable)
    E031: "trapecio_medio",   // Remo convergente con pecho apoyado
    E032: "trapecio_medio",   // Remo T-bar con pecho apoyado
    E033: "dorsal_inf",       // Remo sentado en cable (Gironda)
    E034: "dorsal_inf",       // Remo unilateral en cable con apoyo
    E035: "pec_clavicular",   // Press convergente inclinado moderado
    E036: "pec_clavicular",   // Press inclinado en Smith 15-30º
    E037: "pec_clavicular",   // Press inclinado con mancuernas
    E038: "pec_esternal",     // Press convergente horizontal
    E039: "pec_esternal",     // Press plano en Smith o con mancuernas
    E040: "pec_esternal",     // Peck-deck (Aperturas)
    E041: "pec_esternal",     // Apertura en cable
    E042: "triceps_larga",    // Extensión de tríceps overhead en cable
    E043: "triceps_lat",      // Pressdown en cable
    E044: "biceps_corta",     // Curl predicador en cable o máquina
    E045: "biceps_larga",     // Curl bayesiano en cable
    E046: "braquial",         // Curl martillo en cable o mancuernas
    E047: "recto_femoral",    // Extensión de rodilla
    E048: "biceps_fem_corto", // Curl femoral sentado
    E049: "biceps_fem_corto", // Curl femoral tumbado
    E050: "gastrocnemio",     // Elevación de talones de pie en máquina
    E051: "gastrocnemio",     // Gemelo en prensa con rodilla extendida
    E052: "soleo",            // Elevación de talones sentada
    E053: "abs_sup",          // Crunch en cable o máquina
    E054: "abs_inf",          // Reverse crunch controlado
    E055: "oblicuos",         // Pallof press
    E056: "trapecio_medio",   // Forward-Lean Shrug en Smith (Kelso)
    E057: "triceps_lat",      // Dual-cable cross pushdown
    E058: "gluteo_sup",       // Kickback diagonal de glúteo en polea baja
    E059: "gluteo_medio",     // Cossack squat
    E060: "trapecio_sup",     // Encogimientos trapecio en Smith
    E061: "pec_esternal",     // Press banca plano con barra
    E062: "pec_clavicular",   // Press inclinado con barra
    E063: "pec_abdominal",    // Press declinado con barra o Smith
    E064: "pec_esternal",     // Press plano con mancuernas
    E065: "pec_abdominal",    // Fondos en paralelas para pecho (Dips)
    E066: "pec_esternal",     // Flexiones de pecho (Push-ups)
    E067: "pec_clavicular",   // Cruces de poleas de abajo hacia arriba
    E068: "pec_abdominal",    // Cruces de poleas de arriba hacia abajo
    E069: "dorsal_sup",       // Dominadas pronas (Pull-ups)
    E070: "dorsal_sup",       // Dominadas supinas (Chin-ups)
    E071: "dorsal_sup",       // Jalón al pecho agarre ancho
    E072: "dorsal_sup",       // Jalón al pecho agarre supino
    E073: "trapecio_medio",   // Remo con barra (Pendlay / 45º)
    E074: "dorsal_inf",       // Remo con mancuerna a una mano
    E075: "trapecio_medio",   // Remo en punta (T-Bar libre)
    E076: "deltoides_lat",    // Remo al mentón (Upright row)
    E077: "deltoides_post",   // Face pull en polea alta
    E078: "deltoides_ant",    // Press militar de pie con barra (OHP)
    E079: "deltoides_ant",    // Press militar sentado con mancuernas
    E080: "deltoides_ant",    // Press Arnold con mancuernas
    E081: "deltoides_lat",    // Elevaciones laterales sentado con mancuernas
    E082: "deltoides_lat",    // Elevación lateral tumbado en banco inclinado
    E083: "deltoides_post",   // Pájaros con mancuernas
    E084: "deltoides_ant",    // Elevación frontal con mancuernas o disco
    E085: "triceps_larga",    // Press francés con barra Z
    E086: "triceps_larga",    // Press francés con mancuernas
    E087: "triceps_lat",      // Fondos entre bancos
    E088: "triceps_lat",      // Extensión unilateral de tríceps en polea
    E089: "biceps_corta",     // Curl de bíceps con barra recta o Z
    E090: "biceps_corta",     // Curl de bíceps alterno con mancuernas
    E091: "biceps_larga",     // Curl inclinado con mancuernas en banco 60º
    E092: "biceps_corta",     // Curl de concentración con mancuerna
    E093: "cuadriceps_vastos",// Sentadilla trasera con barra
    E094: "cuadriceps_vastos",// Sentadilla frontal con barra
    E095: "cuadriceps_vastos",// Sentadilla goblet con mancuerna
    E096: "recto_femoral",    // Sentadilla Sissy
    E097: "gluteo_inf",       // Zancadas caminando
    E098: "gluteo_inf",       // Step-up en cajón sesgado a glúteo
    E099: "cuadriceps_vastos",// Prensa unilateral / a una pierna
    E100: "cuadriceps_vastos",// Belt squat
    E101: "isquios_cadera",   // Peso muerto convencional con barra
    E102: "gluteo_inf",       // Peso muerto sumo con barra
    E103: "isquios_cadera",   // Peso muerto rumano con barra (RDL)
    E104: "isquios_cadera",   // Peso muerto rumano unilateral (B-Stance)
    E105: "gluteo_sup",       // Glute bridge con barra en suelo
    E106: "gluteo_sup",       // Frog pump con mancuerna o banda
    E107: "biceps_fem_corto", // Nordic hamstring curl
    E108: "isquios_cadera",   // Buenos días con barra
    E109: "gluteo_medio",     // Aducción de cadera en máquina
    E110: "abs_inf",          // Rueda abdominal
    E111: "abs_inf",          // Elevación de piernas colgado en barra
    E112: "transverso",       // Plancha frontal isométrica
    E113: "trapecio_sup",     // Paseo del granjero
    E114: "gastrocnemio",     // Elevación de talones tipo burro
    E115: "gastrocnemio"      // Elevación de talones unilateral
  };

  function detectMuscleGroup(name) {
    const raw = String(name || "").trim();
    if (window.TrainingExerciseCatalog && typeof window.TrainingExerciseCatalog.resolve === "function") {
      const resolved = window.TrainingExerciseCatalog.resolve(raw);
      if (resolved && resolved.id && CATALOG_ID_TO_MUSCLE[resolved.id]) {
        return CATALOG_ID_TO_MUSCLE[resolved.id];
      }
    }

    const clean = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // 1. Pantorrilla (Gemelos vs Sóleo) — evaluar primero antes de "hack" o "prensa"
    if (clean.includes("talones sentad") || clean.includes("soleo") || clean.includes("gemelo sentad")) return "soleo";
    if (clean.includes("gemelo") || clean.includes("talones") || clean.includes("calf") || clean.includes("burro")) return "gastrocnemio";

    // 2. Brazos (Bíceps, Braquial, Tríceps) — evaluar antes de "inclinado", "polea" o "press"
    if (clean.includes("katana") || clean.includes("triceps overhead") || clean.includes("extension overhead") || clean.includes("tras nuca") || clean.includes("press frances") || clean.includes("cabeza larga")) return "triceps_larga";
    if (clean.includes("pressdown") || clean.includes("pushdown") || clean.includes("triceps") || clean.includes("fondos entre bancos") || clean.includes("bench dip")) return "triceps_lat";
    if (clean.includes("martillo") || clean.includes("hammer") || clean.includes("braquial") || clean.includes("curl invertido")) return "braquial";
    if (clean.includes("bayesiano") || clean.includes("bayesian") || clean.includes("curl inclinado") || clean.includes("drag curl") || clean.includes("curl cable detras")) return "biceps_larga";
    if (clean.includes("predicador") || clean.includes("scott") || clean.includes("concentracion") || clean.includes("spider") || clean.includes("curl")) return "biceps_corta";

    // 3. Deltoides (Hombro) — sin usar "lateral" desnudo
    if (clean.includes("deltoide posterior") || clean.includes("hombro posterior") || clean.includes("peck deck inverso") || clean.includes("peck-deck inverso") || clean.includes("posterior maquina") || clean.includes("apertura inversa") || clean.includes("remo posterior") || clean.includes("pajaros") || clean.includes("rear delt") || clean.includes("face pull")) return "deltoides_post";
    if (clean.includes("elevacion lateral") || clean.includes("elevaciones laterales") || clean.includes("lateral polea") || clean.includes("lateral cable") || clean.includes("lateral mancuerna") || clean.includes("lateral maquina") || clean.includes("abduccion de hombro") || clean.includes("remo al menton") || clean.includes("upright row")) return "deltoides_lat";
    if (clean.includes("press militar") || clean.includes("press de hombro") || clean.includes("press arnold") || clean.includes("elevacion frontal") || clean.includes("ohp")) return "deltoides_ant";

    // 4. Isquiosurales (Cadera vs Rodilla)
    if (clean.includes("rdl") || clean.includes("rumano") || clean.includes("buenos dias") || clean.includes("good morning") || clean.includes("peso muerto")) return "isquios_cadera";
    if (clean.includes("femoral") || clean.includes("nordic") || clean.includes("nordico") || clean.includes("isquio")) return "biceps_fem_corto";

    // 5. Cadera y Glúteos
    if (clean.includes("abduccion") || clean.includes("abductor") || clean.includes("aduccion") || clean.includes("cosaca") || clean.includes("cossack")) return "gluteo_medio";
    if (clean.includes("hip thrust") || clean.includes("puente") || clean.includes("glute bridge") || clean.includes("frog") || clean.includes("patada") || clean.includes("kickback") || clean.includes("rear kick") || clean.includes("hiperextension") || clean.includes("extension de cadera")) return "gluteo_sup";
    if (clean.includes("bulgar") || clean.includes("zancada") || clean.includes("lunge") || clean.includes("step up") || clean.includes("step-up")) return "gluteo_inf";

    // 6. Cuádriceps (Recto Femoral vs Vastos)
    if (clean.includes("extension de rodilla") || clean.includes("extension de pierna") || clean.includes("extension de cuadriceps") || clean.includes("sissy")) return "recto_femoral";
    if (clean.includes("sentadilla") || clean.includes("squat") || clean.includes("hack") || clean.includes("prensa") || clean.includes("pendular") || clean.includes("cuadriceps")) return "cuadriceps_vastos";

    // 7. Espalda y Cintura Escapular
    if (clean.includes("pullover") || clean.includes("brazos rectos")) return "redondo_mayor";
    if (clean.includes("kelso")) return "trapecio_medio";
    if (clean.includes("shrug") || clean.includes("encogimiento") || clean.includes("granjero") || clean.includes("farmer")) return "trapecio_sup";
    if (clean.includes("y-raise") || clean.includes("depresion")) return "trapecio_inf";
    if (clean.includes("pecho apoyado") || clean.includes("t-bar") || clean.includes("en punta") || clean.includes("pendlay") || clean.includes("remo con barra") || clean.includes("romboide")) return "trapecio_medio";
    if (clean.includes("gironda") || clean.includes("remo sentado") || clean.includes("remo unilateral") || clean.includes("remo con mancuerna") || clean.includes("jalon unilateral")) return "dorsal_inf";
    if (clean.includes("jalon") || clean.includes("dominada") || clean.includes("pull up") || clean.includes("pull-up") || clean.includes("chin up") || clean.includes("chin-up") || clean.includes("remo") || clean.includes("row") || clean.includes("dorsal")) return "dorsal_sup";

    // 8. Pectoral (3 porciones)
    if (clean.includes("inclinad") || clean.includes("clavicul") || clean.includes("abajo hacia arriba")) return "pec_clavicular";
    if (clean.includes("declinad") || clean.includes("fondos en paralelas") || clean.includes("dips") || clean.includes("arriba hacia abajo")) return "pec_abdominal";
    if (clean.includes("press") || clean.includes("pecho") || clean.includes("banca") || clean.includes("peck deck") || clean.includes("peck-deck") || clean.includes("apertura") || clean.includes("flexiones") || clean.includes("push up") || clean.includes("push-up")) return "pec_esternal";

    // 9. Core
    if (clean.includes("pallof") || clean.includes("oblicuo") || clean.includes("lenador") || clean.includes("woodchop") || clean.includes("plancha lateral") || clean.includes("rusa")) return "oblicuos";
    if (clean.includes("dead bug") || clean.includes("bird") || clean.includes("vacuum") || clean.includes("plancha") || clean.includes("plank")) return "transverso";
    if (clean.includes("reverse crunch") || clean.includes("colgado") || clean.includes("elevacion de piernas") || clean.includes("elevacion piernas") || clean.includes("rueda") || clean.includes("wheel")) return "abs_inf";
    if (clean.includes("crunch") || clean.includes("abdom") || clean.includes("core")) return "abs_sup";

    return "gluteo_inf";
  }

  // =========================================================================
  // ESTADO Y MOTOR MATEMÁTICO DEL CARRUSEL 3D INTERACTIVO
  // =========================================================================
  let currentIndex = 0;
  let lastCardCount = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentDragX = 0;
  let currentDragY = 0;
  let gestureAxis = null; // 'x' | 'y' | null
  let justDragged = false;

  function getCards() {
    const list = document.getElementById("exerciseList");
    if (!list) return [];
    return Array.from(list.querySelectorAll(".exercise-card"));
  }

  function syncCardSetProgress(card) {
    if (!card) return;
    const checkboxes = card.querySelectorAll('input[type="checkbox"][data-field="completed"]');
    const total = checkboxes.length;
    let completed = 0;
    checkboxes.forEach((cb) => {
      if (cb.checked) completed += 1;
    });

    card.dataset.progress = total > 0 && completed === total
      ? "complete"
      : completed > 0
        ? "active"
        : "idle";

    const countEl = card.querySelector(".card-progress-count");
    const fillEl = card.querySelector(".card-progress-fill");
    if (countEl) countEl.textContent = `${completed}/${total} series`;
    if (fillEl) {
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      fillEl.style.width = `${pct}%`;
    }
  }

  function protectInteractiveControls(root) {
    if (!root) return;
    const stopProp = (event) => {
      event.stopPropagation();
    };
    root.querySelectorAll("input, textarea, select").forEach((el) => {
      if (!el.getAttribute("onmousedown")) {
        el.setAttribute("onmousedown", "event.stopPropagation()");
      }
      if (!el.getAttribute("ontouchstart")) {
        el.setAttribute("ontouchstart", "event.stopPropagation()");
      }
      if (!el.dataset.tnDragProtected) {
        el.dataset.tnDragProtected = "true";
        el.addEventListener("mousedown", stopProp);
        el.addEventListener("touchstart", stopProp, { passive: true });
      }
    });
  }

  function updateAmbientGlow(activeCard) {
    const orbPrimary = document.getElementById("ambient-orb-primary");
    const orbSecondary = document.getElementById("ambient-orb-secondary");
    if (!orbPrimary || !orbSecondary || !activeCard) return;

    const progress = activeCard.dataset.progress;
    if (progress === "complete") {
      orbPrimary.className = "absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-lime-400/20 blur-3xl transition-all duration-700";
      orbSecondary.className = "absolute bottom-16 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-emerald-500/15 blur-3xl transition-all duration-700";
    } else if (progress === "active") {
      orbPrimary.className = "absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl transition-all duration-700";
      orbSecondary.className = "absolute bottom-16 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-amber-500/15 blur-3xl transition-all duration-700";
    } else {
      orbPrimary.className = "absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl transition-all duration-700";
      orbSecondary.className = "absolute bottom-16 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-amber-500/10 blur-3xl transition-all duration-700";
    }
  }

  function renderPaginationDots(total) {
    const dotsContainer = document.getElementById("pagination-dots");
    const counterEl = document.getElementById("carouselCounter");
    const prevBtn = document.getElementById("carouselPrevBtn");
    const nextBtn = document.getElementById("carouselNextBtn");

    if (counterEl) {
      counterEl.textContent = total > 0 ? `EJERCICIO ${currentIndex + 1} / ${total}` : "SIN EJERCICIOS";
    }
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= total - 1;

    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
      dot.setAttribute("aria-label", `Ir al ejercicio ${i + 1}`);
      dot.className = i === currentIndex
        ? "h-2 w-6 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(44,229,216,0.8)] transition-all duration-300"
        : "h-2 w-2 rounded-full bg-white/25 hover:bg-white/45 transition-all duration-300";
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goToCard(i);
      });
      dotsContainer.appendChild(dot);
    }
  }

  function updateCarousel(dragOffsetX = 0, dragOffsetY = 0) {
    const cards = getCards();
    const total = cards.length;
    if (!total) {
      renderPaginationDots(0);
      return;
    }

    if (currentIndex >= total) currentIndex = total - 1;
    if (currentIndex < 0) currentIndex = 0;

    const stageWidth = Math.min(window.innerWidth || 390, 420);
    const dragFactor = dragOffsetX / 250;

    cards.forEach((card, index) => {
      const rawOffset = (index - currentIndex) + dragFactor;
      const absOffset = Math.abs(rawOffset);
      const isActive = index === currentIndex;

      card.dataset.carouselActive = isActive ? "true" : "false";

      // Transformación espacial 3D pura para tarjetas verticales esbeltas (Trading Card HUD)
      const translateX = rawOffset * 264;
      const translateZ = -absOffset * 160;
      const rotateY = Math.max(-42, Math.min(42, rawOffset * -25));
      const rotateX = isActive && isDragging ? Math.max(-7, Math.min(7, -dragOffsetY * 0.04)) : 0;
      const scale = Math.max(0.75, 1 - absOffset * 0.12);
      const opacity = absOffset > 2.15 ? 0 : Math.max(0.24, 1 - absOffset * 0.44);
      const blur = absOffset > 0.28 ? Math.min(5, (absOffset - 0.12) * 3) : 0;
      const zIndex = 50 - Math.round(absOffset * 12);

      card.style.transform = `translate3d(${translateX.toFixed(1)}px, 0px, ${translateZ.toFixed(1)}px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      card.style.opacity = String(opacity.toFixed(2));
      card.style.zIndex = String(zIndex);
      card.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none";
      card.style.pointerEvents = absOffset > 1.35 ? "none" : "auto";
    });

    renderPaginationDots(total);
    updateAmbientGlow(cards[currentIndex]);
  }

  function goToCard(index) {
    const cards = getCards();
    if (!cards.length) return;
    currentIndex = Math.max(0, Math.min(cards.length - 1, index));
    updateCarousel(0, 0);
  }

  function prevCard() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateCarousel(0, 0);
    }
  }

  function nextCard() {
    const cards = getCards();
    if (currentIndex < cards.length - 1) {
      currentIndex += 1;
      updateCarousel(0, 0);
    }
  }

  // Exposición global para botones e integraciones
  window.updateCarousel = updateCarousel;
  window.prevCard = prevCard;
  window.nextCard = nextCard;
  window.goToCard = goToCard;

  function setupTouchAndMouseEvents() {
    const stage = document.getElementById("carousel-stage");
    if (!stage || stage.dataset.tnCarouselBound === "true") return;
    stage.dataset.tnCarouselBound = "true";

    function isInteractiveTarget(target) {
      if (!target || !(target instanceof Element)) return false;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("summary") ||
        target.closest("label.set-complete") ||
        target.closest(".rir-picker") ||
        target.closest(".no-drag")
      ) {
        return true;
      }
      return false;
    }

    function handleStart(clientX, clientY, target) {
      if (isInteractiveTarget(target)) return;
      const cards = getCards();
      if (!cards.length) return;

      isDragging = true;
      gestureAxis = null;
      startX = clientX;
      startY = clientY;
      currentDragX = 0;
      currentDragY = 0;
    }

    function handleMove(clientX, clientY, event) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (!gestureAxis) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        gestureAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (gestureAxis === "x") {
          getCards().forEach((c) => c.classList.add("dragging"));
        }
      }

      if (gestureAxis === "y") {
        // Permite scroll vertical interno de la tarjeta sin arrastrar el carrusel
        isDragging = false;
        getCards().forEach((c) => c.classList.remove("dragging"));
        return;
      }

      if (event && event.cancelable) event.preventDefault();
      currentDragX = dx;
      currentDragY = dy;
      updateCarousel(currentDragX, currentDragY);
    }

    function handleEnd() {
      if (!isDragging) return;
      isDragging = false;
      const cards = getCards();
      cards.forEach((c) => c.classList.remove("dragging"));

      if (Math.abs(currentDragX) > 12) {
        justDragged = true;
        cards.forEach((c) => { c.dataset.justDragged = "true"; });
        setTimeout(() => {
          justDragged = false;
          getCards().forEach((c) => { c.dataset.justDragged = "false"; });
        }, 260);
      }

      const threshold = 58;
      if (currentDragX < -threshold && currentIndex < cards.length - 1) {
        currentIndex += 1;
      } else if (currentDragX > threshold && currentIndex > 0) {
        currentIndex -= 1;
      }

      currentDragX = 0;
      currentDragY = 0;
      gestureAxis = null;
      updateCarousel(0, 0);
    }

    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });

    stage.addEventListener("touchmove", (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    stage.addEventListener("touchend", handleEnd);
    stage.addEventListener("touchcancel", handleEnd);

    stage.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      handleStart(e.clientX, e.clientY, e.target);
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      handleMove(e.clientX, e.clientY, e);
    });

    window.addEventListener("mouseup", handleEnd);

    // Teclado izquierda/derecha cuando no se está escribiendo en un input
    window.addEventListener("keydown", (e) => {
      if (document.body.dataset.screen !== "session") return;
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        prevCard();
      } else if (e.key === "ArrowRight") {
        nextCard();
      }
    });
  }

  function enhanceExerciseCards() {
    const list = document.getElementById("exerciseList");
    if (!list) return;

    const cards = Array.from(list.querySelectorAll(".exercise-card"));
    if (cards.length > lastCardCount && lastCardCount > 0) {
      // Si el usuario añadió un ejercicio libre, enfocar el nuevo ejercicio
      currentIndex = cards.length - 1;
    }
    lastCardCount = cards.length;

    cards.forEach((card, idx) => {
      card.classList.add("card-3d", "card-surface", "rounded-[32px]");
      protectInteractiveControls(card);
      syncCardSetProgress(card);

      // Evitar navegación accidental al tocar una tarjeta lateral o justo después de arrastrar
      if (!card.dataset.tnClickGuard) {
        card.dataset.tnClickGuard = "true";
        card.addEventListener("click", (event) => {
          const cardIdx = Number(card.dataset.exerciseCard);
          if (justDragged) {
            event.stopPropagation();
            event.preventDefault();
            return;
          }
          if (Number.isInteger(cardIdx) && cardIdx !== currentIndex) {
            event.stopPropagation();
            event.preventDefault();
            goToCard(cardIdx);
            return;
          }
        }, true);
      }

      const front = card.querySelector(".exercise-front") || card;
      const header = front.querySelector(".exercise-card-header");
      if (!header) return;

      const nameEl = header.querySelector(".exercise-name");
      const exerciseName = nameEl ? nameEl.textContent : "";
      const groupKey = detectMuscleGroup(exerciseName);
      const holoData = MUSCLE_HOLOGRAMS[groupKey] || MUSCLE_HOLOGRAMS.gluteo_inf;

      const existingBay = front.querySelector(".tn-hologram-bay");
      if (existingBay) {
        if (existingBay.dataset.muscleKey !== groupKey) {
          existingBay.dataset.muscleKey = groupKey;
          existingBay.setAttribute("aria-label", `Ilustración muscular: ${holoData.label}. Pulsar para ver indicaciones técnicas.`);
          const img = existingBay.querySelector(".tn-hologram-img");
          if (img) {
            img.src = `assets/mano3/${holoData.file}?v=tn17`;
            img.alt = holoData.label;
          }
          const tagSpan = existingBay.querySelector(".tn-hologram-tag span");
          const tagB = existingBay.querySelector(".tn-hologram-tag b");
          if (tagSpan) tagSpan.textContent = holoData.label;
          if (tagB) tagB.textContent = holoData.code;
        }
        return;
      }

      const strip = document.createElement("div");
      strip.className = "tn-bio-strip";

      const bioLeft = document.createElement("div");
      bioLeft.className = "tn-bio-left";

      const actionRow = document.createElement("div");
      actionRow.className = "tn-action-pills-row no-print";

      const techOpen = front.querySelector(".tech-open");
      const subBtn = header.querySelector(".substitute-exercise");
      const delBtn = header.querySelector(".delete-exercise");
      const coachCue = front.querySelector(".coach-cue");

      if (techOpen) {
        techOpen.textContent = "ver técnica";
        actionRow.appendChild(techOpen);
      }
      if (subBtn) {
        subBtn.textContent = "↻";
        subBtn.setAttribute("aria-label", "Sustituir ejercicio");
        actionRow.appendChild(subBtn);
      }
      if (delBtn) {
        actionRow.appendChild(delBtn);
      }

      bioLeft.appendChild(actionRow);
      if (coachCue) {
        coachCue.title = "Toca para desplegar/plegar la nota completa";
        coachCue.addEventListener("click", (e) => {
          e.stopPropagation();
          coachCue.classList.toggle("is-expanded");
        });
        bioLeft.appendChild(coachCue);
      }

      const bay = document.createElement("div");
      bay.className = "tn-hologram-bay no-print";
      bay.dataset.muscleKey = groupKey;
      bay.setAttribute("role", "button");
      bay.setAttribute("tabindex", "0");
      bay.setAttribute("title", "Pulsar para girar tarjeta y ver biomecánica 3D");
      bay.setAttribute("aria-label", `Ilustración muscular: ${holoData.label}. Pulsar para ver indicaciones técnicas.`);
      bay.innerHTML = `
        <img class="tn-hologram-img" src="assets/mano3/${holoData.file}?v=tn17" alt="${holoData.label}" loading="lazy" width="176" height="204" />
        <div class="tn-hologram-tag">
          <span>${holoData.label}</span>
          <b>${holoData.code}</b>
        </div>
      `;

      const triggerFlip = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const flipBtn = front.querySelector(".tech-open");
        if (flipBtn) flipBtn.click();
      };

      bay.addEventListener("click", triggerFlip);
      bay.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          triggerFlip(event);
        }
      });

      strip.append(bioLeft, bay);
      header.after(strip);
    });

    updateCarousel(0, 0);
  }

  function initBottomNavDock() {
    const dock = document.getElementById("bottom-nav-dock");
    if (!dock) return;

    const syncDockActiveState = () => {
      const screen = document.body.dataset.screen || "import";
      dock.querySelectorAll(".dock-nav-btn").forEach((btn) => {
        const action = btn.getAttribute("data-dock-action");
        const isActive =
          (action === "home" && (screen === "import" || screen === "review")) ||
          (action === "session" && screen === "session") ||
          (action === "history" && (screen === "history" || screen === "historical"));
        btn.setAttribute("data-active", isActive ? "true" : "false");
      });
    };

    dock.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-dock-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-dock-action");
      if (action === "home") {
        const goHome = document.getElementById("goHome");
        if (goHome) goHome.click();
      } else if (action === "session") {
        const sessionScreen = document.getElementById("sessionScreen");
        const cards = getCards();
        if (cards.length > 0 && sessionScreen) {
          document.querySelectorAll("main > .screen").forEach((s) => {
            s.hidden = s.id !== "sessionScreen";
          });
          document.body.dataset.screen = "session";
          updateCarousel(0, 0);
        } else {
          const parseBtn = document.getElementById("parseButton");
          const trainerNote = document.getElementById("trainerNote");
          if (trainerNote && trainerNote.value.trim() && parseBtn) {
            parseBtn.click();
          } else {
            const freeBtn = document.getElementById("startFreeSessionButton");
            if (freeBtn) freeBtn.click();
          }
        }
      } else if (action === "timer") {
        const restDock = document.getElementById("restDock");
        const restOptions = document.getElementById("restTimerOptions");
        const restPanel = document.getElementById("restTimerPanel");
        if (restDock) {
          const isOpen = restDock.getAttribute("data-open") === "true";
          const isTimerActive = document.body.dataset.timerActive === "true";
          if (!isOpen && !isTimerActive) {
            restDock.setAttribute("data-open", "true");
            if (restPanel && restPanel.hidden && restOptions) restOptions.click();
          } else if (restPanel && !restPanel.hidden && restOptions) {
            restOptions.click();
            if (!isTimerActive) restDock.setAttribute("data-open", "false");
          } else if (restOptions) {
            restOptions.click();
          }
        }
      } else if (action === "history") {
        const historyBtn = document.getElementById("historyButton");
        if (historyBtn) historyBtn.click();
      } else if (action === "finish") {
        // Gestionado de forma reactiva por initFinishPopover
        return;
      }
      syncDockActiveState();
    });

    syncDockActiveState();
    const bodyObserver = new MutationObserver(syncDockActiveState);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["data-screen"] });
  }

  function initFinishPopover() {
    const trigger = document.getElementById("dockFinishBtn");
    const popover = document.getElementById("finishPopover");
    if (!trigger || !popover) return;

    const togglePopover = (force) => {
      const isHidden = popover.classList.contains("hidden");
      const shouldOpen = typeof force === "boolean" ? force : isHidden;
      if (shouldOpen) {
        popover.classList.remove("hidden");
        trigger.setAttribute("aria-expanded", "true");
      } else {
        popover.classList.add("hidden");
        trigger.setAttribute("aria-expanded", "false");
      }
    };

    let lastToggleTime = 0;
    const onTriggerAction = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const now = Date.now();
      if (now - lastToggleTime < 280) return;
      lastToggleTime = now;
      togglePopover();
    };

    trigger.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        onTriggerAction(event);
      }
    });
    trigger.addEventListener("click", onTriggerAction);

    const onOutsideAction = (event) => {
      if (popover.classList.contains("hidden")) return;
      if (popover.contains(event.target) || trigger.contains(event.target)) return;
      togglePopover(false);
    };
    window.addEventListener("pointerdown", onOutsideAction, { capture: true });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !popover.classList.contains("hidden")) {
        togglePopover(false);
      }
    });

    const handleOptionSelect = async (event) => {
      const item = event.target.closest("[data-finish-option]");
      if (!item) return;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const option = item.getAttribute("data-finish-option");
      togglePopover(false);

      if (option === "save") {
        const finishBtn = document.getElementById("finishButton");
        if (finishBtn) finishBtn.click();
      } else if (option === "ai") {
        const shareBtn = document.getElementById("shareJsonButton");
        const finishBtn = document.getElementById("finishButton");
        if (shareBtn) {
          shareBtn.click();
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if (!shareBtn.disabled) {
                clearInterval(check);
                resolve();
              }
            }, 60);
          });
        }
        if (finishBtn) finishBtn.click();
      } else if (option === "pdf") {
        const pdfBtn = document.getElementById("downloadPdfButton");
        const finishBtn = document.getElementById("finishButton");
        if (pdfBtn) {
          pdfBtn.click();
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if (!pdfBtn.disabled) {
                clearInterval(check);
                resolve();
              }
            }, 80);
          });
        }
        if (finishBtn) finishBtn.click();
      } else if (option === "discard") {
        const discardBtn = document.getElementById("discardSessionButton");
        if (discardBtn) discardBtn.click();
      }
    };

    popover.addEventListener("click", handleOptionSelect);
  }

  function initKnurledRoller() {
    const roller = document.getElementById("tnKnurledRoller");
    const texture = roller ? roller.querySelector(".tn-knurled-texture") : null;
    const addBtn = document.getElementById("restTimerAdd");
    const subBtn = document.getElementById("restTimerSubtract");
    const mainBtn = document.getElementById("restTimerButton");
    if (!roller || !texture) return;

    let offset = 0;
    let startY = null;
    let accumulated = 0;

    function nudgeRoller(direction) {
      offset = (offset + direction * 6) % 28;
      texture.style.transform = `translateY(${offset}px)`;
      if (direction < 0) {
        if (addBtn && !addBtn.disabled) addBtn.click();
        else if (mainBtn) mainBtn.click();
      } else if (direction > 0) {
        if (subBtn && !subBtn.disabled) subBtn.click();
        else if (mainBtn) mainBtn.click();
      }
    }

    roller.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        nudgeRoller(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false }
    );

    roller.addEventListener("pointerdown", (event) => {
      startY = event.clientY;
      accumulated = 0;
      roller.setPointerCapture(event.pointerId);
    });

    roller.addEventListener("pointermove", (event) => {
      if (startY === null) return;
      const dy = event.clientY - startY;
      accumulated += dy;
      startY = event.clientY;
      if (Math.abs(accumulated) >= 16) {
        nudgeRoller(accumulated > 0 ? 1 : -1);
        accumulated = 0;
      }
    });

    roller.addEventListener("pointerup", () => {
      startY = null;
    });

    roller.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "+") {
        event.preventDefault();
        nudgeRoller(-1);
      } else if (event.key === "ArrowDown" || event.key === "-") {
        event.preventDefault();
        nudgeRoller(1);
      }
    });
  }

  function initLaserHudSync() {
    const display = document.getElementById("restTimerDisplay");
    const hud = document.getElementById("restLaserHud");
    if (!display || !hud) return;

    const updateHud = () => {
      const timeText = (display.textContent || "").trim();
      hud.textContent = timeText ? `AMBIENT REST · ${timeText}` : "AMBIENT REST";
    };

    updateHud();
    const observer = new MutationObserver(updateHud);
    observer.observe(display, { childList: true, characterData: true, subtree: true });
  }

  function initTapeDeckReels() {
    const note = document.getElementById("trainerNote");
    const reelL = document.getElementById("tapeReelLeft");
    const reelR = document.getElementById("tapeReelRight");
    if (!note || !reelL || !reelR) return;

    let angle = 0;
    const spinReels = () => {
      angle += 28;
      reelL.style.transform = `rotate(${angle}deg)`;
      reelR.style.transform = `rotate(${angle * 1.15}deg)`;
    };

    note.addEventListener("input", spinReels);
    document.querySelectorAll(".quick-start-button, #exampleButton").forEach((btn) => {
      btn.addEventListener("click", () => {
        angle += 120;
        reelL.style.transform = `rotate(${angle}deg)`;
        reelR.style.transform = `rotate(${angle}deg)`;
      });
    });
  }

  function highlightRecommendedDayDial() {
    try {
      const raw = localStorage.getItem("registro-entrenamiento-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const history = Array.isArray(parsed && parsed.history) ? parsed.history : [];
      if (!history.length) return;

      const cycle = ["A", "B", "C", "D", "E"];
      let lastDay = null;
      for (let i = 0; i < history.length; i++) {
        const title = String((history[i] && history[i].title) || "").toUpperCase();
        const match = title.match(/D[ÍI]A\s+([ABCDE])/);
        if (match) {
          lastDay = match[1];
          break;
        }
      }
      if (!lastDay) return;

      const nextIndex = (cycle.indexOf(lastDay) + 1) % cycle.length;
      const nextDay = cycle[nextIndex];
      const buttons = document.querySelectorAll(".quick-start-button[data-template-day]");
      buttons.forEach((btn) => {
        const isNext = btn.getAttribute("data-template-day") === nextDay;
        btn.setAttribute("data-recommended", isNext ? "true" : "false");
        if (isNext) {
          btn.setAttribute("data-knurled-tone", "amber");
        } else if (btn.getAttribute("data-template-day") === "C") {
          btn.setAttribute("data-knurled-tone", "cyan");
        } else {
          btn.setAttribute("data-knurled-tone", "volt");
        }
      });
    } catch (_) {
      /* Fallback silencioso: Día A permanece iluminado en ámbar */
    }
  }

  function initAireTimerSheet() {
    const panel = document.getElementById("restTimerPanel");
    const durationSelect = document.getElementById("restDuration");
    const soundToggle = document.getElementById("timerSoundToggle");
    const soundProfile = document.getElementById("timerSoundProfile");
    const resetBtn = document.getElementById("restTimerReset");
    const mainBtn = document.getElementById("restTimerButton");
    const restDock = document.getElementById("restDock");
    if (!panel || !durationSelect) return;

    const presetChips = Array.from(panel.querySelectorAll("[data-rest-preset]"));
    const soundChips = Array.from(panel.querySelectorAll("[data-sound-chip]"));

    const syncUiFromControls = () => {
      const currentVal = String(durationSelect.value || "120");
      presetChips.forEach((chip) => {
        const active = chip.getAttribute("data-rest-preset") === currentVal;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
      });

      const isMuted = soundToggle ? !soundToggle.checked : false;
      const currentTone = soundProfile ? String(soundProfile.value || "sport_horn") : "sport_horn";
      soundChips.forEach((chip) => {
        const key = chip.getAttribute("data-sound-chip");
        const active = isMuted ? key === "mute" : key === currentTone;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
      });
    };

    panel.addEventListener("click", (event) => {
      const presetBtn = event.target.closest("[data-rest-preset]");
      if (presetBtn) {
        event.preventDefault();
        const val = presetBtn.getAttribute("data-rest-preset");
        if (val) {
          durationSelect.value = val;
          durationSelect.dispatchEvent(new Event("change", { bubbles: true }));
          const state = restDock ? restDock.getAttribute("data-state") : "idle";
          if (state === "running" || state === "done") {
            if (resetBtn) resetBtn.click();
            if (mainBtn) mainBtn.click();
          } else if (mainBtn) {
            mainBtn.click();
          }
          syncUiFromControls();
        }
        return;
      }

      const soundBtn = event.target.closest("[data-sound-chip]");
      if (soundBtn && soundToggle && soundProfile) {
        event.preventDefault();
        const tone = soundBtn.getAttribute("data-sound-chip");
        if (tone === "mute") {
          if (soundToggle.checked) {
            soundToggle.checked = false;
            soundToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else if (tone) {
          soundProfile.value = tone;
          soundProfile.dispatchEvent(new Event("change", { bubbles: true }));
          if (!soundToggle.checked) {
            soundToggle.checked = true;
            soundToggle.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        syncUiFromControls();
      }
    });

    durationSelect.addEventListener("change", syncUiFromControls);
    if (soundToggle) soundToggle.addEventListener("change", syncUiFromControls);
    if (soundProfile) soundProfile.addEventListener("change", syncUiFromControls);
    syncUiFromControls();
  }

  function boot() {
    setupTouchAndMouseEvents();
    enhanceExerciseCards();
    initKnurledRoller();
    initLaserHudSync();
    initTapeDeckReels();
    highlightRecommendedDayDial();
    initBottomNavDock();
    initFinishPopover();
    initAireTimerSheet();

    const exerciseList = document.getElementById("exerciseList");
    if (exerciseList) {
      const observer = new MutationObserver(() => {
        enhanceExerciseCards();
      });
      observer.observe(exerciseList, { childList: true });

      const syncProgressFromInput = (event) => {
        const card = event.target && event.target.closest ? event.target.closest(".exercise-card") : null;
        if (card) {
          syncCardSetProgress(card);
          updateAmbientGlow(card);
        }
      };
      exerciseList.addEventListener("input", syncProgressFromInput);
      exerciseList.addEventListener("change", syncProgressFromInput);
    }

    window.addEventListener("resize", () => {
      updateCarousel(0, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

