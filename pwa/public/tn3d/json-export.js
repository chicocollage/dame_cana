(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TrainingJsonExporter = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function iso(value) {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function slug(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 44) || "entrenamiento";
  }

  function buildTrainingRecord(session, exportedAt) {
    if (!session || !Array.isArray(session.exercises)) throw new Error("No hay una sesión válida para exportar.");
    const allSets = session.exercises.flatMap((exercise) => exercise.entries || []);
    return {
      schema: "training_log.v1",
      exported_at: exportedAt || new Date().toISOString(),
      session: {
        id: text(session.id),
        title: text(session.title),
        date: iso(session.date),
        updated_at: iso(session.updatedAt),
        finished: Boolean(session.finished),
        source_note: text(session.sourceNote),
        exercise_count: session.exercises.length,
        planned_set_count: allSets.length,
        recorded_set_count: allSets.filter((entry) => text(entry.reps)).length
      },
      exercises: session.exercises.map((exercise, exerciseIndex) => ({
        index: exerciseIndex + 1,
        name: text(exercise.name),
        identity: {
          resistance_mode: text(exercise.identity && exercise.identity.resistanceMode) || "external",
          variant: text(exercise.identity && exercise.identity.variant),
          machine_settings: text(exercise.identity && exercise.identity.settings),
          load_basis: text(exercise.identity && exercise.identity.loadBasis) || "unknown"
        },
        prescription: {
          sets: Number(exercise.sets || (exercise.entries || []).length || 0),
          reps_min: exercise.repsMin == null ? null : Number(exercise.repsMin),
          reps_max: exercise.repsMax == null ? null : Number(exercise.repsMax),
          per_side: Boolean(exercise.perSide),
          target_rir: text(exercise.targetRir),
          rest: text(exercise.rest),
          coach_cue: text(exercise.cue)
        },
        result: {
          movement_notes: text(exercise.note),
          sets: (exercise.entries || []).map((entry, setIndex) => ({
            index: setIndex + 1,
            load_kg: text(entry.load),
            resistance: {
              mode: text(exercise.identity && exercise.identity.resistanceMode) || "external",
              difficulty: text(entry.difficulty)
            },
            reps: text(entry.reps),
            rir: text(entry.rir)
          }))
        }
      }))
    };
  }

  function makeJson(session) {
    return `${JSON.stringify(buildTrainingRecord(session), null, 2)}\n`;
  }

  function buildTrainingHistory(sessions) {
    if (!Array.isArray(sessions)) throw new Error("No hay un historial válido para exportar.");
    const exportedAt = new Date().toISOString();
    const records = sessions
      .filter((session) => session && Array.isArray(session.exercises))
      .slice()
      .sort((left, right) => Date.parse(left.date || 0) - Date.parse(right.date || 0))
      .map((session) => buildTrainingRecord(session, exportedAt));
    const dates = records.map((record) => record.session.date).filter(Boolean);
    return {
      schema: "training_history.v1",
      exported_at: exportedAt,
      session_schema: "training_log.v1",
      summary: {
        session_count: records.length,
        finished_session_count: records.filter((record) => record.session.finished).length,
        recorded_set_count: records.reduce((total, record) => total + record.session.recorded_set_count, 0),
        date_from: dates[0] || "",
        date_to: dates[dates.length - 1] || ""
      },
      sessions: records
    };
  }

  function makeHistoryJson(sessions) {
    return `${JSON.stringify(buildTrainingHistory(sessions), null, 2)}\n`;
  }

  function historyFilename() {
    return "historial-entrenamientos-ia.json";
  }

  function filenameFor(session) {
    const date = iso(session.date).slice(0, 10) || new Date().toISOString().slice(0, 10);
    return `${date}-${slug(session.title)}-registro-ia.json`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function shareOrDownload(session) {
    const json = makeJson(session);
    const filename = filenameFor(session);
    const file = new File([json], filename, { type: "application/json" });
    const shareData = {
      title: `Registro: ${text(session.title)}`,
      text: "Registro estructurado de entrenamiento para importar en una IA.",
      files: [file]
    };
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(shareData);
        return { action: "shared", filename, json };
      } catch (error) {
        if (error && error.name === "AbortError") throw error;
        downloadBlob(file, filename);
        return { action: "downloaded", filename, json, fallbackReason: error && error.name };
      }
    }
    downloadBlob(file, filename);
    return { action: "downloaded", filename, json };
  }

  async function shareOrDownloadHistory(sessions) {
    const json = makeHistoryJson(sessions);
    const filename = historyFilename();
    const file = new File([json], filename, { type: "application/json" });
    const shareData = {
      title: "Historial de entrenamientos",
      text: "Historial acumulado de entrenamientos para utilizar como fuente de una IA.",
      files: [file]
    };
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(shareData);
        return { action: "shared", filename, json };
      } catch (error) {
        if (error && error.name === "AbortError") throw error;
        downloadBlob(file, filename);
        return { action: "downloaded", filename, json, fallbackReason: error && error.name };
      }
    }
    downloadBlob(file, filename);
    return { action: "downloaded", filename, json };
  }

  return {
    buildTrainingRecord,
    buildTrainingHistory,
    filenameFor,
    historyFilename,
    makeJson,
    makeHistoryJson,
    shareOrDownload,
    shareOrDownloadHistory
  };
});
