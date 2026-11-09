import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule, plain, readJson } from "./load-browser-module.mjs";

const exporter = await loadBrowserModule("../public/app/json-export.js", "TrainingJsonExporter");
const historyTools = await loadBrowserModule("../public/app/history-tools.js", "TrainingHistoryTools");

const session = {
  id: "session-1",
  title: "Día A · Glúteo y torso",
  date: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T11:00:00.000Z",
  finished: true,
  sourceNote: "# Día A",
  exercises: [{
    name: "Hip thrust en máquina",
    sets: 2,
    repsMin: 8,
    repsMax: 10,
    perSide: false,
    targetRir: "2",
    rest: "2–3 min",
    cue: "Pausa arriba.",
    identity: { resistanceMode: "external", variant: "Technogym", settings: "Respaldo 3", loadBasis: "total_kg" },
    note: "Técnica estable.",
    entries: [
      { load: "120", difficulty: "", reps: "10", rir: "2" },
      { load: "120", difficulty: "", reps: "9", rir: "1" },
    ],
  }],
};

test("mantiene los contratos training_log.v1 y training_history.v1", () => {
  const record = exporter.buildTrainingRecord(session, "2026-08-01T12:00:00.000Z");
  assert.equal(record.schema, "training_log.v1");
  assert.equal(record.session.recorded_set_count, 2);
  assert.equal(record.exercises[0].result.sets[0].load_kg, "120");
  assert.equal(record.exercises[0].prescription.reps_max, 10);
  assert.equal(record.exercises[0].identity.machine_settings, "Respaldo 3");
  assert.equal(record.exercises[0].identity.load_basis, "total_kg");
  assert.equal(record.exercises[0].identity.resistance_mode, "external");
  assert.equal(record.exercises[0].result.sets[0].resistance.mode, "external");
  assert.equal(exporter.filenameFor(session), "2026-08-01-dia-a-gluteo-y-torso-registro-ia.json");

  const olderSession = { ...session, id: "session-0", date: "2026-07-30T10:00:00.000Z", finished: false };
  const history = exporter.buildTrainingHistory([session, olderSession]);
  assert.equal(history.schema, "training_history.v1");
  assert.equal(history.session_schema, "training_log.v1");
  assert.equal(history.summary.session_count, 2);
  assert.equal(history.summary.finished_session_count, 1);
  assert.equal(history.summary.recorded_set_count, 4);
  assert.equal(history.sessions[0].session.id, "session-0");
  assert.equal(history.sessions[1].session.id, "session-1");
  assert.equal(exporter.historyFilename(), "historial-entrenamientos-ia.json");
});

test("hace round-trip de legacy, carga externa, TRX y autocarga", async () => {
  const records = await Promise.all([
    readJson("./fixture-training-log-legacy.v1.json"),
    readJson("./fixture-training-log-external.v1.json"),
    readJson("./fixture-training-log-trx.v1.json"),
    readJson("./fixture-training-log-bodyweight.v1.json"),
  ]);

  for (const record of records) {
    const restored = plain(historyTools.sessionFromRecord(record));
    const exported = exporter.buildTrainingRecord(restored, "2026-08-10T12:00:00.000Z");
    const restoredAgain = plain(historyTools.sessionFromRecord(exported));
    assert.deepEqual(restoredAgain, restored, `round-trip fallido para ${record.session.id}`);
  }
});

test("conserva vacíos reps y RIR y estructura resistencia adaptativa", async () => {
  const trx = await readJson("./fixture-training-log-trx.v1.json");
  const restored = historyTools.sessionFromRecord(trx);
  const exported = exporter.buildTrainingRecord(restored, "2026-08-10T12:00:00.000Z");
  const set = exported.exercises[0].result.sets[0];
  assert.equal(set.load_kg, "");
  assert.equal(set.resistance.mode, "trx");
  assert.equal(set.resistance.difficulty, "Pies en marca 3");
  assert.equal(set.reps, "");
  assert.equal(set.rir, "");
});

test("serializa JSON válido con el mismo resumen", () => {
  const parsed = JSON.parse(exporter.makeJson(session));
  assert.match(parsed.exported_at, /^\d{4}-\d{2}-\d{2}T/);
  const history = exporter.buildTrainingHistory([session]);
  assert.deepEqual(JSON.parse(exporter.makeHistoryJson([session])).summary, plain(history.summary));
});
