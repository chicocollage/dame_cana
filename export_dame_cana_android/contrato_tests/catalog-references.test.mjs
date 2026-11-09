import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const tools = await loadBrowserModule("../pwa_spec/history-tools.js", "TrainingHistoryTools");
const catalog = await loadBrowserModule("../pwa_spec/exercise-catalog.js", "TrainingExerciseCatalog");
const app = await readFile(new URL("../pwa_spec/app.js", import.meta.url), "utf8");
const start = app.indexOf("  function catalogExercise(");
const source = app.slice(start, app.indexOf("  function startTemplate(", start));
const identity = { resistanceMode: "external", variant: "Máquina DHZ", settings: "respaldo 3", loadBasis: "machine_stack_kg" };
const record = (id, date, overrides = {}) => ({ id, date, exercises: [{ name: "Hip thrust en máquina", identity, entries: [{ load: "80", reps: "10", rir: "2" }], ...overrides }] });
const records = [record("first", "2026-01-01"), record("second", "2026-02-01"), record("third", "2026-03-01"), record("fourth", "2026-04-01")];

function createExercise(sessions, item = catalog.byId.get("E001")) {
  const context = { TrainingHistoryTools: tools, readSessions: () => sessions, uid: () => "new-set", item, result: null };
  vm.runInNewContext(`${source}\nresult = catalogExercise(item, {});`, context);
  return plain(context.result);
}

test("máquina con tilde recibe una variante y cable usa la identidad del parser", () => {
  assert.equal(catalog.byId.get("E001").variant, "Máquina");
  assert.equal(catalog.byId.get("E020").variant, "Cable / polea");
});

test("añadir hip thrust recupera la identidad registrada y muestra las tres últimas referencias", () => {
  const exercise = createExercise(records);
  assert.equal(exercise.identity.variant, identity.variant);
  assert.equal(exercise.identity.settings, identity.settings);
  assert.equal(exercise.identity.loadBasis, identity.loadBasis);
  const active = { id: "active", date: "2026-10-06", exercises: [exercise] };
  assert.deepEqual(plain(tools.findComparableHistory(active, 0, records).map((ref) => ref.session.id)), ["fourth", "third", "second"]);
  assert.deepEqual(exercise.entries.map(({ load, reps, rir, completed }) => ({ load, reps, rir, completed })), [{ load: "", reps: "", rir: "", completed: false }]);
});

test("identidad desconocida de registros antiguos se conserva sin imponer carga total", () => {
  const legacy = record("legacy", "2026-01-01", { identity: undefined });
  const exercise = createExercise([legacy]);
  assert.equal(exercise.identity.loadBasis, "unknown");
  assert.equal(tools.findComparable({ id: "active", date: "2026-10-06", exercises: [exercise] }, 0, [legacy]).session.id, "legacy");
});

test("no hereda otros nombres, modos, sesiones futuras o ejercicios sin datos", () => {
  const invalid = [record("smith", "2026-06-01", { name: "Hip thrust en Smith" }), record("trx", "2026-07-01", { identity: { resistanceMode: "trx" } }), record("empty", "2026-08-01", { entries: [{ load: "", reps: "" }] }), record("future", "2099-01-01")];
  assert.equal(createExercise(invalid).identity.variant, "Máquina");
  assert.equal(createExercise(invalid).identity.loadBasis, "total_kg");
});

test("buscar otra identidad no relaja la comparación entre máquinas o ajustes", () => {
  const current = createExercise([]);
  assert.equal(tools.findComparable({ id: "active", date: "2026-10-06", exercises: [current] }, 0, records), null);
  assert.equal(tools.latestRecordedExercise(current, records, "2026-10-06", "active").session.id, "fourth");
  const changed = { ...current, identity: { ...identity, settings: "respaldo 4" } };
  assert.equal(tools.comparableExercises(changed, records[0].exercises[0]), false);
});

test("una sesión ya abierta ofrece recuperar identidad sin modificar sus series", () => {
  const exercise = createExercise([]);
  exercise.entries[0].load = "70";
  exercise.entries[0].reps = "8";
  const active = { id: "active", date: "2026-10-06", exercises: [exercise] };
  const original = JSON.stringify(active);
  const lines = [];
  const button = { dataset: {}, hidden: true, textContent: "" };
  const panel = { querySelector: (selector) => selector === "button" ? button : { replaceChildren: (...nodes) => lines.push(...nodes.map((node) => node.textContent)) } };
  const renderStart = app.indexOf("  function renderComparable(");
  const renderSource = app.slice(renderStart, app.indexOf("  function renderSession(", renderStart));
  vm.runInNewContext(`${renderSource}\nrenderComparable(0, card);`, {
    TrainingHistoryTools: tools, activeSession: active, activeSessionIsHistoricalDraft: false,
    readSessions: () => records, card: { querySelector: () => panel }, document: { createElement: () => ({ textContent: "" }) }
  });
  assert.equal(button.hidden, false);
  assert.equal(button.dataset.referenceAction, "identity");
  assert.equal(button.textContent, "Recuperar identidad anterior");
  assert.match(lines[0], /Hay registros/);
  assert.equal(JSON.stringify(active), original);
});
