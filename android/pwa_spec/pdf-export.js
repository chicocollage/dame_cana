(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./vendor/pdf-lib-1.17.1.min.js"));
  else root.TrainingPdfExporter = factory(root.PDFLib);
})(typeof self !== "undefined" ? self : this, function (PDFLib) {
  "use strict";

  if (!PDFLib) throw new Error("No se ha podido cargar el generador de PDF.");

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 32;
  const TOP = 35;
  const BOTTOM = 30;
  const FONT_SIZE = 8.5;
  const LINE_HEIGHT = 11.2;
  const MAX_CHARS = 102;

  function safeText(value) {
    return String(value == null ? "" : value)
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\u00d7/g, "x")
      .replace(/\u00b7/g, " / ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/\|/g, "/")
      .replace(/[^\x20-\x7e\xa0-\xff]/g, "?")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fileSlug(value) {
    const slug = safeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 44);
    return slug || "entrenamiento";
  }

  function isoDate(value) {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function splitValue(value, limit) {
    const text = safeText(value);
    if (!text) return [""];
    const chunks = [];
    let remaining = text;
    while (remaining.length > limit) {
      let cut = remaining.lastIndexOf(" ", limit);
      if (cut < Math.floor(limit * 0.55)) cut = limit;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    chunks.push(remaining);
    return chunks;
  }

  function fieldLines(key, value) {
    const firstPrefix = `${key}: `;
    const continuationPrefix = `${key}_cont: `;
    const chunks = splitValue(value, Math.max(24, MAX_CHARS - continuationPrefix.length));
    return chunks.map((chunk, index) => `${index === 0 ? firstPrefix : continuationPrefix}${chunk}`);
  }

  function buildTechnicalLines(session) {
    if (!session || !Array.isArray(session.exercises)) throw new Error("No hay una sesión válida para exportar.");
    const entries = session.exercises.flatMap((exercise) => exercise.entries || []);
    const recorded = entries.filter((entry) => safeText(entry.reps)).length;
    const lines = [
      "TRAINING_LOG_V1",
      "format: key_value_blocks",
      "field_separator: colon",
      "set_value_separator: pipe",
      "empty_value: blank",
      "",
      "[SESSION]",
      ...fieldLines("session_id", session.id || ""),
      ...fieldLines("session_title", session.title || "Entrenamiento"),
      ...fieldLines("session_date_iso", isoDate(session.date)),
      ...fieldLines("updated_at_iso", isoDate(session.updatedAt)),
      `finished: ${Boolean(session.finished)}`,
      `exercise_count: ${session.exercises.length}`,
      `planned_set_count: ${entries.length}`,
      `recorded_set_count: ${recorded}`,
      "[/SESSION]"
    ];

    session.exercises.forEach((exercise, exerciseIndex) => {
      const setRows = Array.isArray(exercise.entries) ? exercise.entries : [];
      lines.push(
        "",
        `[EXERCISE ${String(exerciseIndex + 1).padStart(2, "0")}]`,
        `exercise_index: ${exerciseIndex + 1}`,
        ...fieldLines("name", exercise.name),
        `prescribed_sets: ${exercise.sets || setRows.length || ""}`,
        `prescribed_reps_min: ${exercise.repsMin == null ? "" : exercise.repsMin}`,
        `prescribed_reps_max: ${exercise.repsMax == null ? "" : exercise.repsMax}`,
        `per_side: ${Boolean(exercise.perSide)}`,
        ...fieldLines("target_rir", exercise.targetRir),
        ...fieldLines("rest", exercise.rest),
        ...fieldLines("coach_cue", exercise.cue),
        ...fieldLines("movement_notes", exercise.note),
        "set_schema: set_index | load | reps | actual_rir"
      );
      setRows.forEach((entry, setIndex) => {
        lines.push([
          `set: ${setIndex + 1}`,
          safeText(entry.load),
          safeText(entry.reps),
          safeText(entry.rir)
        ].join(" | "));
      });
      lines.push(`[/EXERCISE ${String(exerciseIndex + 1).padStart(2, "0")}]`);
    });

    lines.push("", "END_TRAINING_LOG_V1");
    return lines;
  }

  async function buildWorkoutPdf(session) {
    const lines = buildTechnicalLines(session);
    const pdfDoc = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.Courier);
    const bold = await pdfDoc.embedFont(StandardFonts.CourierBold);
    pdfDoc.setTitle(`TRAINING_LOG_V1 - ${safeText(session.title || "Entrenamiento")}`);
    pdfDoc.setSubject("Structured training log for automated processing");
    pdfDoc.setAuthor("Registro de entrenamiento");
    pdfDoc.setCreator("Registro de entrenamiento");
    pdfDoc.setCreationDate(new Date());

    const linesPerPage = Math.floor((PAGE_HEIGHT - TOP - BOTTOM - 15) / LINE_HEIGHT);
    const pages = [];
    for (let offset = 0; offset < lines.length; offset += linesPerPage) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      const pageLines = lines.slice(offset, offset + linesPerPage);
      pageLines.forEach((line, index) => {
        const isHeader = /^TRAINING_LOG|^\[\/?(?:SESSION|EXERCISE)|^END_TRAINING/.test(line);
        page.drawText(line || " ", {
          x: MARGIN_X,
          y: PAGE_HEIGHT - TOP - 15 - index * LINE_HEIGHT,
          size: FONT_SIZE,
          font: isHeader ? bold : regular,
          color: rgb(0, 0, 0)
        });
      });
    }

    pages.forEach((page, index) => {
      const header = `TRAINING_LOG_V1 | page ${index + 1}/${pages.length}`;
      page.drawText(header, { x: MARGIN_X, y: PAGE_HEIGHT - 20, size: 7.5, font: bold, color: rgb(0, 0, 0) });
    });

    return pdfDoc.save({ useObjectStreams: false });
  }

  async function downloadWorkoutPdf(session) {
    const bytes = await buildWorkoutPdf(session);
    const date = isoDate(session.date).slice(0, 10) || new Date().toISOString().slice(0, 10);
    const filename = `${date}-${fileSlug(session.title)}-registro-ia.pdf`;
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { filename, bytes };
  }

  return { buildWorkoutPdf, buildTechnicalLines, downloadWorkoutPdf, safeText, fileSlug };
});
