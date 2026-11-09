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
    // Porciones específicas de Pectoral
    chest_clavicular: {
      label: "PECTORAL · CLAVICULAR",
      code: "IR-CH01",
      file: "chest_clavicular.webp"
    },
    chest_sternal: {
      label: "PECTORAL · ESTERNAL",
      code: "IR-CH02",
      file: "chest_sternal.webp"
    },
    chest: {
      label: "PECTORAL MAYOR",
      code: "IR-CH05",
      file: "chest.webp"
    },

    // Porciones específicas de Deltoides
    deltoid_lateral: {
      label: "DELTOIDES · LATERAL",
      code: "IR-SH01",
      file: "deltoid_lateral.webp"
    },
    deltoid_posterior: {
      label: "DELTOIDES · POSTERIOR",
      code: "IR-SH02",
      file: "deltoid_posterior.webp"
    },
    shoulders: {
      label: "DELTOIDES",
      code: "IR-SH06",
      file: "shoulders.webp"
    },

    // Porciones específicas de Tríceps y Bíceps
    triceps_longhead: {
      label: "TRÍCEPS · CABEZA LARGA",
      code: "IR-TR01",
      file: "triceps_longhead.webp"
    },
    triceps_lateral: {
      label: "TRÍCEPS · LAT/MEDIAL",
      code: "IR-TR02",
      file: "triceps_lateral.webp"
    },
    biceps_longhead: {
      label: "BÍCEPS · CABEZA LARGA",
      code: "IR-BC01",
      file: "biceps_longhead.webp"
    },
    arms: {
      label: "BRAQUIAL · FLEXOR",
      code: "IR-AR07",
      file: "arms.webp"
    },

    // Cadena inferior, torso y core
    glute: {
      label: "GLÚTEO MAYOR",
      code: "IR-GL01",
      file: "glute.webp"
    },
    quads: {
      label: "CUÁDRICEPS",
      code: "IR-QD02",
      file: "quads.webp"
    },
    hamstrings: {
      label: "ISQUIOSURALES",
      code: "IR-HM03",
      file: "hamstrings.webp"
    },
    back: {
      label: "DORSAL · REMO",
      code: "IR-BK04",
      file: "back.webp"
    },
    core: {
      label: "CORE · ABDOMEN",
      code: "IR-CR08",
      file: "core.webp"
    }
  };

  function detectMuscleGroup(name) {
    const clean = String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // 1. Deltoides Posterior (antes de peck-deck o remo general)
    if (
      clean.includes("deltoide posterior") ||
      clean.includes("hombro posterior") ||
      clean.includes("peck deck inverso") ||
      clean.includes("peck-deck inverso") ||
      clean.includes("apertura inversa") ||
      clean.includes("remo posterior") ||
      clean.includes("pajaros")
    ) {
      return "deltoid_posterior";
    }

    // 2. Deltoides Lateral
    if (
      clean.includes("lateral") ||
      clean.includes("abduccion de hombro") ||
      clean.includes("acromial")
    ) {
      return "deltoid_lateral";
    }

    // 3. Pectoral Clavicular vs Esternocostal
    if (
      clean.includes("inclinad") ||
      clean.includes("clavicul")
    ) {
      return "chest_clavicular";
    }
    if (
      clean.includes("horizontal") ||
      clean.includes("esternal") ||
      clean.includes("plano") ||
      clean.includes("declinad") ||
      clean.includes("apertura") ||
      clean.includes("peck deck") ||
      clean.includes("peck-deck")
    ) {
      return "chest_sternal";
    }

    // 4. Tríceps: Cabeza Larga (Katana / Overhead) vs Cabezas Lateral/Medial (Pushdown)
    if (
      clean.includes("katana") ||
      clean.includes("overhead") ||
      clean.includes("tras nuca") ||
      clean.includes("frances") ||
      clean.includes("cabeza larga")
    ) {
      return "triceps_longhead";
    }
    if (
      clean.includes("pressdown") ||
      clean.includes("triceps en polea") ||
      clean.includes("triceps cuerda") ||
      clean.includes("triceps barra") ||
      clean.includes("fondos")
    ) {
      return "triceps_lateral";
    }

    // 5. Bíceps: Cabeza Larga en Estiramiento (Bayesiano)
    if (
      clean.includes("bayesiano") ||
      clean.includes("inclinado con mancuernas") ||
      clean.includes("biceps cable detras") ||
      clean.includes("estiramiento")
    ) {
      return "biceps_longhead";
    }

    // 6. Inferior / Cadena posterior / Core / Grupos generales
    if (
      clean.includes("hip thrust") ||
      clean.includes("glute") ||
      clean.includes("abduccion") ||
      clean.includes("rear kick") ||
      clean.includes("patada") ||
      clean.includes("bulgar") ||
      clean.includes("zancada")
    ) {
      return "glute";
    }
    if (
      clean.includes("rdl") ||
      clean.includes("rumano") ||
      clean.includes("femoral") ||
      clean.includes("isquio") ||
      clean.includes("hiperextension")
    ) {
      return "hamstrings";
    }
    if (
      clean.includes("sentadilla") ||
      clean.includes("hack") ||
      clean.includes("prensa") ||
      clean.includes("pendular") ||
      clean.includes("extension de rodilla") ||
      clean.includes("cuadriceps") ||
      clean.includes("gemelo") ||
      clean.includes("talones")
    ) {
      return "quads";
    }
    if (
      clean.includes("jalon") ||
      clean.includes("dominada") ||
      clean.includes("remo") ||
      clean.includes("row") ||
      clean.includes("pullover") ||
      clean.includes("shrug") ||
      clean.includes("encogimiento") ||
      clean.includes("kelso") ||
      clean.includes("dorsal")
    ) {
      return "back";
    }
    if (
      clean.includes("hombro") ||
      clean.includes("deltoide")
    ) {
      return "shoulders";
    }
    if (
      clean.includes("press") ||
      clean.includes("pecho") ||
      clean.includes("flexion")
    ) {
      return "chest";
    }
    if (
      clean.includes("curl") ||
      clean.includes("triceps") ||
      clean.includes("biceps") ||
      clean.includes("braquial") ||
      clean.includes("martillo") ||
      clean.includes("predicador")
    ) {
      return "arms";
    }
    if (
      clean.includes("crunch") ||
      clean.includes("pallof") ||
      clean.includes("abdom") ||
      clean.includes("core") ||
      clean.includes("plancha")
    ) {
      return "core";
    }
    return "glute";
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
      if (front.querySelector(".tn-hologram-bay")) return;

      const header = front.querySelector(".exercise-card-header");
      if (!header) return;

      const nameEl = header.querySelector(".exercise-name");
      const exerciseName = nameEl ? nameEl.textContent : "";
      const groupKey = detectMuscleGroup(exerciseName);
      const holoData = MUSCLE_HOLOGRAMS[groupKey] || MUSCLE_HOLOGRAMS.glute;

      const strip = document.createElement("div");
      strip.className = "tn-bio-strip";

      const bioLeft = document.createElement("div");
      bioLeft.className = "tn-bio-left";

      const techOpen = front.querySelector(".tech-open");
      const coachCue = front.querySelector(".coach-cue");

      if (techOpen) bioLeft.appendChild(techOpen);
      if (coachCue) bioLeft.appendChild(coachCue);

      const bay = document.createElement("div");
      bay.className = "tn-hologram-bay no-print";
      bay.setAttribute("role", "button");
      bay.setAttribute("tabindex", "0");
      bay.setAttribute("title", "Pulsar para girar tarjeta y ver biomecánica 3D");
      bay.setAttribute("aria-label", `Holograma muscular: ${holoData.label}. Pulsar para ver indicaciones técnicas.`);
      bay.innerHTML = `
        <img class="tn-hologram-img" src="assets/holo/${holoData.file}" alt="${holoData.label}" loading="lazy" width="106" height="100" />
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
        if (restDock) {
          const isOpen = restDock.getAttribute("data-open") === "true";
          restDock.setAttribute("data-open", isOpen ? "false" : "true");
        }
        const restMain = document.getElementById("restTimerButton");
        if (restMain && document.body.dataset.screen !== "session") {
          restMain.click();
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

  function boot() {
    setupTouchAndMouseEvents();
    enhanceExerciseCards();
    initKnurledRoller();
    initLaserHudSync();
    initTapeDeckReels();
    highlightRecommendedDayDial();
    initBottomNavDock();
    initFinishPopover();

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
