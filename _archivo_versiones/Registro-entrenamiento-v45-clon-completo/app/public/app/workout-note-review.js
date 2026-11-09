(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingWorkoutNoteReview = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  const text = (value) => String(value == null ? "" : value).trim();

  function formatRange(min, max, suffix) {
    if (min == null || max == null) return "";
    const value = min === max ? String(min) : `${min}–${max}`;
    return suffix ? `${value} ${suffix}` : value;
  }

  function formatRest(prescription) {
    const min = prescription && prescription.restSecondsMin;
    const max = prescription && prescription.restSecondsMax;
    if (min == null || max == null) return "";
    if (min % 60 === 0 && max % 60 === 0) return formatRange(min / 60, max / 60, "min");
    return formatRange(min, max, "s");
  }

  function isWorkoutNoteV1(draft) {
    return Boolean(draft && draft.schema === "workout_note_draft.v1" && draft.session && draft.session.rawHeader && draft.exercises && draft.exercises.length);
  }

  function warningFor(exercise) {
    const partial = (exercise.fragments || []).filter((item) => item.status === "partial");
    const unresolved = (exercise.fragments || []).filter((item) => item.status === "unresolved");
    if (!partial.length && !unresolved.length) return "";
    const parts = [];
    if (partial.length) parts.push(`${partial.length} dato${partial.length === 1 ? "" : "s"} parcial${partial.length === 1 ? "" : "es"}`);
    if (unresolved.length) parts.push(`${unresolved.length} fragmento${unresolved.length === 1 ? "" : "s"} por revisar`);
    return parts.join(" · ");
  }

  function comparableText(record) {
    if (!record) return "";
    const sets = (record.sets || []).map((item) => item.rawText).filter(Boolean);
    const date = record.rawDate || "";
    return { sets, date, partial: record.status === "partial" };
  }

  function editableNumber(value) {
    return value == null ? "" : String(value);
  }

  function prescriptionTicketMarkup(prescription) {
    const values = [
      prescription.sets != null ? `${prescription.sets} series` : "",
      formatRange(prescription.repsMin, prescription.repsMax, "reps"),
      prescription.targetRirMin != null && prescription.targetRirMax != null ? `RIR ${formatRange(prescription.targetRirMin, prescription.targetRirMax, "")}` : "",
      formatRest(prescription)
    ].filter(Boolean);
    return values.length
      ? values.map((value) => `<span class="review-prescription-ticket">${escapeHtml(value)}</span>`).join("")
      : '<span class="review-prescription-ticket is-empty">Sin prescripción</span>';
  }

  function renderExercise(exercise, index) {
    const card = document.createElement("article");
    card.className = "workout-note-review-card";
    card.dataset.exerciseIndex = String(index);
    const prescription = exercise.prescription || {};
    const reference = comparableText(exercise.comparableRecord);
    const warning = warningFor(exercise);

    const header = document.createElement("div");
    header.className = "workout-note-review-card-header";
    header.innerHTML = `<span class="exercise-number">${String(index + 1).padStart(2, "0")}</span><label class="review-exercise-name"><span>Ejercicio</span><input value="${escapeHtml(exercise.name)}" aria-label="Nombre del ejercicio ${index + 1}" /></label>`;
    const nameInput = header.querySelector("input");
    nameInput.addEventListener("input", () => { exercise.name = nameInput.value; });
    card.append(header);

    const tickets = document.createElement("div");
    tickets.className = "review-prescription-tickets";
    tickets.setAttribute("aria-label", `Prescripción de ${exercise.name}`);
    tickets.innerHTML = prescriptionTicketMarkup(prescription);
    card.append(tickets);

    const fields = document.createElement("div");
    fields.className = "review-prescription-fields";
    fields.innerHTML = `
      <label><span>Series</span><input inputmode="numeric" value="${editableNumber(prescription.sets)}" aria-label="Series de ${escapeHtml(exercise.name)}" /></label>
      <label><span>Reps mín.</span><input inputmode="numeric" value="${editableNumber(prescription.repsMin)}" aria-label="Repeticiones mínimas de ${escapeHtml(exercise.name)}" /></label>
      <label><span>Reps máx.</span><input inputmode="numeric" value="${editableNumber(prescription.repsMax)}" aria-label="Repeticiones máximas de ${escapeHtml(exercise.name)}" /></label>
      <label><span>RIR objetivo</span><input value="${formatRange(prescription.targetRirMin, prescription.targetRirMax, "")}" aria-label="RIR objetivo de ${escapeHtml(exercise.name)}" /></label>
      <label><span>Descanso</span><input value="${formatRest(prescription)}" aria-label="Descanso de ${escapeHtml(exercise.name)}" /></label>`;
    const [sets, repsMin, repsMax, rir, rest] = fields.querySelectorAll("input");
    const refreshTickets = () => { tickets.innerHTML = prescriptionTicketMarkup(prescription); };
    sets.addEventListener("input", () => { prescription.sets = numericOrNull(sets.value); refreshTickets(); });
    repsMin.addEventListener("input", () => { prescription.repsMin = numericOrNull(repsMin.value); refreshTickets(); });
    repsMax.addEventListener("input", () => { prescription.repsMax = numericOrNull(repsMax.value); refreshTickets(); });
    rir.addEventListener("input", () => {
      const range = numberRange(rir.value);
      prescription.targetRirMin = range ? range.min : null;
      prescription.targetRirMax = range ? range.max : null;
      refreshTickets();
    });
    rest.addEventListener("input", () => {
      const range = restRange(rest.value);
      prescription.restSecondsMin = range ? range.min : null;
      prescription.restSecondsMax = range ? range.max : null;
      refreshTickets();
    });
    const editor = document.createElement("details");
    editor.className = "review-prescription-editor";
    editor.innerHTML = "<summary>Editar prescripción</summary>";
    editor.append(fields);
    card.append(editor);

    if (reference) {
      const referenceBlock = document.createElement("section");
      referenceBlock.className = "review-reference";
      referenceBlock.innerHTML = `<span>Último registro${reference.partial ? " parcial" : ""}</span><div>${reference.sets.map((item) => `<strong>${escapeHtml(item)}</strong>`).join("") || "<strong>Sin series completas</strong>"}${reference.date ? `<small>${escapeHtml(reference.date)}</small>` : ""}</div>`;
      card.append(referenceBlock);
    }

    if (exercise.instructions && exercise.instructions.length) {
      const instructions = document.createElement("section");
      instructions.className = "review-instructions";
      instructions.innerHTML = exercise.instructions.map((item) => `<div><span>${instructionLabel(item.type)}</span><p>${escapeHtml(item.text)}</p></div>`).join("");
      card.append(instructions);
    }

    if (warning) {
      const notice = document.createElement("p");
      notice.className = "review-warning";
      notice.textContent = `Revisar: ${warning}. El texto original se conserva.`;
      card.append(notice);
    }
    return card;
  }

  function instructionLabel(type) {
    return ({ today: "Hoy", target: "Objetivo", depth: "Profundidad", record: "Registra", other: "Nota" })[type] || "Nota";
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function numberRange(value) {
    const match = text(value).match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    return match ? { min: Number(match[1]), max: Number(match[2] || match[1]) } : null;
  }

  function numericOrNull(value) {
    return /^\d+$/.test(text(value)) ? Number(value) : null;
  }

  function restRange(value) {
    const match = text(value).match(/^(\d+)(?:\s*[-–]\s*(\d+))?\s*(min|s)$/i);
    if (!match) return null;
    const multiplier = /^min$/i.test(match[3]) ? 60 : 1;
    return { min: Number(match[1]) * multiplier, max: Number(match[2] || match[1]) * multiplier };
  }

  function sessionInputFromDraft(draft) {
    return {
      title: draft.session.label || "Entrenamiento",
      exercises: draft.exercises.map((exercise) => {
        const prescription = exercise.prescription || {};
        const instructions = (exercise.instructions || []).map((item) => `${instructionLabel(item.type)}: ${item.text}`).join(" · ");
        const comparableDeclared = (exercise.fragments || []).some((item) => item.category === "comparable-record");
        return {
          name: exercise.name,
          sets: prescription.sets,
          repsMin: prescription.repsMin,
          repsMax: prescription.repsMax,
          targetRir: formatRange(prescription.targetRirMin, prescription.targetRirMax, ""),
          rest: formatRest(prescription),
          perSide: Boolean(prescription.perSide),
          cue: instructions,
          identityText: exercise.rawText,
          workoutNoteReference: comparableDeclared ? { record: exercise.comparableRecord } : null
        };
      })
    };
  }

  function canCreateSession(draft) {
    return Boolean(draft && draft.exercises.length && draft.exercises.every((exercise) => {
      const prescription = exercise.prescription || {};
      return text(exercise.name) && Number.isInteger(prescription.sets) && prescription.sets > 0
        && Number.isFinite(prescription.repsMin) && Number.isFinite(prescription.repsMax);
    }));
  }

  function setup() {
    const screen = document.getElementById("workoutNoteReviewScreen");
    const noteInput = document.getElementById("trainerNote");
    const parseButton = document.getElementById("parseButton");
    const list = document.getElementById("workoutNoteReviewList");
    const title = document.getElementById("workoutNoteReviewTitle");
    const focus = document.getElementById("workoutNoteReviewFocus");
    const summary = document.getElementById("workoutNoteReviewSummary");
    const back = document.getElementById("workoutNoteReviewBack");
    const edit = document.getElementById("workoutNoteReviewEdit");
    const confirm = document.getElementById("workoutNoteReviewConfirm");
    if (!screen || !noteInput || !parseButton || !list || !edit || !confirm || !root.TrainingParser) return;
    let activeDraft = null;

    function updateConfirmState() {
      confirm.disabled = !canCreateSession(activeDraft);
    }

    function show(draft) {
      activeDraft = draft;
      document.querySelectorAll("main > .screen").forEach((item) => { item.hidden = item !== screen; });
      document.body.dataset.screen = "workout-note-review";
      title.textContent = draft.session.label || "Entrenamiento";
      focus.textContent = draft.session.focusText || "";
      focus.hidden = !draft.session.focusText;
      summary.textContent = `${draft.exercises.length} ejercicios · Revisión local antes de crear una sesión`;
      list.replaceChildren(...draft.exercises.map(renderExercise));
      updateConfirmState();
      window.scrollTo(0, 0);
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target && event.target.closest ? event.target.closest("#parseButton") : null;
      if (trigger !== parseButton) return;
      const draft = root.TrainingParser.parseWorkoutNoteV1(noteInput.value);
      if (!isWorkoutNoteV1(draft)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      show(draft);
    }, true);
    list.addEventListener("input", updateConfirmState);
    function editNote() {
      screen.hidden = true;
      document.getElementById("importScreen").hidden = false;
      document.body.dataset.screen = "import";
      noteInput.focus();
    }

    back.addEventListener("click", editNote);
    edit.addEventListener("click", editNote);
    confirm.addEventListener("click", () => {
      if (!canCreateSession(activeDraft)) return;
      document.dispatchEvent(new root.CustomEvent("workout-note:confirm", {
        detail: { parsed: sessionInputFromDraft(activeDraft), sourceNote: activeDraft.rawText }
      }));
    });
  }

  if (typeof document !== "undefined") setup();
  return { canCreateSession, formatRest, isWorkoutNoteV1, restRange, sessionInputFromDraft, setup };
});
