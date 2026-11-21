(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TrainingFeedbackTools = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SCHEMA = "app_feedback.v1";
  const MAX_COMMENT_LENGTH = 1000;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function iso(value) {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function createEntry(input) {
    const source = input || {};
    const category = text(source.category);
    const comment = text(source.comment).slice(0, MAX_COMMENT_LENGTH);
    if (!category && !comment) throw new Error("Escribe un comentario o elige una categoría.");

    const entry = {
      id: text(source.id),
      created_at: iso(source.created_at),
      app_version: text(source.app_version),
      screen: text(source.screen) || "unknown",
      session_id: text(source.session_id),
      session_title: text(source.session_title),
      exercise_name: text(source.exercise_name),
      set_index: text(source.set_index),
      field: text(source.field),
      category,
      comment
    };
    if (!entry.id || !entry.created_at) throw new Error("El comentario no tiene identificador o fecha válidos.");
    return entry;
  }

  function normalizeEntries(entries) {
    return (Array.isArray(entries) ? entries : []).flatMap((entry) => {
      try { return [createEntry(entry)]; }
      catch (_) { return []; }
    });
  }

  function buildFeedbackExport(entries, exportedAt) {
    const normalized = normalizeEntries(entries)
      .sort((left, right) => Date.parse(left.created_at || 0) - Date.parse(right.created_at || 0));
    return {
      schema: SCHEMA,
      exported_at: iso(exportedAt),
      summary: { entry_count: normalized.length },
      entries: normalized
    };
  }

  function makeFeedbackJson(entries, exportedAt) {
    return `${JSON.stringify(buildFeedbackExport(entries, exportedAt), null, 2)}\n`;
  }

  function filenameForFeedback(dateValue) {
    const date = iso(dateValue).slice(0, 10) || new Date().toISOString().slice(0, 10);
    return `${date}-mejoras-registro-entrenamiento.json`;
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

  async function shareOrDownload(entries) {
    const json = makeFeedbackJson(entries);
    const filename = filenameForFeedback();
    const file = new File([json], filename, { type: "application/json" });
    const shareData = {
      title: "Mejoras anotadas en Registro",
      text: "Comentarios de uso guardados localmente para mejorar la aplicación.",
      files: [file]
    };
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(shareData);
        return { action: "shared", filename, json };
      } catch (error) {
        if (error && error.name === "AbortError") throw error;
      }
    }
    downloadBlob(file, filename);
    return { action: "downloaded", filename, json };
  }

  return {
    SCHEMA,
    MAX_COMMENT_LENGTH,
    buildFeedbackExport,
    createEntry,
    filenameForFeedback,
    makeFeedbackJson,
    normalizeEntries,
    shareOrDownload
  };
});
