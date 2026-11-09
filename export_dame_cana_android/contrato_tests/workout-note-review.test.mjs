import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserSandbox, loadBrowserModule, loadScript, plain } from "./load-browser-module.mjs";

const parser = await loadBrowserModule("../pwa_spec/parser.js", "TrainingParser");
const review = await loadBrowserModule("../pwa_spec/workout-note-review.js", "TrainingWorkoutNoteReview");

test("el módulo de revisión reconoce exclusivamente un Workout Note Draft v1", () => {
  const valid = plain(parser.parseWorkoutNoteV1(`Día A — Torso

Press — 3 × 8`));
  assert.equal(review.isWorkoutNoteV1(valid), true);
  assert.equal(review.isWorkoutNoteV1({ schema: "training_log.v1", exercises: [{}] }), false);
  assert.equal(review.isWorkoutNoteV1({ schema: "workout_note_draft.v1", session: {}, exercises: [] }), false);
});

test("el módulo de revisión formatea descansos sin crear resultados", () => {
  assert.equal(review.formatRest({ restSecondsMin: 180, restSecondsMax: 240 }), "3–4 min");
  assert.equal(review.formatRest({ restSecondsMin: 90, restSecondsMax: 90 }), "90 s");
  assert.equal(review.restRange("2–3 min").max, 180);
  assert.equal(review.restRange(""), null);
});

test("convierte el draft revisado en prescripción de sesión sin inventar resultados", () => {
  const draft = plain(parser.parseWorkoutNoteV1(`Día A — Torso

Hip thrust en máquina — 3 × 6–10
RIR 1–2 · Descanso 3–4 min
Último registro: 60 kg × 10 @2, el 05/08.
Hoy: mantén la misma máquina.`));
  const parsed = plain(review.sessionInputFromDraft(draft));
  assert.equal(review.canCreateSession(draft), true);
  assert.equal(parsed.title, "Día A");
  assert.deepEqual(parsed.exercises[0], {
    name: "Hip thrust en máquina",
    sets: 3,
    repsMin: 6,
    repsMax: 10,
    targetRir: "1–2",
    rest: "3–4 min",
    perSide: false,
    cue: "Hoy: mantén la misma máquina.",
    identityText: draft.exercises[0].rawText,
    workoutNoteReference: { record: draft.exercises[0].comparableRecord },
  });
  assert.equal("entries" in parsed.exercises[0], false);
});

test("permite eliminar un ejercicio del draft y bloquea creación si queda vacío", () => {
  const draft = plain(parser.parseWorkoutNoteV1(`Día A — Torso

Press — 3 × 8
Remo — 3 × 10`));
  assert.equal(draft.exercises.length, 2);
  assert.equal(review.canCreateSession(draft), true);
  draft.exercises.splice(0, 1);
  assert.equal(draft.exercises.length, 1);
  assert.equal(draft.exercises[0].name, "Remo");
  assert.equal(review.canCreateSession(draft), true);
  draft.exercises.splice(0, 1);
  assert.equal(draft.exercises.length, 0);
  assert.equal(review.canCreateSession(draft), false);
});

test("el módulo de revisión se inicializa en navegador con acceso al parser global", async () => {
  const elements = new Map(["workoutNoteReviewScreen", "trainerNote", "parseButton", "workoutNoteReviewList", "workoutNoteReviewTitle", "workoutNoteReviewFocus", "workoutNoteReviewSummary", "workoutNoteReviewBack", "workoutNoteReviewEdit", "workoutNoteReviewConfirm"].map((id) => [id, { addEventListener() {} }]));
  const document = {
    addEventListener() {},
    getElementById(id) { return elements.get(id) || null; },
  };
  const sandbox = createBrowserSandbox({ document, TrainingParser: { parseWorkoutNoteV1() {} } });
  await assert.doesNotReject(loadScript("../pwa_spec/workout-note-review.js", sandbox));
});
