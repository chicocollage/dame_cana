(function () {
  "use strict";

  const APP_VERSION = "v50";
  const STORAGE_KEY = "registro-entrenamiento-v1";
  const DRAFT_KEY = "registro-entrenamiento-nota-v1";
  const HISTORICAL_DRAFT_KEY = "registro-entrenamiento-historico-borrador-v1";
  // This snapshot is intentionally separate from trainer-facing history exports.
  const ACTIVE_DRAFT_KEY = "training_active_draft.v1";
  const WAKE_LOCK_KEY = "registro-entrenamiento-pantalla-activa-v1";
  const TIMER_SOUND_KEY = "registro-entrenamiento-sonido-v1";
  const TIMER_SOUND_PROFILE_KEY = "registro-entrenamiento-sonido-perfil-v1";
  // Product feedback is deliberately isolated from the trainer-facing history contracts.
  const FEEDBACK_STORAGE_KEY = "registro-entrenamiento-feedback-v1";
  const screens = {
    import: document.getElementById("importScreen"),
    session: document.getElementById("sessionScreen"),
    review: document.getElementById("workoutNoteReviewScreen"),
    history: document.getElementById("historyScreen"),
    historical: document.getElementById("historicalScreen")
  };
  const noteInput = document.getElementById("trainerNote");
  const exerciseList = document.getElementById("exerciseList");
  const template = document.getElementById("exerciseTemplate");
  const historyFileInput = document.getElementById("historyFileInput");
  const wakeLockToggle = document.getElementById("wakeLockToggle");
  const wakeLockStatus = document.getElementById("wakeLockStatus");
  const restDuration = document.getElementById("restDuration");
  const restTimerDisplay = document.getElementById("restTimerDisplay");
  const restTimerStatus = document.getElementById("restTimerStatus");
  const restTimerAction = document.getElementById("restTimerAction");
  const restTimerButton = document.getElementById("restTimerButton");
  const restTimerProgressTrack = document.getElementById("restTimerProgressTrack");
  const restTimerAdd = document.getElementById("restTimerAdd");
  const restTimerSubtract = document.getElementById("restTimerSubtract");
  const restTimerOptions = document.getElementById("restTimerOptions");
  const restTimerPanel = document.getElementById("restTimerPanel");
  const restDock = document.getElementById("restDock");
  const restAmbient = document.getElementById("restAmbient");
  const timerSoundToggle = document.getElementById("timerSoundToggle");
  const timerSoundProfileSelect = document.getElementById("timerSoundProfile");
  const saveStatus = document.getElementById("saveStatus");
  const syncStatusCard = document.getElementById("syncStatusCard");
  const syncStatusText = document.getElementById("syncStatusText");
  const syncStatusDetail = document.getElementById("syncStatusDetail");
  const retrySyncButton = document.getElementById("retrySyncButton");
  const feedbackDialog = document.getElementById("feedbackDialog");
  const feedbackForm = document.getElementById("feedbackForm");
  const feedbackComment = document.getElementById("feedbackComment");
  const gemCommandDialog = document.getElementById("gemCommandDialog");
  const gemCommandForm = document.getElementById("gemCommandForm");
  const gemCommandInput = document.getElementById("gemCommandInput");
  const gemCommandStatus = document.getElementById("gemCommandStatus");
  const gemCommandSubmitButton = document.getElementById("gemCommandSubmitButton");
  const historicalText = document.getElementById("historicalText");
  const historicalDraftBanner = document.getElementById("historicalDraftBanner");
  const historicalDraftSummary = document.getElementById("historicalDraftSummary");
  const historicalPreviewDate = document.getElementById("historicalPreviewDate");
  const historicalPreviewTitle = document.getElementById("historicalPreviewTitle");
  const historicalMessages = document.getElementById("historicalMessages");
  const exercisePickerDialog = document.getElementById("exercisePickerDialog");
  const exercisePickerSearch = document.getElementById("exercisePickerSearch");
  const confirmDialog = document.getElementById("confirmDialog");
  const confirmDialogTitle = document.getElementById("confirmDialogTitle");
  const confirmDialogMessage = document.getElementById("confirmDialogMessage");
  const confirmDialogConfirmButton = document.getElementById("confirmDialogConfirmButton");
  const restFinishedDialog = document.getElementById("restFinishedDialog");
  const restFinishedDialogElapsed = document.getElementById("restFinishedDialogElapsed");
  let pickerTarget = null;
  let pickerGroupFilter = "";
  let confirmDialogResolve = null;
  let activeSession = null;
  let activeSessionIsHistoricalDraft = false;
  let toastTimer = null;
  let deferredInstallPrompt = null;
  let wakeLock = null;
  let restTimerInterval = null;
  let restTimerEndsAt = 0;
  let restTimerRemaining = 0;
  let restTimerTotal = 0;
  let restTimerComplete = false;
  let restFinishedAt = 0;
  let restFinishedElapsedInterval = null;
  let lastAnnouncedRestState = "";
  let audioContext = null;
  let scheduledTimerAlarm = null;
  let immediateTimerAlarm = null;
  let selectedFeedbackCategory = "";
  let feedbackFieldContext = {};
  let focusedSyncEventId = "";

  const feedbackCategoryLabels = {
    too_many_taps: "Demasiados toques",
    hard_to_find: "Difícil de encontrar",
    awkward_input: "Dato incómodo",
    timer_or_sound: "Temporizador o sonido",
    other: "Otro"
  };

  const example = `# Día A · Glúteo y torso

1. Hip thrust en máquina — 3 × 8–10 · RIR 2 · descanso 2–3 min · Pausa breve arriba sin hiperextender la zona lumbar.
2. Sentadilla búlgara — 3 × 8–12 por lado · RIR 2 · descanso 2 min
3. Remo con pecho apoyado — 3 × 8–12 · RIR 1–2 · descanso 2 min
4. Elevación lateral en cable — 3 × 12–20 · RIR 1 · descanso 90 s`;

  const historicalExample = `Fecha: 2026-07-15
Entrenamiento: Día A
Finalizado: sí

Ejercicio: Hip thrust
Modo: carga externa
Variante: Máquina Technogym
Ajustes: respaldo 3
Base de carga: total
Objetivo: 3 x 8-10
RIR objetivo: 2
Descanso: 2 min
Serie 1: carga=80; reps=10; rir=2
Serie 2: carga=80; reps=9; rir=2
Serie 3: carga=80; reps=8; rir=1

Ejercicio: Remo en TRX
Modo: TRX
Ajustes: correas altura 5
Objetivo: 3 x 10-12
Serie 1: dificultad=pies marca 3; reps=12; rir=2
Serie 2: dificultad=pies marca 3; reps=11; rir=2
Serie 3: dificultad=pies marca 3; reps=10; rir=1`;

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function resolveConfirmation(accepted) {
    const resolve = confirmDialogResolve;
    confirmDialogResolve = null;
    if (confirmDialog.open) confirmDialog.close();
    if (resolve) resolve(Boolean(accepted));
  }

  function requestConfirmation({ title = "Confirmar acción", message = "", confirmLabel = "Confirmar", danger = false } = {}) {
    if (confirmDialogResolve) resolveConfirmation(false);
    confirmDialogTitle.textContent = title;
    confirmDialogMessage.textContent = message;
    confirmDialogConfirmButton.textContent = confirmLabel;
    confirmDialogConfirmButton.dataset.danger = danger ? "true" : "false";
    return new Promise((resolve) => {
      confirmDialogResolve = resolve;
      confirmDialog.showModal();
      requestAnimationFrame(() => document.getElementById("confirmDialogCancelButton").focus());
    });
  }

  document.getElementById("confirmDialogCloseButton").addEventListener("click", () => resolveConfirmation(false));
  document.getElementById("confirmDialogCancelButton").addEventListener("click", () => resolveConfirmation(false));
  confirmDialogConfirmButton.addEventListener("click", () => resolveConfirmation(true));
  confirmDialog.addEventListener("cancel", (event) => { event.preventDefault(); resolveConfirmation(false); });

  function formatDate(value) {
    return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(value));
  }

  function normalizeSession(session) {
    return {
      ...session,
      sourceNote: session.sourceNote || "",
      exercises: (session.exercises || []).map((exercise) => ({
        ...exercise,
        identity: TrainingHistoryTools.identityOf(exercise),
        entries: Array.isArray(exercise.entries) ? exercise.entries.map((entry) => ({ ...entry, id: entry.id || uid(), difficulty: entry.difficulty || "", completed: Boolean(entry.completed) })) : []
      }))
    };
  }

  function readSessionsState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored == null) return { sessions: [], error: "" };
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("El historial no es una lista.");
      if (!parsed.every((session) => session && typeof session === "object" && !Array.isArray(session)
        && String(session.id || "").trim() && Array.isArray(session.exercises))) {
        throw new Error("El historial contiene una sesión no válida.");
      }
      return { sessions: parsed.map(normalizeSession), error: "" };
    } catch (_) {
      return {
        sessions: [],
        error: "El historial local no se puede leer. No se guardó nada; exporta o recupera los datos antes de continuar."
      };
    }
  }

  function readSessions() {
    return readSessionsState().sessions;
  }

  function writeSessions(sessions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (_) {
      toast("No queda espacio para guardar. Exporta el historial antes de continuar.");
      return false;
    }
  }

  function isRestorableActiveSession(session) {
    return Boolean(session && typeof session === "object" && !Array.isArray(session)
      && String(session.id || "").trim() && Array.isArray(session.exercises) && session.finished !== true);
  }

  function writeActiveSessionDraft(session) {
    if (!isRestorableActiveSession(session)) return false;
    try {
      // Keep a complete local checkpoint so Android process eviction cannot depend on the history view.
      localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify({
        schema: ACTIVE_DRAFT_KEY,
        version: 1,
        saved_at: new Date().toISOString(),
        session
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readActiveSessionDraft() {
    const stored = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (stored == null) return null;
    try {
      const parsed = JSON.parse(stored);
      if (!parsed || parsed.schema !== ACTIVE_DRAFT_KEY || parsed.version !== 1 || !isRestorableActiveSession(parsed.session)) {
        throw new Error("Borrador activo no válido.");
      }
      return normalizeSession(parsed.session);
    } catch (_) {
      // Preserve an unreadable value for possible future recovery; never touch normal history here.
      return null;
    }
  }

  function clearActiveSessionDraft() {
    try {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function checkpointActiveSession() {
    if (!activeSession || activeSessionIsHistoricalDraft || activeSession.finished) return true;
    return writeActiveSessionDraft(activeSession);
  }

  function restoreActiveSessionDraft() {
    const draft = readActiveSessionDraft();
    if (!draft) return false;
    activeSession = draft;
    activeSessionIsHistoricalDraft = false;
    renderSession();
    toast("Sesión en curso restaurada.");
    return true;
  }

  function readFeedbackEntries() {
    try {
      return TrainingFeedbackTools.normalizeEntries(JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY)) || []);
    } catch (_) {
      return [];
    }
  }

  function writeFeedbackEntries(entries) {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (_) {
      toast("No se pudo guardar la mejora. El texto sigue abierto para que puedas copiarlo.");
      return false;
    }
  }

  function persistSession() {
    if (!activeSession) return false;
    if (activeSessionIsHistoricalDraft) {
      saveStatus.textContent = "Borrador sin añadir";
      saveStatus.dataset.state = "draft";
      return false;
    }
    // Protect the current input before touching the shared history list.
    const draftSaved = activeSession.finished ? true : writeActiveSessionDraft(activeSession);
    if (activeSession.pendingHistory && !activeSession.finished) {
      saveStatus.textContent = draftSaved ? "Borrador protegido" : "Sin guardar";
      saveStatus.dataset.state = draftSaved ? "draft" : "error";
      return draftSaved;
    }
    // Toda escritura parte de una lectura válida: un historial dañado nunca se trata como uno vacío.
    const state = readSessionsState();
    if (state.error) {
      saveStatus.textContent = draftSaved ? "Borrador protegido" : "Sin guardar";
      saveStatus.dataset.state = draftSaved ? "draft" : "error";
      toast(state.error);
      return false;
    }
    const sessions = state.sessions;
    const index = sessions.findIndex((session) => session.id === activeSession.id);
    if (index >= 0) sessions[index] = activeSession;
    else sessions.unshift(activeSession);
    const saved = writeSessions(sessions);
    if (saved && activeSession.finished) clearActiveSessionDraft();
    if (saveStatus) {
      saveStatus.textContent = saved ? (draftSaved ? "Guardado" : "Guardado sin copia de recuperación") : (draftSaved ? "Borrador protegido" : "Sin guardar");
      saveStatus.dataset.state = saved && draftSaved ? "saved" : (draftSaved ? "draft" : "error");
    }
    return saved;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => { element.hidden = key !== name; });
    document.body.dataset.screen = name;
    const dockWillBeHidden = (name === "session" && activeSessionIsHistoricalDraft)
      || (name !== "session" && document.body.dataset.timerActive !== "true");
    if (dockWillBeHidden) setRestTimerPanel(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (name === "history") {
      renderHistory();
      renderFeedbackHistory();
    }
    if (name === "session" && !activeSessionIsHistoricalDraft) requestWakeLock();
    else releaseWakeLock();
  }

  function toast(message) {
    const element = document.getElementById("toast");
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("visible"), 2800);
  }

  function renderSyncStatus() {
    if (!syncStatusCard) return;
    if (typeof TrainingSync === "undefined") {
      syncStatusCard.dataset.state = "error";
      syncStatusText.textContent = "🔴 Error de conexión";
      syncStatusDetail.textContent = "La sesión está guardada en este móvil, pero no se pudo abrir la cola.";
      retrySyncButton.hidden = false;
      return;
    }
    const status = TrainingSync.summary(focusedSyncEventId);
    syncStatusCard.dataset.state = status.state;
    syncStatusText.textContent = status.label;
    syncStatusDetail.textContent = status.detail;
    retrySyncButton.hidden = !status.can_retry;
  }

  function renderFeedbackHistory() {
    const entries = readFeedbackEntries().slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const list = document.getElementById("feedbackList");
    document.getElementById("feedbackCount").textContent = entries.length;
    document.getElementById("exportFeedbackButton").disabled = entries.length === 0;
    list.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "feedback-empty";
      empty.textContent = "Todavía no has anotado ninguna mejora.";
      list.appendChild(empty);
      return;
    }
    entries.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "feedback-item";
      const title = document.createElement("strong");
      title.textContent = feedbackCategoryLabels[entry.category] || "Comentario de uso";
      const context = document.createElement("span");
      const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at));
      const fieldContext = [entry.exercise_name, entry.set_index ? `serie ${entry.set_index}` : "", entry.field].filter(Boolean).join(" · ");
      context.textContent = [date, entry.screen, entry.session_title, fieldContext].filter(Boolean).join(" · ");
      item.append(title, context);
      if (entry.comment) {
        const comment = document.createElement("p");
        comment.textContent = entry.comment;
        item.appendChild(comment);
      }
      const remove = document.createElement("button");
      remove.className = "feedback-resolve";
      remove.type = "button";
      remove.textContent = "Eliminar como resuelta";
      remove.addEventListener("click", () => { void deleteFeedbackEntry(entry.id); });
      item.appendChild(remove);
      list.appendChild(item);
    });
  }

  async function discardActiveSession() {
    if (!activeSession || activeSessionIsHistoricalDraft) return;
    const accepted = await requestConfirmation({
      title: "Descartar sesión",
      message: "Se eliminará el borrador de esta sesión de este dispositivo. No se añadirá al historial ni se enviará a Google Drive.",
      confirmLabel: "Descartar sesión",
      danger: true
    });
    if (!accepted) return;
    if (!clearActiveSessionDraft()) {
      toast("No se pudo borrar el borrador. La sesión sigue protegida en este dispositivo.");
      return;
    }
    cancelScheduledTimerAlarm();
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerEndsAt = 0;
    restTimerRemaining = 0;
    restTimerTotal = 0;
    restTimerComplete = false;
    closeRestFinishedDialog();
    setRestTimerPanel(false);
    renderRestTimer();
    activeSession = null;
    feedbackFieldContext = { exercise_name: "", set_index: "", field: "" };
    showScreen("import");
    toast("Sesión descartada. No se guardó en el historial.");
  }

  async function deleteFeedbackEntry(entryId) {
    const accepted = await requestConfirmation({
      title: "Eliminar mejora",
      message: "Se eliminará únicamente esta mejora anotada. Esta acción no modifica tu historial de entrenamiento.",
      confirmLabel: "Eliminar como resuelta",
      danger: true
    });
    if (!accepted) return;
    const entries = readFeedbackEntries();
    const selectedIndex = entries.findIndex((entry) => entry.id === entryId);
    if (selectedIndex === -1) return;
    entries.splice(selectedIndex, 1);
    if (!writeFeedbackEntries(entries)) return;
    renderFeedbackHistory();
    toast("Mejora eliminada como resuelta.");
  }

  function openFeedbackDialog() {
    selectedFeedbackCategory = "";
    feedbackComment.value = "";
    feedbackDialog.querySelectorAll("[data-feedback-category]").forEach((button) => button.setAttribute("aria-pressed", "false"));
    if (typeof feedbackDialog.showModal === "function") feedbackDialog.showModal();
    else feedbackDialog.setAttribute("open", "");
  }

  function closeFeedbackDialog() {
    if (typeof feedbackDialog.close === "function") feedbackDialog.close();
    else feedbackDialog.removeAttribute("open");
  }

  function setGemCommandStatus(message, state) {
    gemCommandStatus.textContent = message;
    gemCommandStatus.dataset.state = state || "";
    gemCommandStatus.hidden = !message;
  }

  function openGemCommandDialog() {
    setGemCommandStatus("", "");
    if (typeof gemCommandDialog.showModal === "function") gemCommandDialog.showModal();
    else gemCommandDialog.setAttribute("open", "");
    window.setTimeout(() => gemCommandInput.focus(), 0);
  }

  function closeGemCommandDialog() {
    if (typeof gemCommandDialog.close === "function") gemCommandDialog.close();
    else gemCommandDialog.removeAttribute("open");
  }

  function wakeLockEnabled() {
    return localStorage.getItem(WAKE_LOCK_KEY) !== "false";
  }

  function updateWakeLockStatus() {
    if (!wakeLockEnabled()) wakeLockStatus.textContent = "Desactivada";
    else if (!("wakeLock" in navigator)) wakeLockStatus.textContent = "No compatible";
    else wakeLockStatus.textContent = wakeLock ? "Activa" : "Pendiente";
  }

  async function requestWakeLock() {
    wakeLockToggle.checked = wakeLockEnabled();
    if (!activeSession || screens.session.hidden || !wakeLockEnabled() || !("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLock) {
      updateWakeLockStatus();
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; updateWakeLockStatus(); });
    } catch (_) {
      wakeLock = null;
    }
    updateWakeLockStatus();
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      const lock = wakeLock;
      wakeLock = null;
      try { await lock.release(); } catch (_) {}
    }
    updateWakeLockStatus();
  }

  function formatTimer(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function selectedRestSeconds() {
    return Number(restDuration.value || 120);
  }

  function timerSoundEnabled() {
    return localStorage.getItem(TIMER_SOUND_KEY) !== "false";
  }

  function timerSoundProfile() {
    return TrainingTimerSounds.normalizeProfile(localStorage.getItem(TIMER_SOUND_PROFILE_KEY));
  }

  async function primeTimerAudio(allowCreate) {
    if (!timerSoundEnabled()) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      // A closed context can only be replaced while Start/Preview still owns a user gesture.
      if ((!audioContext || audioContext.state === "closed") && allowCreate) audioContext = new AudioContextClass();
      if (!audioContext || audioContext.state === "closed") return false;
      // This call is deliberately before the first await: Chrome can then associate
      // source.start() with the user's touch and unlock the physical audio output.
      if (allowCreate && !TrainingTimerSounds.unlock(audioContext)) return false;
      if (audioContext.state !== "running" && typeof audioContext.resume === "function") await audioContext.resume();
      return audioContext.state === "running";
    } catch (_) {
      return false;
    }
  }

  async function playTimerAlarm() {
    if (!timerSoundEnabled()) return false;
    if (!audioContext || audioContext.state === "closed") return false;
    try {
      // Starting the source before resume also enables Chrome's auto-resume path
      // if Android suspended the context after the timer was armed.
      const alarm = TrainingTimerSounds.schedule(audioContext, timerSoundProfile(), 0);
      if (!alarm) return false;
      if (immediateTimerAlarm) immediateTimerAlarm.cancel();
      immediateTimerAlarm = alarm;
      if (audioContext.state !== "running" && !await primeTimerAudio(false)) {
        alarm.cancel();
        if (immediateTimerAlarm === alarm) immediateTimerAlarm = null;
        return false;
      }
      // The user may silence or reset while resume() is pending.
      if (!timerSoundEnabled() || immediateTimerAlarm !== alarm) {
        alarm.cancel();
        if (immediateTimerAlarm === alarm) immediateTimerAlarm = null;
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function cancelScheduledTimerAlarm() {
    if (scheduledTimerAlarm) scheduledTimerAlarm.cancel();
    if (immediateTimerAlarm) immediateTimerAlarm.cancel();
    scheduledTimerAlarm = null;
    immediateTimerAlarm = null;
  }

  function armTimerAlarm() {
    cancelScheduledTimerAlarm();
    if (!timerSoundEnabled() || !restTimerEndsAt || !audioContext || audioContext.state !== "running") return false;
    const delay = Math.max(0.03, (restTimerEndsAt - Date.now()) / 1000);
    scheduledTimerAlarm = TrainingTimerSounds.schedule(audioContext, timerSoundProfile(), delay);
    return Boolean(scheduledTimerAlarm);
  }

  function renderRestTimer() {
    // The pure snapshot keeps the visible timer consistent after background suspension.
    const timer = TrainingRestTimerTools.snapshot({
      endsAt: restTimerEndsAt,
      remaining: restTimerRemaining,
      total: restTimerTotal,
      complete: restTimerComplete,
      selectedSeconds: selectedRestSeconds()
    });
    const { remaining, total, ratio, status: state, stage } = timer;
    const statusLabels = { idle: "Descanso", running: "Descansando", paused: "Pausado", complete: "Listo" };
    const visibleActions = { idle: "Iniciar", running: "Pausar", paused: "Continuar", complete: "Repetir" };
    const actionLabels = { idle: "Iniciar descanso", running: "Pausar descanso", paused: "Continuar descanso", complete: "Iniciar otro descanso" };
    restTimerDisplay.textContent = formatTimer(remaining);
    if (state !== lastAnnouncedRestState) {
      restTimerStatus.textContent = statusLabels[state];
      lastAnnouncedRestState = state;
    }
    restTimerAction.textContent = visibleActions[state];
    restTimerButton.setAttribute("aria-label", actionLabels[state]);
    restDock.dataset.state = state;
    restDock.dataset.stage = stage;
    document.body.dataset.timerActive = state === "idle" ? "false" : "true";
    // One CSS percentage drives the curtain, its luminous edge, and the compact bar.
    // Keeping the geometry in CSS avoids layout work during the countdown.
    document.body.style.setProperty("--timer-progress", `${(ratio * 100).toFixed(2)}%`);
    restAmbient.dataset.state = state;
    restAmbient.dataset.stage = stage;
    restTimerProgressTrack.setAttribute("aria-valuemax", String(Math.ceil(total)));
    restTimerProgressTrack.setAttribute("aria-valuenow", String(Math.ceil(remaining)));
    restTimerProgressTrack.setAttribute("aria-valuetext", `${formatTimer(remaining)} restantes`);
    const canAdjust = state !== "idle" && state !== "complete";
    restTimerAdd.disabled = !canAdjust;
    if (restTimerSubtract) restTimerSubtract.disabled = !canAdjust;
  }

  function renderRestFinishedElapsed() {
    if (!restFinishedAt) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - restFinishedAt) / 1000));
    restFinishedDialogElapsed.textContent = formatTimer(elapsed);
  }

  function showRestFinishedDialog() {
    if (restFinishedDialog.open) return;
    restFinishedAt = Date.now();
    renderRestFinishedElapsed();
    clearInterval(restFinishedElapsedInterval);
    restFinishedElapsedInterval = setInterval(renderRestFinishedElapsed, 1000);
    if (typeof restFinishedDialog.showModal === "function") restFinishedDialog.showModal();
    else restFinishedDialog.setAttribute("open", "");
    requestAnimationFrame(() => document.getElementById("restFinishedDialogCloseButton").focus());
  }

  function closeRestFinishedDialog() {
    clearInterval(restFinishedElapsedInterval);
    restFinishedElapsedInterval = null;
    restFinishedAt = 0;
    if (!restFinishedDialog.open) return;
    if (typeof restFinishedDialog.close === "function") restFinishedDialog.close();
    else restFinishedDialog.removeAttribute("open");
  }

  async function finishRestTimer() {
    if (restTimerComplete) return;
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerEndsAt = 0;
    restTimerRemaining = 0;
    restTimerComplete = true;
    renderRestTimer();
    if (typeof showRestFinishedDialog === "function") showRestFinishedDialog();
    if (navigator.vibrate) navigator.vibrate([180, 100, 180]);
    // A running context already has the alarm queued on its own accurate clock.
    const playedAsScheduled = Boolean(
      scheduledTimerAlarm
      && audioContext
      && audioContext.currentTime >= scheduledTimerAlarm.startsAt - 0.02
    );
    // If Android paused the audio clock, the queued alarm may still be in its future.
    // Cancel it before the immediate fallback so it cannot sound late or twice.
    if (!playedAsScheduled) cancelScheduledTimerAlarm();
    else if (audioContext.currentTime >= scheduledTimerAlarm.endsAt + 0.02) scheduledTimerAlarm = null;
    const played = playedAsScheduled || await playTimerAlarm();
    toast(played || !timerSoundEnabled() ? "Descanso terminado" : "Descanso terminado · audio bloqueado; prueba el sonido en opciones.");
  }

  async function tickRestTimer() {
    if (restTimerEndsAt && restTimerEndsAt <= Date.now()) await finishRestTimer();
    else renderRestTimer();
  }

  async function toggleRestTimer() {
    if (restTimerEndsAt) {
      const remaining = TrainingRestTimerTools.pausedSeconds(restTimerEndsAt, Date.now());
      if (remaining <= 0) { await finishRestTimer(); return; }
      restTimerRemaining = remaining;
      restTimerEndsAt = 0;
      cancelScheduledTimerAlarm();
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      renderRestTimer();
      return;
    }
    const seconds = restTimerRemaining || selectedRestSeconds();
    restTimerComplete = false;
    restTimerTotal = restTimerTotal || seconds;
    // Start priming under the gesture, but never delay the visible countdown.
    const audioReady = primeTimerAudio(true);
    restTimerEndsAt = Date.now() + seconds * 1000;
    restTimerInterval = setInterval(tickRestTimer, 250);
    if (navigator.vibrate) navigator.vibrate(25);
    renderRestTimer();
    void audioReady.then((ready) => {
      if (ready && restTimerEndsAt) armTimerAlarm();
      else if (!ready && timerSoundEnabled()) toast("Sonido no preparado. Pulsa Probar sonido en las opciones.");
    });
  }

  async function addRestTime(deltaSeconds) {
    if (!restTimerEndsAt && !restTimerRemaining) return;
    cancelScheduledTimerAlarm();
    const audioReady = restTimerEndsAt && timerSoundEnabled() ? primeTimerAudio(true) : Promise.resolve(false);
    const adjust = TrainingRestTimerTools.adjust || TrainingRestTimerTools.extend;
    const adjusted = adjust({
      endsAt: restTimerEndsAt,
      remaining: restTimerRemaining,
      total: restTimerTotal,
      selectedSeconds: selectedRestSeconds()
    }, deltaSeconds, Date.now());
    restTimerEndsAt = adjusted.endsAt;
    restTimerRemaining = adjusted.remaining;
    restTimerTotal = adjusted.total;
    if (adjusted.reachedZero) {
      await finishRestTimer();
      return;
    }
    restTimerComplete = false;
    const targetEndsAt = restTimerEndsAt;
    void audioReady.then((ready) => {
      if (ready && targetEndsAt && restTimerEndsAt === targetEndsAt) armTimerAlarm();
    });
    renderRestTimer();
    const sign = deltaSeconds < 0 ? "−" : "+";
    toast(`${sign}${Math.abs(deltaSeconds)} s de descanso`);
  }

  function setRestTimerPanel(open) {
    restTimerPanel.hidden = !open;
    restTimerOptions.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.dataset.timerPanel = open ? "open" : "closed";
  }

  function updateKeyboardViewport() {
    const viewport = window.visualViewport;
    const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    document.documentElement.style.setProperty("--keyboard-offset", `${Math.round(offset)}px`);
    const editable = document.activeElement && document.activeElement.matches('textarea, input:not([type="checkbox"])');
    document.body.dataset.keyboard = editable || offset > 100 ? "open" : "closed";
  }

  function makeSession(parsed, sourceNote) {
    const previousSessions = readSessions();
    return {
      id: uid(),
      title: parsed.title,
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finished: false,
      sourceNote,
      exercises: parsed.exercises.map((exercise) => {
        const inferred = TrainingExerciseMetadata.infer(exercise);
        const inherited = TrainingHistoryTools.latestIdentity(exercise.name, previousSessions);
        return {
          ...exercise,
          identity: TrainingExerciseMetadata.combine(inferred, inherited),
          note: "",
          catalogId: exercise.catalogId || "",
          slotId: exercise.slotId || "",
          recommendedAlternativeIds: exercise.recommendedAlternativeIds || [],
          entries: Array.from({ length: exercise.sets }, () => ({ id: uid(), load: "", difficulty: "", reps: "", rir: "", completed: false }))
        };
      })
    };
  }

  function catalogExercise(catalogItem, prescription) {
    const item = catalogItem || {};
    const details = prescription || {};
    const defaults = { name: item.name || details.name || "Ejercicio libre", identity: { resistanceMode: item.resistanceMode || "external", variant: item.variant || "", settings: "", loadBasis: item.loadBasis || "unknown", detected: false } };
    const previous = TrainingHistoryTools.latestRecordedExercise(defaults, readSessions(), new Date().toISOString());
    return {
      name: item.name || details.name || "Ejercicio libre", catalogId: item.id || "", slotId: details.slotId || "",
      sets: Number(details.sets) || 1, repsMin: details.repsMin ?? null, repsMax: details.repsMax ?? null,
      targetRir: details.targetRir || "", rest: details.rest || "", cue: details.cue || "", perSide: Boolean(details.perSide),
      recommendedAlternativeIds: details.recommendedAlternativeIds || [],
      identity: previous ? { ...TrainingHistoryTools.identityOf(previous.exercise), detected: false } : defaults.identity, note: "",
      entries: Array.from({ length: Number(details.sets) || 1 }, () => ({ id: uid(), load: "", difficulty: "", reps: "", rir: "", completed: false }))
    };
  }

  function startTemplate(day) {
    const blueprint = TrainingDayTemplates.TEMPLATES[day];
    if (!blueprint || !TrainingDayTemplates.validate(blueprint, TrainingExerciseCatalog.byId)) return;
    activeSessionIsHistoricalDraft = false;
    activeSession = { id: uid(), title: blueprint.title, date: new Date().toISOString(), updatedAt: new Date().toISOString(), finished: false, pendingHistory: true, sourceNote: "", templateId: blueprint.id, exercises: blueprint.exercises.map((slot) => catalogExercise(TrainingExerciseCatalog.find(slot.catalogId), slot)) };
    persistSession(); renderSession(); toast(`${blueprint.exercises.length} ejercicios preparados.`);
  }

  function prescriptionPills(exercise) {
    const hasReps = exercise.repsMin != null && exercise.repsMax != null;
    const reps = hasReps ? (exercise.repsMin === exercise.repsMax ? exercise.repsMin : `${exercise.repsMin}–${exercise.repsMax}`) : "";
    const values = [
      exercise.sets ? `${exercise.sets} series` : "",
      hasReps ? `${reps} reps${exercise.perSide ? " · por lado" : ""}` : "",
      exercise.targetRir ? `RIR ${exercise.targetRir}` : "",
      exercise.rest ? `Descanso ${exercise.rest}` : ""
    ].filter(Boolean);
    return values.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join("");
  }

  function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  function setInput(type, placeholder, value, label, exerciseIndex, setIndex) {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = type === "load" ? "decimal" : type === "difficulty" ? "text" : "numeric";
    input.placeholder = placeholder;
    input.value = value || "";
    input.setAttribute("aria-label", label);
    input.dataset.field = type;
    input.dataset.exercise = exerciseIndex;
    input.dataset.set = setIndex;
    input.autocomplete = "off";
    return input;
  }

  function closeRirPickers(except) {
    exerciseList.querySelectorAll('.rir-picker[data-open="true"]').forEach((picker) => {
      if (picker === except) return;
      picker.dataset.open = "false";
      picker.classList.remove("drop-up");
      const row = picker.closest(".set-row");
      if (row) row.classList.remove("has-open-picker");
      picker.querySelector(".rir-trigger").setAttribute("aria-expanded", "false");
      picker.querySelector(".rir-options").hidden = true;
    });
  }

  function setRirPickerOpen(picker, open) {
    closeRirPickers(open ? picker : null);
    picker.dataset.open = open ? "true" : "false";
    const row = picker.closest(".set-row");
    if (row) row.classList.toggle("has-open-picker", open);
    if (open) {
      const rect = picker.getBoundingClientRect();
      const dropUp = rect.bottom + 65 > window.innerHeight;
      picker.classList.toggle("drop-up", dropUp);
    } else {
      picker.classList.remove("drop-up");
    }
    picker.querySelector(".rir-trigger").setAttribute("aria-expanded", open ? "true" : "false");
    picker.querySelector(".rir-options").hidden = !open;
  }

  function rirPicker(value, label, exerciseIndex, setIndex) {
    const picker = document.createElement("div");
    picker.className = "rir-picker";
    picker.dataset.open = "false";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "rir-trigger";
    trigger.dataset.field = "rir";
    trigger.dataset.exercise = exerciseIndex;
    trigger.dataset.set = setIndex;
    trigger.setAttribute("aria-label", label);
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    trigger.textContent = String(value || "") || "—";
    const options = document.createElement("div");
    options.className = "rir-options";
    options.hidden = true;
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", `${label}: elegir valor`);
    ["", "0", "1", "2", "3", "4"].forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rir-option";
      button.dataset.rirValue = option;
      button.dataset.exercise = exerciseIndex;
      button.dataset.set = setIndex;
      button.setAttribute("aria-label", option ? `RIR ${option}` : "Borrar RIR");
      button.setAttribute("aria-pressed", String(value || "") === option ? "true" : "false");
      button.textContent = option || "—";
      options.append(button);
    });
    picker.append(trigger, options);
    return picker;
  }

  function resistanceConfig(exercise) {
    const mode = TrainingHistoryTools.identityOf(exercise).resistanceMode;
    if (mode === "trx") return { mode, field: "difficulty", label: "Posición TRX", placeholder: "pies marca 3" };
    if (mode === "bodyweight") return { mode, field: "difficulty", label: "Variante / ayuda", placeholder: "banda, apoyo, +kg" };
    return { mode: "external", field: "load", label: "Carga", placeholder: "kg" };
  }

  function identityTitle(identity) {
    const modeLabels = { external: "carga", bodyweight: "autocarga", trx: "TRX" };
    const values = [modeLabels[identity.resistanceMode], identity.variant, identity.settings].filter(Boolean);
    const identified = identity.resistanceMode !== "external" || identity.variant || identity.settings || identity.loadBasis !== "unknown";
    if (!identified) return "Identificar variante y máquina";
    return `${identity.detected ? "Detectado" : "Identidad"}: ${values.join(" · ") || "carga identificada"}`;
  }

  function referenceSetText(entry, mode) {
    const parts = [];
    if (mode === "external" && String(entry.load || "").trim()) parts.push(`${entry.load} kg`);
    if (mode !== "external" && String(entry.difficulty || "").trim()) parts.push(entry.difficulty);
    if (String(entry.reps || "").trim()) parts.push(`× ${entry.reps}`);
    if (String(entry.rir || "").trim()) parts.push(`@${entry.rir}`);
    return parts.join(" ");
  }

  function renderComparable(exerciseIndex, card) {
    const exercise = activeSession.exercises[exerciseIndex];
    const panel = card.querySelector(".last-reference");
    const historyElement = panel.querySelector(".reference-history");
    const button = panel.querySelector("button");
    button.dataset.referenceAction = "loads";
    button.textContent = "Usar referencia";
    const setReferenceLines = (lines) => {
      historyElement.replaceChildren(...lines.map((line) => {
        const item = document.createElement("span");
        item.textContent = line;
        return item;
      }));
    };
    if (exercise.workoutNoteReference) {
      const record = exercise.workoutNoteReference.record;
      if (!record) setReferenceLines(["Nota del entrenador: sin referencia comparable."]);
      else {
        const sets = (record.sets || []).map((entry) => entry.rawText).filter(Boolean).join(" · ");
        const date = record.rawDate ? ` · ${record.rawDate}` : "";
        setReferenceLines([`Referencia de la nota: ${sets || "datos parciales"}${date}`]);
      }
      button.hidden = true;
      return;
    }
    if (activeSessionIsHistoricalDraft) {
      setReferenceLines(["Las referencias no se copian al añadir una sesión antigua."]);
      button.hidden = true;
      return;
    }
    const references = TrainingHistoryTools.findComparableHistory(activeSession, exerciseIndex, readSessions(), 3);
    button.dataset.exercise = exerciseIndex;
    if (!references.length) {
      const previous = TrainingHistoryTools.latestRecordedExercise(exercise, readSessions(), activeSession.date, activeSession.id);
      setReferenceLines([previous ? "Hay registros de este ejercicio con otra identidad. Comprueba la máquina, los ajustes y la forma de contar la carga." : "Sin una referencia comparable anterior."]);
      button.hidden = !previous;
      if (previous) { button.dataset.referenceAction = "identity"; button.textContent = "Recuperar identidad anterior"; }
      return;
    }
    setReferenceLines(references.map((reference, index) => {
      const mode = TrainingHistoryTools.identityOf(reference.exercise).resistanceMode;
      const sets = reference.exercise.entries.map((entry) => referenceSetText(entry, mode)).filter(Boolean).join(" · ");
      const date = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(new Date(reference.session.date));
      return `${index === 0 ? "Última comparable" : `Anterior ${index + 1}`} · ${date}: ${sets}`;
    }));
    button.hidden = false;
  }

  function renderSession() {
    if (!activeSession) return;
    feedbackFieldContext = {};
    document.body.dataset.historicalDraft = activeSessionIsHistoricalDraft ? "true" : "false";
    document.getElementById("sessionTitle").textContent = activeSession.title;
    document.getElementById("sessionDate").textContent = formatDate(activeSession.date);
    historicalDraftBanner.hidden = !activeSessionIsHistoricalDraft;
    const finishButton = document.getElementById("finishButton");
    const editButton = document.getElementById("editNoteButton");
    const discardButton = document.getElementById("discardSessionButton");
    document.querySelector(".session-tools").hidden = activeSessionIsHistoricalDraft;
    document.getElementById("shareJsonButton").hidden = activeSessionIsHistoricalDraft;
    document.getElementById("downloadPdfButton").hidden = activeSessionIsHistoricalDraft;
    discardButton.hidden = activeSessionIsHistoricalDraft;
    if (activeSessionIsHistoricalDraft) {
      historicalPreviewDate.value = String(activeSession.date || "").slice(0, 10);
      historicalPreviewTitle.value = activeSession.title;
      finishButton.textContent = "Añadir al historial";
      editButton.setAttribute("aria-label", "Volver al texto histórico");
      editButton.title = "Volver al texto histórico";
      saveStatus.textContent = "Borrador sin añadir";
      saveStatus.dataset.state = "draft";
    } else {
      finishButton.textContent = "Finalizar sesión";
      editButton.setAttribute("aria-label", "Volver a la nota");
      editButton.title = "Volver a la nota";
      saveStatus.textContent = "Guardado";
      saveStatus.dataset.state = "saved";
    }
    document.getElementById("exerciseCount").textContent = activeSession.exercises.length;
    exerciseList.innerHTML = "";

    activeSession.exercises.forEach((exercise, exerciseIndex) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".exercise-card");
      card.dataset.exerciseCard = exerciseIndex;
      const completedSets = exercise.entries.filter((entry) => entry.completed).length;
      card.dataset.progress = completedSets === exercise.entries.length && exercise.entries.length
        ? "complete"
        : completedSets
          ? "active"
          : "idle";
      fragment.querySelector(".exercise-number").textContent = String(exerciseIndex + 1).padStart(2, "0");
      fragment.querySelector(".exercise-name").textContent = exercise.name;
      fragment.querySelector(".substitute-exercise").dataset.exercise = exerciseIndex;
      fragment.querySelector(".delete-exercise").dataset.exercise = exerciseIndex;
      fragment.querySelector(".prescription").innerHTML = prescriptionPills(exercise);
      const cue = fragment.querySelector(".coach-cue");
      if (exercise.cue) { cue.textContent = exercise.cue; cue.hidden = false; }

      const identity = TrainingHistoryTools.identityOf(exercise);
      const identityDetails = fragment.querySelector(".exercise-identity");
      identityDetails.dataset.detected = identity.detected ? "true" : "false";
      identityDetails.querySelector("summary").textContent = identityTitle(identity);
      const resistanceMode = fragment.querySelector(".identity-resistance-mode");
      const variant = fragment.querySelector(".identity-variant");
      const settings = fragment.querySelector(".identity-settings");
      const loadBasis = fragment.querySelector(".identity-load-basis");
      resistanceMode.value = identity.resistanceMode;
      variant.value = identity.variant;
      settings.value = identity.settings;
      loadBasis.value = identity.loadBasis;
      loadBasis.disabled = identity.resistanceMode !== "external";
      [resistanceMode, variant, settings, loadBasis].forEach((input) => { input.dataset.exercise = exerciseIndex; });

      const resistance = resistanceConfig(exercise);
      fragment.querySelector(".variable-label").textContent = resistance.label;

      const rows = fragment.querySelector(".set-rows");
      exercise.entries.forEach((entry, setIndex) => {
        const row = document.createElement("div");
        row.className = "set-row";
        row.dataset.completed = entry.completed ? "true" : "false";
        const index = document.createElement("span");
        index.className = "set-index";
        index.textContent = setIndex + 1;
        row.append(
          index,
          setInput(resistance.field, resistance.placeholder, entry[resistance.field], `${resistance.label} de la serie ${setIndex + 1}`, exerciseIndex, setIndex),
          setInput("reps", "reps", entry.reps, `Repeticiones de la serie ${setIndex + 1}`, exerciseIndex, setIndex),
          rirPicker(entry.rir, `RIR de la serie ${setIndex + 1}`, exerciseIndex, setIndex)
        );
        const completedLabel = document.createElement("label"); completedLabel.className = "set-complete";
        const completed = document.createElement("input"); completed.type = "checkbox"; completed.checked = Boolean(entry.completed); completed.dataset.field = "completed"; completed.dataset.exercise = exerciseIndex; completed.dataset.set = setIndex; completed.setAttribute("aria-label", `Completar serie ${setIndex + 1}`);
        const completedVisual = document.createElement("span"); completedVisual.className = "set-complete-visual"; completedVisual.setAttribute("aria-hidden", "true");
        completedLabel.append(completed, completedVisual);
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-set-button no-print"; remove.dataset.exercise = exerciseIndex; remove.dataset.set = setIndex; remove.textContent = "×"; remove.setAttribute("aria-label", `Borrar serie ${setIndex + 1}`);
        row.append(completedLabel, remove);
        rows.appendChild(row);
      });
      const addSet = fragment.querySelector(".add-set-button"); addSet.dataset.exercise = exerciseIndex;

      const note = fragment.querySelector(".movement-note textarea");
      note.value = exercise.note || "";
      note.dataset.exercise = exerciseIndex;
      renderComparable(exerciseIndex, card);
      TrainingTechnicalTools.mount(card, exercise, TrainingTechnicalData, TrainingExerciseCatalog.CATALOG);
      exerciseList.appendChild(fragment);
    });
      updateProgress();
      wakeLockToggle.checked = wakeLockEnabled();
      timerSoundToggle.checked = timerSoundEnabled();
      updateWakeLockStatus();
    renderRestTimer();
    showScreen("session");
  }

  function updateProgress() {
    if (!activeSession) return;
    const entries = activeSession.exercises.flatMap((exercise) => exercise.entries);
    const completed = entries.filter((entry) => entry.completed).length;
    document.getElementById("setCount").textContent = entries.length;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("progressBar").style.width = `${entries.length ? (completed / entries.length) * 100 : 0}%`;
  }

  function openExercisePicker(target) {
    pickerTarget = target; pickerGroupFilter = ""; exercisePickerSearch.value = "";
    document.getElementById("exercisePickerTitle").textContent = target.type === "replace" ? "Sustituir ejercicio" : "Añadir ejercicio";
    renderExercisePicker(); exercisePickerDialog.showModal(); exercisePickerSearch.focus();
  }
  function renderExercisePicker() {
    const current = pickerTarget && pickerTarget.type === "replace" ? activeSession.exercises[pickerTarget.exerciseIndex] : null;
    const preferred = current ? current.recommendedAlternativeIds || [] : [];
    const results = TrainingExerciseCatalog.search(exercisePickerSearch.value, pickerGroupFilter, localStorage);
    const recommended = document.getElementById("exercisePickerRecommended");
    recommended.hidden = preferred.length === 0;
    recommended.innerHTML = "";
    preferred.map((id) => TrainingExerciseCatalog.find(id, localStorage)).filter(Boolean).forEach((item) => recommended.appendChild(pickerButton(item, "Recomendada")));
    const groups = document.getElementById("exercisePickerGroups"); groups.innerHTML = "";
    ["Todos", ...new Set(TrainingExerciseCatalog.CATALOG.map((item) => item.group))].forEach((group) => {
      const filter = group === "Todos" ? "" : group;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker-group";
      button.textContent = group;
      button.setAttribute("aria-pressed", pickerGroupFilter === filter ? "true" : "false");
      button.addEventListener("click", () => { pickerGroupFilter = filter; renderExercisePicker(); });
      groups.appendChild(button);
    });
    const list = document.getElementById("exercisePickerResults"); list.innerHTML = ""; results.forEach((item) => list.appendChild(pickerButton(item)));
  }
  function pickerButton(item, label) {
    const button = document.createElement("button"); button.type = "button"; button.className = "picker-exercise"; button.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(label || item.group)} · ${escapeHtml(item.sourceLoadBasis || item.loadBasis)}</span>`;
    button.addEventListener("click", () => selectPickerExercise(item)); return button;
  }
  function selectPickerExercise(item) {
    if (!activeSession || !pickerTarget) return;
    if (pickerTarget.type === "replace") {
      const existing = activeSession.exercises[pickerTarget.exerciseIndex];
      activeSession.exercises[pickerTarget.exerciseIndex] = catalogExercise(item, { ...existing, catalogId: item.id, recommendedAlternativeIds: existing.recommendedAlternativeIds });
    } else activeSession.exercises.push(catalogExercise(item, {}));
    activeSession.updatedAt = new Date().toISOString(); persistSession(); exercisePickerDialog.close(); renderSession();
  }
  document.querySelectorAll("[data-template-day]").forEach((button) => button.addEventListener("click", () => startTemplate(button.dataset.templateDay)));
  document.getElementById("startFreeSessionButton").addEventListener("click", () => { activeSessionIsHistoricalDraft = false; activeSession = { id: uid(), title: "Sesión en vivo", date: new Date().toISOString(), updatedAt: new Date().toISOString(), finished: false, pendingHistory: true, sourceNote: "", exercises: [] }; persistSession(); renderSession(); openExercisePicker({ type: "add" }); });
  document.getElementById("addExerciseButton").addEventListener("click", () => openExercisePicker({ type: "add" }));
  document.getElementById("exercisePickerCloseButton").addEventListener("click", () => exercisePickerDialog.close());
  exercisePickerSearch.addEventListener("input", renderExercisePicker);
  const exercisePickerCustomForm = document.getElementById("exercisePickerCustomForm");
  const exercisePickerCustomInput = document.getElementById("exercisePickerCustomInput");

  function addCustomExercise() {
    const name = exercisePickerCustomInput.value.trim();
    if (!name) { exercisePickerCustomInput.focus(); return; }
    const item = { id: `custom-${uid()}`, name, group: "Personalizado", sourceLoadBasis: "unknown", resistanceMode: "external", variant: "", loadBasis: "unknown" };
    const custom = TrainingExerciseCatalog.readCustom(localStorage);
    custom.push(item);
    TrainingExerciseCatalog.writeCustom(custom, localStorage);
    exercisePickerCustomForm.hidden = true;
    exercisePickerCustomInput.value = "";
    selectPickerExercise(item);
  }

  document.getElementById("exercisePickerCustomButton").addEventListener("click", () => {
    exercisePickerCustomForm.hidden = !exercisePickerCustomForm.hidden;
    if (!exercisePickerCustomForm.hidden) {
      exercisePickerCustomInput.value = "";
      exercisePickerCustomInput.focus();
    }
  });
  document.getElementById("exercisePickerCustomConfirm").addEventListener("click", addCustomExercise);
  exercisePickerCustomInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addCustomExercise(); } });

  function parseNote() {
    const note = noteInput.value.trim();
    localStorage.setItem(DRAFT_KEY, note);
    const parsed = TrainingParser.parseWorkout(note);
    if (parsed.error) { toast(parsed.error); return; }
    activeSessionIsHistoricalDraft = false;
    activeSession = makeSession(parsed, note);
    persistSession();
    renderSession();
    toast(`${parsed.exercises.length} ejercicios preparados`);
  }

  document.addEventListener("workout-note:confirm", (event) => {
    const detail = event.detail || {};
    if (!detail.parsed || !Array.isArray(detail.parsed.exercises) || !detail.parsed.exercises.length) return;
    localStorage.setItem(DRAFT_KEY, detail.sourceNote || "");
    activeSessionIsHistoricalDraft = false;
    activeSession = makeSession(detail.parsed, detail.sourceNote || "");
    activeSession.pendingHistory = true;
    persistSession();
    renderSession();
    toast(`${detail.parsed.exercises.length} ejercicios listos para registrar`);
  });

  function renderHistory() {
    const list = document.getElementById("historyList");
    const sessions = readSessions().slice().sort((left, right) => Date.parse(right.date || 0) - Date.parse(left.date || 0));
    list.innerHTML = "";
    if (!sessions.length) {
      list.innerHTML = '<div class="empty-history">Todavía no hay entrenamientos guardados.</div>';
      return;
    }
    sessions.forEach((session) => {
      const item = document.createElement("article");
      item.className = "history-item";
      const total = session.exercises.flatMap((exercise) => exercise.entries).length;
      const completed = session.exercises.flatMap((exercise) => exercise.entries).filter((entry) => String(entry.reps).trim()).length;
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "history-open";
      openButton.setAttribute("aria-label", `Abrir ${session.title || "entrenamiento"}`);
      openButton.innerHTML = `<div><strong>${escapeHtml(session.title)}</strong><span>${escapeHtml(formatDate(session.date))} · ${completed}/${total} series</span></div><b aria-hidden="true">→</b>`;
      openButton.addEventListener("click", () => {
        activeSessionIsHistoricalDraft = false;
        activeSession = session;
        checkpointActiveSession();
        renderSession();
      });
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "history-delete";
      deleteButton.setAttribute("aria-label", `Eliminar ${session.title || "entrenamiento"}`);
      deleteButton.textContent = "Eliminar";
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        void deleteSession(session.id);
      });
      item.append(openButton, deleteButton);
      list.appendChild(item);
    });
  }

  async function deleteSession(sessionId) {
    const state = readSessionsState();
    if (state.error) {
      toast(state.error);
      return false;
    }
    const targetId = String(sessionId || "").trim();
    const index = state.sessions.findIndex((session) => session.id === targetId);
    if (index < 0) {
      toast("No se encontró el entrenamiento seleccionado.");
      return false;
    }
    if (!await requestConfirmation({
      title: "Eliminar entrenamiento",
      message: "Se eliminará este entrenamiento del historial local. Esta acción no afecta a otros registros.",
      confirmLabel: "Eliminar",
      danger: true
    })) return false;
    const sessions = state.sessions.slice();
    sessions.splice(index, 1);
    if (!writeSessions(sessions)) return false;
    if (activeSession && activeSession.id === targetId) {
      clearActiveSessionDraft();
      activeSession = null;
      activeSessionIsHistoricalDraft = false;
    }
    renderHistory();
    toast("Entrenamiento eliminado.");
    return true;
  }

  async function importHistoryFile(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const state = readSessionsState();
      if (state.error) throw new Error(state.error);
      const merged = TrainingHistoryTools.mergePayload(state.sessions, payload);
      if (!merged.added && !merged.updated) {
        toast(`${merged.incoming} sesiones revisadas; el historial ya estaba actualizado.`);
        return;
      }
      const message = `Se añadirán ${merged.added} sesiones y se actualizarán ${merged.updated}. No se borrará ninguna sesión local.`;
      if (!await requestConfirmation({ title: "Restaurar historial", message, confirmLabel: "Restaurar" })) return;
      if (!writeSessions(merged.sessions)) return;
      renderHistory();
      toast(`Historial restaurado: ${merged.added} nuevas, ${merged.updated} actualizadas.`);
    } catch (error) {
      console.error(error);
      toast(error && error.message ? error.message : "No se pudo importar el historial.");
    } finally {
      historyFileInput.value = "";
    }
  }

  exerciseList.addEventListener("input", async (event) => {
    if (!activeSession) return;
    const target = event.target;
    const exerciseIndex = Number(target.dataset.exercise);
    if (!Number.isInteger(exerciseIndex)) return;
    if (target.matches(".movement-note textarea")) activeSession.exercises[exerciseIndex].note = target.value;
    else if (target.matches("[data-identity-field]")) {
      const identity = activeSession.exercises[exerciseIndex].identity;
      if (target.dataset.identityField === "resistanceMode" && target.value !== identity.resistanceMode) {
        const incompatibleField = target.value === "external" ? "difficulty" : "load";
        const hasIncompatibleValues = activeSession.exercises[exerciseIndex].entries.some((entry) => String(entry[incompatibleField] || "").trim());
        if (hasIncompatibleValues) {
          const label = incompatibleField === "load" ? "las cargas" : "las dificultades";
          const accepted = await requestConfirmation({
            title: "Cambiar tipo de resistencia",
            message: `Cambiar el tipo de resistencia borrará ${label} ya anotadas para evitar datos incompatibles.`,
            confirmLabel: "Cambiar y borrar",
            danger: true
          });
          if (!accepted) {
            target.value = identity.resistanceMode;
            return;
          }
          activeSession.exercises[exerciseIndex].entries.forEach((entry) => { entry[incompatibleField] = ""; });
        }
      }
      identity[target.dataset.identityField] = target.value;
      identity.detected = false;
      if (target.dataset.identityField === "resistanceMode" && target.value !== "external") identity.loadBasis = "unknown";
    }
    else if (target.matches("[data-field]")) {
      const setIndex = Number(target.dataset.set);
      activeSession.exercises[exerciseIndex].entries[setIndex][target.dataset.field] = target.dataset.field === "completed" ? target.checked : target.value;
    }
    activeSession.updatedAt = new Date().toISOString();
    persistSession();
    updateProgress();
    if (target.matches("[data-identity-field]")) {
      if (target.dataset.identityField === "resistanceMode") {
        const scrollY = window.scrollY;
        renderSession();
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
        toast("Campos de registro adaptados al tipo de resistencia.");
        return;
      }
      const card = exerciseList.querySelector(`[data-exercise-card="${exerciseIndex}"]`);
      if (card) {
        const identity = TrainingHistoryTools.identityOf(activeSession.exercises[exerciseIndex]);
        const details = card.querySelector(".exercise-identity");
        details.dataset.detected = "false";
        details.querySelector("summary").textContent = identityTitle(identity);
        renderComparable(exerciseIndex, card);
      }
    }
  });

  exerciseList.addEventListener("click", (event) => {
    const rirOption = event.target.closest(".rir-option");
    if (rirOption && activeSession) {
      const exerciseIndex = Number(rirOption.dataset.exercise);
      const setIndex = Number(rirOption.dataset.set);
      const exercise = activeSession.exercises[exerciseIndex];
      if (!exercise || !exercise.entries[setIndex]) return;
      const value = rirOption.dataset.rirValue || "";
      exercise.entries[setIndex].rir = value;
      activeSession.updatedAt = new Date().toISOString();
      persistSession();
      updateProgress();
      const picker = rirOption.closest(".rir-picker");
      picker.querySelector(".rir-trigger").textContent = value || "—";
      picker.querySelectorAll(".rir-option").forEach((option) => {
        option.setAttribute("aria-pressed", option === rirOption ? "true" : "false");
      });
      setRirPickerOpen(picker, false);
      picker.querySelector(".rir-trigger").focus();
      return;
    }
    const rirTrigger = event.target.closest(".rir-trigger");
    if (rirTrigger) {
      const picker = rirTrigger.closest(".rir-picker");
      setRirPickerOpen(picker, picker.dataset.open !== "true");
      return;
    }
    const remove = event.target.closest(".remove-set-button");
    if (remove && activeSession) {
      const exercise = activeSession.exercises[Number(remove.dataset.exercise)];
      if (exercise && exercise.entries.length > 1) { exercise.entries.splice(Number(remove.dataset.set), 1); activeSession.updatedAt = new Date().toISOString(); persistSession(); renderSession(); }
      else toast("Debe quedar al menos una serie.");
      return;
    }
    const add = event.target.closest(".add-set-button");
    if (add && activeSession) { const exercise = activeSession.exercises[Number(add.dataset.exercise)]; exercise.entries.push({ id: uid(), load: "", difficulty: "", reps: "", rir: "", completed: false }); activeSession.updatedAt = new Date().toISOString(); persistSession(); renderSession(); return; }
    const substitute = event.target.closest(".substitute-exercise");
    if (substitute && activeSession) { openExercisePicker({ type: "replace", exerciseIndex: Number(substitute.dataset.exercise) }); return; }
    const deleteExercise = event.target.closest(".delete-exercise");
    if (deleteExercise && activeSession) {
      const exerciseIndex = Number(deleteExercise.dataset.exercise);
      const exercise = activeSession.exercises[exerciseIndex];
      if (exercise) {
        void requestConfirmation({
          title: "Eliminar ejercicio",
          message: `¿Eliminar "${exercise.name || `Ejercicio ${exerciseIndex + 1}`}" de esta sesión en curso?`,
          confirmLabel: "Eliminar",
          danger: true
        }).then((accepted) => {
          if (!accepted || !activeSession || !activeSession.exercises[exerciseIndex]) return;
          const name = activeSession.exercises[exerciseIndex].name || "Ejercicio";
          activeSession.exercises.splice(exerciseIndex, 1);
          activeSession.updatedAt = new Date().toISOString();
          persistSession();
          renderSession();
          toast(`Ejercicio "${name}" eliminado.`);
        });
      }
      return;
    }
    const button = event.target.closest(".use-previous-loads");
    if (!button || !activeSession) return;
    const exerciseIndex = Number(button.dataset.exercise);
    if (button.dataset.referenceAction === "identity") {
      const previous = TrainingHistoryTools.latestRecordedExercise(activeSession.exercises[exerciseIndex], readSessions(), activeSession.date, activeSession.id);
      if (!previous) { toast("Ya no hay un registro anterior disponible."); return; }
      const previousIdentity = TrainingHistoryTools.identityOf(previous.exercise);
      const session = activeSession;
      const exercise = session.exercises[exerciseIndex];
      const basisLabels = { unknown: "sin especificar", total_kg: "carga total", per_side_kg: "carga por lado", added_kg: "peso añadido", machine_stack_kg: "marcador de la máquina" };
      void requestConfirmation({ title: "Recuperar identidad anterior", message: `Se usará ${identityTitle(previousIdentity)}. Ajustes: ${previousIdentity.settings || "sin especificar"}. La carga anotada es: ${basisLabels[previousIdentity.loadBasis] || "sin especificar"}. Confirma que hoy usas la misma máquina y configuración. Tus series se conservarán.`, confirmLabel: "Usar esta identidad" }).then((accepted) => {
        if (!accepted || activeSession !== session || session.exercises[exerciseIndex] !== exercise) return;
        exercise.identity = { ...previousIdentity, detected: false };
        activeSession.updatedAt = new Date().toISOString(); persistSession(); renderSession();
      });
      return;
    }
    const reference = TrainingHistoryTools.findComparable(activeSession, exerciseIndex, readSessions());
    if (!reference) { toast("Ya no hay una referencia comparable."); return; }
    const field = resistanceConfig(activeSession.exercises[exerciseIndex]).field;
    let copied = 0;
    activeSession.exercises[exerciseIndex].entries.forEach((entry, index) => {
      const previous = reference.exercise.entries[index];
      if (previous && !String(entry[field] || "").trim() && String(previous[field] || "").trim()) {
        entry[field] = previous[field];
        copied += 1;
      }
    });
    activeSession.updatedAt = new Date().toISOString();
    persistSession();
    const card = exerciseList.querySelector(`[data-exercise-card="${exerciseIndex}"]`);
    if (card) {
      const inputs = card.querySelectorAll(`input[data-field="${field}"]`);
      activeSession.exercises[exerciseIndex].entries.forEach((entry, index) => { if (inputs[index]) inputs[index].value = entry[field] || ""; });
    }
    toast(copied ? `${copied} referencias anteriores copiadas.` : "La referencia ya estaba rellenada.");
  });

  exerciseList.addEventListener("focusin", (event) => {
    const target = event.target;
    const exerciseIndex = Number(target.dataset.exercise);
    if (!activeSession || !Number.isInteger(exerciseIndex) || !activeSession.exercises[exerciseIndex]) return;
    const fieldLabels = {
      load: "carga",
      difficulty: "dificultad",
      reps: "repeticiones",
      rir: "RIR",
      resistanceMode: "tipo de resistencia",
      variant: "variante",
      settings: "ajustes",
      loadBasis: "base de carga"
    };
    feedbackFieldContext = {
      exercise_name: activeSession.exercises[exerciseIndex].name,
      set_index: target.dataset.set == null ? "" : String(Number(target.dataset.set) + 1),
      field: target.matches(".movement-note textarea") ? "anotación del movimiento" : fieldLabels[target.dataset.field || target.dataset.identityField] || ""
    };
  });

  document.getElementById("feedbackAddButton").addEventListener("click", openFeedbackDialog);
  document.getElementById("feedbackCloseButton").addEventListener("click", closeFeedbackDialog);
  document.getElementById("feedbackCancelButton").addEventListener("click", closeFeedbackDialog);
  feedbackDialog.addEventListener("click", (event) => {
    if (event.target === feedbackDialog) closeFeedbackDialog();
  });
  feedbackDialog.querySelectorAll("[data-feedback-category]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedFeedbackCategory = button.dataset.feedbackCategory;
      feedbackDialog.querySelectorAll("[data-feedback-category]").forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
    });
  });
  feedbackForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const screen = document.body.dataset.screen || "import";
      const entry = TrainingFeedbackTools.createEntry({
        id: uid(),
        created_at: new Date().toISOString(),
        app_version: APP_VERSION,
        screen,
        session_id: screen === "session" && activeSession ? activeSession.id : "",
        session_title: screen === "session" && activeSession ? activeSession.title : "",
        exercise_name: screen === "session" ? feedbackFieldContext.exercise_name : "",
        set_index: screen === "session" ? feedbackFieldContext.set_index : "",
        field: screen === "session" ? feedbackFieldContext.field : "",
        category: selectedFeedbackCategory,
        comment: feedbackComment.value
      });
      const entries = readFeedbackEntries();
      entries.push(entry);
      if (!writeFeedbackEntries(entries)) return;
      closeFeedbackDialog();
      if (screen === "history") renderFeedbackHistory();
      toast("Mejora anotada en este dispositivo.");
    } catch (error) {
      toast(error && error.message ? error.message : "No se pudo guardar la mejora.");
    }
  });

  exerciseList.addEventListener("change", (event) => {
    if (event.target.matches("select[data-field], input[type=checkbox][data-field]")) event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".rir-picker")) closeRirPickers();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeRirPickers();
  });

  document.getElementById("gemCommandButton").addEventListener("click", openGemCommandDialog);
  document.getElementById("gemCommandCloseButton").addEventListener("click", closeGemCommandDialog);
  document.getElementById("gemCommandCancelButton").addEventListener("click", closeGemCommandDialog);
  gemCommandDialog.addEventListener("click", (event) => {
    if (event.target === gemCommandDialog) closeGemCommandDialog();
  });
  gemCommandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const originalText = gemCommandSubmitButton.textContent;
    gemCommandSubmitButton.disabled = true;
    gemCommandInput.disabled = true;
    gemCommandSubmitButton.textContent = "⏳ Procesando…";
    setGemCommandStatus("⏳ Procesando comando en Sheets...", "sending");
    try {
      const result = await GemCommandTools.execute(gemCommandInput.value);
      if (result.ok) {
        gemCommandInput.value = "";
        setGemCommandStatus(`✅ ${result.message}`, "success");
      } else {
        setGemCommandStatus(`❌ ${result.message}`, "error");
      }
    } catch (error) {
      const message = error && error.message ? error.message : "No se ha podido conectar con Sheets.";
      setGemCommandStatus(`❌ ${message}`, "error");
    } finally {
      gemCommandSubmitButton.disabled = false;
      gemCommandInput.disabled = false;
      gemCommandSubmitButton.textContent = originalText;
    }
  });
  document.getElementById("exportFeedbackButton").addEventListener("click", async (event) => {
    const entries = readFeedbackEntries();
    if (!entries.length) { toast("Todavía no hay mejoras que exportar."); return; }
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparando…";
    try {
      const result = await TrainingFeedbackTools.shareOrDownload(entries);
      toast(result.action === "shared" ? "Mejoras compartidas." : `Mejoras descargadas: ${result.filename}`);
    } catch (error) {
      if (error && error.name === "AbortError") toast("Compartir cancelado.");
      else toast("No se pudieron exportar las mejoras.");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  document.getElementById("parseButton").addEventListener("click", parseNote);
  document.getElementById("exampleButton").addEventListener("click", () => { noteInput.value = example; noteInput.focus(); });
  document.getElementById("historyButton").addEventListener("click", () => showScreen("history"));
  document.getElementById("addHistoricalButton").addEventListener("click", () => {
    showHistoricalMessages([], "error");
    showScreen("historical");
  });
  document.getElementById("historicalExampleButton").addEventListener("click", () => {
    historicalText.value = historicalExample;
    localStorage.setItem(HISTORICAL_DRAFT_KEY, historicalExample);
    historicalText.focus();
  });
  document.getElementById("parseHistoricalButton").addEventListener("click", parseHistoricalText);
  historicalText.addEventListener("input", () => localStorage.setItem(HISTORICAL_DRAFT_KEY, historicalText.value));
  historicalPreviewDate.addEventListener("change", () => {
    if (!activeSessionIsHistoricalDraft) return;
    activeSession.date = historicalPreviewDate.value ? `${historicalPreviewDate.value}T12:00:00` : "";
    activeSession.updatedAt = new Date().toISOString();
    document.getElementById("sessionDate").textContent = activeSession.date ? formatDate(activeSession.date) : "Fecha pendiente";
    persistSession();
  });
  historicalPreviewTitle.addEventListener("input", () => {
    if (!activeSessionIsHistoricalDraft) return;
    activeSession.title = historicalPreviewTitle.value;
    activeSession.updatedAt = new Date().toISOString();
    document.getElementById("sessionTitle").textContent = activeSession.title || "Entrenamiento antiguo";
    persistSession();
  });
  document.getElementById("importHistoryButton").addEventListener("click", () => historyFileInput.click());
  historyFileInput.addEventListener("change", () => importHistoryFile(historyFileInput.files && historyFileInput.files[0]));
  restTimerButton.addEventListener("click", toggleRestTimer);
  restTimerSubtract.addEventListener("click", () => { void addRestTime(-15); });
  restTimerAdd.addEventListener("click", () => { void addRestTime(15); });
  document.getElementById("restFinishedDialogCloseButton").addEventListener("click", closeRestFinishedDialog);
  restFinishedDialog.addEventListener("cancel", (event) => { event.preventDefault(); });
  restTimerOptions.addEventListener("click", () => {
    setRestTimerPanel(restTimerPanel.hidden);
  });
  document.getElementById("restTimerReset").addEventListener("click", () => {
    cancelScheduledTimerAlarm();
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerEndsAt = 0;
    restTimerRemaining = 0;
    restTimerTotal = 0;
    restTimerComplete = false;
    renderRestTimer();
  });
  restDuration.addEventListener("change", () => {
    if (!restTimerEndsAt) {
      restTimerRemaining = 0;
      restTimerTotal = 0;
      restTimerComplete = false;
      renderRestTimer();
    }
  });
  timerSoundToggle.addEventListener("change", async () => {
    localStorage.setItem(TIMER_SOUND_KEY, timerSoundToggle.checked ? "true" : "false");
    if (!timerSoundToggle.checked) {
      cancelScheduledTimerAlarm();
      toast("Aviso sonoro desactivado.");
      return;
    }
    const targetEndsAt = restTimerEndsAt;
    const ready = await primeTimerAudio(true);
    if (ready && targetEndsAt && restTimerEndsAt === targetEndsAt) armTimerAlarm();
    toast(ready ? "Sonido preparado." : "No se pudo preparar el sonido. Pulsa Probar sonido.");
  });
  wakeLockToggle.addEventListener("change", () => {
    localStorage.setItem(WAKE_LOCK_KEY, wakeLockToggle.checked ? "true" : "false");
    if (wakeLockToggle.checked) requestWakeLock();
    else releaseWakeLock();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") checkpointActiveSession();
    if (document.visibilityState === "visible") {
      tickRestTimer();
      if (!screens.session.hidden) requestWakeLock();
    }
  });
  timerSoundProfileSelect.addEventListener("change", async () => {
    const profile = TrainingTimerSounds.normalizeProfile(timerSoundProfileSelect.value);
    timerSoundProfileSelect.value = profile;
    localStorage.setItem(TIMER_SOUND_PROFILE_KEY, profile);
    cancelScheduledTimerAlarm();
    const targetEndsAt = restTimerEndsAt;
    const ready = targetEndsAt && timerSoundEnabled() ? await primeTimerAudio(true) : false;
    if (ready && restTimerEndsAt === targetEndsAt) armTimerAlarm();
    toast(`Aviso seleccionado: ${TrainingTimerSounds.PROFILES[profile].label}.`);
  });
  document.getElementById("timerSoundPreview").addEventListener("click", async () => {
    if (!timerSoundEnabled()) { toast("Activa primero el sonido del temporizador."); return; }
    const played = await primeTimerAudio(true) && await playTimerAlarm();
    toast(played ? "Aviso enviado. Si no lo oyes, revisa volumen multimedia y Bluetooth." : "El dispositivo no permitió reproducir el aviso. Revisa el volumen multimedia y Bluetooth.");
  });
  window.addEventListener("pageshow", tickRestTimer);
  document.addEventListener("focusin", (event) => {
    if (event.target.matches('textarea, input:not([type="checkbox"])')) {
      setRestTimerPanel(false);
      updateKeyboardViewport();
    }
  });
  document.addEventListener("focusout", () => {
    setTimeout(updateKeyboardViewport, 80);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateKeyboardViewport);
    window.visualViewport.addEventListener("scroll", updateKeyboardViewport);
  }

  function makeHistoricalSession(draft) {
    const now = new Date().toISOString();
    return {
      id: uid(),
      title: draft.title,
      date: draft.date,
      updatedAt: now,
      finished: Boolean(draft.finished),
      sourceNote: "",
      exercises: draft.exercises.map((exercise) => ({
        ...exercise,
        identity: TrainingHistoryTools.identityOf(exercise),
        note: exercise.note || "",
        entries: exercise.entries.map((entry) => ({
          load: entry.load || "",
          difficulty: entry.difficulty || "",
          reps: entry.reps || "",
          rir: entry.rir || ""
        }))
      }))
    };
  }

  function normalizedTitle(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function showHistoricalMessages(messages, kind) {
    const values = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
    historicalMessages.hidden = values.length === 0;
    historicalMessages.dataset.kind = kind || "error";
    historicalMessages.textContent = values.join("\n");
  }

  function parseHistoricalText() {
    const source = historicalText.value.trim();
    localStorage.setItem(HISTORICAL_DRAFT_KEY, source);
    const parsed = TrainingHistoricalParser.parseHistoricalWorkout(source);
    if (parsed.error) {
      showHistoricalMessages(parsed.error, "error");
      toast(parsed.error.split("\n")[0]);
      return;
    }
    showHistoricalMessages([], "warning");
    activeSessionIsHistoricalDraft = true;
    activeSession = makeHistoricalSession(parsed.draft);
    historicalDraftSummary.textContent = parsed.warnings.length
      ? parsed.warnings.join(" ")
      : "Nada se añadirá al historial hasta que confirmes al final.";
    renderSession();
    toast(parsed.warnings.length ? `Borrador preparado con ${parsed.warnings.length} advertencias.` : "Borrador histórico preparado para revisión.");
  }

  async function saveHistoricalDraft() {
    if (!activeSession || !activeSessionIsHistoricalDraft) return false;
    if (!normalizedTitle(activeSession.title) || !/^\d{4}-\d{2}-\d{2}/.test(activeSession.date || "")) {
      toast("Revisa la fecha y el título antes de añadir la sesión.");
      return false;
    }
    const incompatibleExercise = activeSession.exercises.find((exercise) => {
      const identity = TrainingHistoryTools.identityOf(exercise);
      if (identity.resistanceMode === "external") return exercise.entries.some((entry) => String(entry.difficulty || "").trim());
      return identity.loadBasis !== "unknown" || exercise.entries.some((entry) => String(entry.load || "").trim());
    });
    if (incompatibleExercise) {
      toast(`Revisa el tipo de resistencia de «${incompatibleExercise.name}» antes de añadir la sesión.`);
      return false;
    }

    const state = readSessionsState();
    if (state.error) {
      toast(state.error);
      return false;
    }
    const sessions = state.sessions;
    const duplicate = sessions.find((session) => String(session.date || "").slice(0, 10) === String(activeSession.date).slice(0, 10)
      && normalizedTitle(session.title) === normalizedTitle(activeSession.title));
    if (duplicate && !await requestConfirmation({
      title: "Sesión duplicada",
      message: "Ya existe una sesión con la misma fecha y título. Puedes añadir otra sin modificar la existente.",
      confirmLabel: "Añadir otra"
    })) return false;

    activeSession.updatedAt = new Date().toISOString();
    // El alta histórica es acumulativa: crea un ID nuevo y nunca reemplaza por fecha o título.
    if (!writeSessions([activeSession, ...sessions])) return false;
    activeSessionIsHistoricalDraft = false;
    localStorage.removeItem(HISTORICAL_DRAFT_KEY);
    renderSession();
    toast("Entrenamiento antiguo añadido; no se modificó ninguna sesión existente.");
    return true;
  }
  document.getElementById("shareHistoryButton").addEventListener("click", async (event) => {
    const sessions = readSessions();
    if (!sessions.length) { toast("Todavía no hay sesiones que exportar."); return; }
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparando…";
    try {
      const result = await TrainingJsonExporter.shareOrDownloadHistory(sessions);
      toast(result.action === "shared" ? "Historial compartido." : `Historial descargado: ${result.filename}`);
    } catch (error) {
      if (error && error.name === "AbortError") toast("Compartir cancelado.");
      else {
        console.error(error);
        toast("No se pudo exportar el historial.");
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
  document.getElementById("goHome").addEventListener("click", () => showScreen("import"));
  document.getElementById("editNoteButton").addEventListener("click", () => {
    if (activeSessionIsHistoricalDraft) showScreen("historical");
    else {
      if (activeSession) noteInput.value = activeSession.sourceNote;
      showScreen("import");
    }
  });
  document.getElementById("downloadPdfButton").addEventListener("click", async (event) => {
    if (!activeSession) { toast("No hay una sesión para exportar."); return; }
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Creando PDF…";
    try {
      const { filename } = await TrainingPdfExporter.downloadWorkoutPdf(activeSession);
      toast(`PDF descargado: ${filename}`);
    } catch (error) {
      console.error(error);
      toast("No se pudo crear el PDF. Inténtalo de nuevo.");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
  document.getElementById("shareJsonButton").addEventListener("click", async (event) => {
    if (!activeSession) { toast("No hay una sesión para compartir."); return; }
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparando…";
    try {
      const result = await TrainingJsonExporter.shareOrDownload(activeSession);
      toast(result.action === "shared" ? "Registro compartido." : `JSON descargado: ${result.filename}`);
    } catch (error) {
      if (error && error.name === "AbortError") toast("Compartir cancelado.");
      else {
        console.error(error);
        toast("No se pudo compartir el registro.");
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
  document.getElementById("finishButton").addEventListener("click", async () => {
    if (!activeSession) return;
    if (activeSessionIsHistoricalDraft) { await saveHistoricalDraft(); return; }
    const incomplete = activeSession.exercises.flatMap((exercise) => exercise.entries).filter((entry) => !entry.completed).length;
    if (incomplete && !await requestConfirmation({
      title: "Finalizar sesión",
      message: `Quedan ${incomplete} series sin marcar como completadas. La sesión se guardará igualmente.`,
      confirmLabel: "Finalizar"
    })) return;
    activeSession.finished = true;
    delete activeSession.pendingHistory;
    activeSession.updatedAt = new Date().toISOString();
    if (persistSession()) {
      toast("Sesión guardada en el historial");
      try {
        const payload = TrainingSync.buildTrainingPayload(activeSession);
        const queued = TrainingSync.enqueuePayload(payload, { recordId: activeSession.id });
        focusedSyncEventId = queued.event_id;
        renderSyncStatus();
      } catch (error) {
        console.error("No se pudo preparar la sincronización", error);
        syncStatusCard.dataset.state = "error";
        syncStatusText.textContent = "🔴 Error de sincronización";
        syncStatusDetail.textContent = "La sesión está guardada en este móvil, pero no pudo añadirse a la cola.";
        retrySyncButton.hidden = true;
      }
    }
  });
  document.getElementById("discardSessionButton").addEventListener("click", () => { void discardActiveSession(); });

  retrySyncButton.addEventListener("click", async () => {
    if (typeof TrainingSync === "undefined") return;
    retrySyncButton.disabled = true;
    try {
      await TrainingSync.retryPending();
      renderSyncStatus();
    } finally {
      retrySyncButton.disabled = false;
    }
  });
  renderSyncStatus();
  if (typeof TrainingSync !== "undefined") {
    TrainingSync.subscribe(renderSyncStatus);
    TrainingSync.retryPending().catch(() => {});
  }

  noteInput.value = localStorage.getItem(DRAFT_KEY) || "";
  historicalText.value = localStorage.getItem(HISTORICAL_DRAFT_KEY) || "";
  wakeLockToggle.checked = wakeLockEnabled();
  timerSoundToggle.checked = timerSoundEnabled();
  timerSoundProfileSelect.value = timerSoundProfile();
  updateWakeLockStatus();
  renderRestTimer();
  if (!restoreActiveSessionDraft()) document.body.dataset.screen = "import";
  window.addEventListener("pagehide", () => {
    checkpointActiveSession();
    releaseWakeLock();
  });
  const installCard = document.getElementById("installCard");
  const installButton = document.getElementById("installButton");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (!standalone) installCard.hidden = false;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installCard.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      toast("En Chrome, abre ⋮ y toca «Añadir a pantalla de inicio».");
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice.outcome === "accepted") installCard.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installCard.hidden = true;
    toast("Aplicación instalada.");
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  if (typeof window !== "undefined") {
    window.TrainingApp = {
      requestConfirmation,
      toast,
      persistSession,
      renderSession,
      getActiveSession: () => activeSession
    };
  }
})();
