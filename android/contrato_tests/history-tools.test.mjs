import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule, plain, readJson } from "./load-browser-module.mjs";

const tools = await loadBrowserModule("../pwa_spec/history-tools.js", "TrainingHistoryTools");

const previous = {
  id: "previous",
  title: "Día A",
  date: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T11:00:00.000Z",
  finished: true,
  exercises: [{
    name: "Hip thrust",
    identity: { resistanceMode: "external", variant: "Technogym", settings: "Respaldo 3", loadBasis: "total_kg" },
    entries: [{ load: "80", difficulty: "", reps: "10", rir: "2" }],
  }],
};

test("compara solo ejercicios con identidad y modo compatibles", () => {
  const active = {
    id: "active",
    date: "2026-08-08T10:00:00.000Z",
    exercises: [{
      name: "HÍP thrust",
      identity: { resistanceMode: "external", variant: "Technogym", settings: "Respaldo 3", loadBasis: "total_kg" },
      entries: [{ load: "", difficulty: "", reps: "", rir: "" }],
    }],
  };
  assert.equal(tools.comparableExercises(active.exercises[0], previous.exercises[0]), true);
  assert.equal(tools.comparableExercises(active.exercises[0], {
    ...previous.exercises[0],
    identity: { ...previous.exercises[0].identity, settings: "Respaldo 4" },
  }), false);
  assert.equal(tools.comparableExercises(active.exercises[0], {
    ...previous.exercises[0],
    identity: { ...previous.exercises[0].identity, resistanceMode: "bodyweight" },
  }), false);
  assert.equal(tools.comparableExercises(active.exercises[0], {
    ...previous.exercises[0],
    identity: { ...previous.exercises[0].identity, loadBasis: "per_side_kg" },
  }), false);
  assert.equal(tools.findComparable(active, 0, [active, previous]).session.id, "previous");
  const older = { ...previous, id: "older", date: "2026-07-01T10:00:00.000Z" };
  const incompatible = { ...previous, id: "incompatible", date: "2026-08-03T10:00:00.000Z", exercises: [{ ...previous.exercises[0], identity: { ...previous.exercises[0].identity, settings: "Respaldo 4" } }] };
  assert.deepEqual(plain(tools.findComparableHistory(active, 0, [older, incompatible, previous], 3).map((item) => item.session.id)), ["previous", "older"]);
  assert.equal(tools.latestIdentity("HIP THRUST", [previous]).variant, "Technogym");
});

test("normaliza training_log.v1 antiguo como carga externa", async () => {
  const legacy = await readJson("./fixture-training-log-legacy.v1.json");
  const restored = tools.sessionFromRecord(legacy);
  assert.equal(restored.exercises[0].identity.resistanceMode, "external");
  assert.equal(restored.exercises[0].identity.variant, "");
  assert.equal(restored.exercises[0].identity.loadBasis, "unknown");
  assert.equal(restored.exercises[0].entries[0].load, "100");
  assert.equal(restored.exercises[0].entries[0].difficulty, "");
});

test("restaura dificultad adaptativa sin perder campos v1", async () => {
  const [trx, bodyweight] = await Promise.all([
    readJson("./fixture-training-log-trx.v1.json"),
    readJson("./fixture-training-log-bodyweight.v1.json"),
  ]);
  const restoredTrx = tools.sessionFromRecord(trx);
  const restoredBodyweight = tools.sessionFromRecord(bodyweight);
  assert.equal(restoredTrx.exercises[0].identity.resistanceMode, "trx");
  assert.equal(restoredTrx.exercises[0].entries[0].difficulty, "Pies en marca 3");
  assert.equal(restoredTrx.exercises[0].entries[0].reps, "");
  assert.equal(restoredTrx.exercises[0].entries[0].rir, "");
  assert.equal(restoredBodyweight.exercises[0].identity.resistanceMode, "bodyweight");
  assert.equal(restoredBodyweight.exercises[0].entries[0].difficulty, "Banda roja");
});

test("fusiona por ID y nunca borra sesiones locales", async () => {
  const incoming = await readJson("./fixture-training-log-external.v1.json");
  const localOnly = { ...previous, id: "local-only" };
  const added = tools.mergePayload([localOnly], incoming);
  assert.equal(added.added, 1);
  assert.equal(added.updated, 0);
  assert.equal(added.sessions.length, 2);
  assert.ok(added.sessions.some((session) => session.id === "local-only"));

  const olderLocal = {
    ...plain(tools.sessionFromRecord(incoming)),
    updatedAt: "2026-07-01T11:00:00.000Z",
  };
  const updated = tools.mergePayload([localOnly, olderLocal], incoming);
  assert.equal(updated.updated, 1);
  assert.equal(updated.sessions.length, 2);
  assert.ok(updated.sessions.some((session) => session.id === "local-only"));

  const newerLocal = {
    ...plain(tools.sessionFromRecord(incoming)),
    title: "Corrección local más reciente",
    updatedAt: "2026-09-01T11:00:00.000Z",
  };
  const skipped = tools.mergePayload([localOnly, newerLocal], incoming);
  assert.equal(skipped.skipped, 1);
  assert.equal(skipped.sessions.find((session) => session.id === incoming.session.id).title, "Corrección local más reciente");
  assert.ok(skipped.sessions.some((session) => session.id === "local-only"));
});

test("admite historial mixto y rechaza payloads incompatibles antes de fusionar", async () => {
  const history = await readJson("./fixture-training-history-mixed.v1.json");
  const merged = tools.mergePayload([previous], history);
  assert.equal(merged.incoming, 2);
  assert.equal(merged.sessions.length, 3);
  assert.ok(merged.sessions.some((session) => session.id === previous.id));

  const existingSnapshot = JSON.stringify([previous]);
  const partialInvalid = {
    schema: "training_history.v1",
    session_schema: "training_log.v1",
    sessions: [history.sessions[0], { schema: "training_log.v2", session: {}, exercises: [] }],
  };
  assert.throws(() => tools.mergePayload([previous], partialInvalid), /no compatible/i);
  assert.equal(JSON.stringify([previous]), existingSnapshot);
  assert.throws(() => tools.mergePayload([previous], { schema: "training_history.v2", sessions: [] }), /training_log\.v1/);
});
