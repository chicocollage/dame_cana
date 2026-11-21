import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserSandbox, loadScript } from "./load-browser-module.mjs";

const sandbox = createBrowserSandbox();
await loadScript("../pwa_spec/vendor/pdf-lib-1.17.1.min.js", sandbox);
await loadScript("../pwa_spec/pdf-export.js", sandbox);
const { buildWorkoutPdf, buildTechnicalLines, fileSlug } = sandbox.TrainingPdfExporter;

const baseExercise = {
  name: "Hip thrust en máquina",
  sets: 3,
  repsMin: 8,
  repsMax: 10,
  targetRir: "2",
  rest: "2–3 min",
  cue: "Pausa breve arriba sin hiperextender la zona lumbar.",
  perSide: false,
  note: "Pausa estable y recorrido completo. Buena sensación técnica.",
  entries: [
    { load: "120", reps: "10", rir: "2" },
    { load: "120", reps: "9", rir: "2" },
    { load: "120", reps: "8", rir: "1" },
  ],
};

test("genera y vuelve a abrir el PDF técnico", async () => {
  const session = {
    id: "pdf-session",
    title: "Día A · Glúteo y torso",
    date: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T11:00:00.000Z",
    finished: true,
    exercises: [
      baseExercise,
      { ...baseExercise, name: "Sentadilla búlgara", perSide: true },
      { ...baseExercise, name: "Remo con pecho apoyado" },
      { ...baseExercise, name: "Elevación lateral en cable", repsMin: 12, repsMax: 20 },
      { ...baseExercise, name: "Peso muerto rumano" },
      { ...baseExercise, name: "Jalón al pecho" },
    ],
  };

  assert.equal(fileSlug(session.title), "dia-a-gluteo-y-torso");
  const lines = buildTechnicalLines(session);
  assert.equal(lines[0], "TRAINING_LOG_V1");
  assert.ok(lines.includes("set_schema: set_index | load | reps | actual_rir"));
  assert.ok(lines.includes("set: 1 | 120 | 10 | 2"));
  assert.equal(lines.at(-1), "END_TRAINING_LOG_V1");

  const bytes = await buildWorkoutPdf(session);
  assert.ok(bytes.length > 2000);
  const parsed = await sandbox.PDFLib.PDFDocument.load(bytes);
  assert.ok(parsed.getPageCount() >= 2);
});
