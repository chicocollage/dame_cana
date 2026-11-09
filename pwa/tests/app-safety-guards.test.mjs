import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const app = await readFile(new URL("../public/app/app.js", import.meta.url), "utf8");
const historyTools = await loadBrowserModule("../public/app/history-tools.js", "TrainingHistoryTools");

function functionSource(name) {
  const functionStart = app.indexOf(`function ${name}`);
  assert.notEqual(functionStart, -1, `no se encontró ${name}`);
  const start = app.slice(Math.max(0, functionStart - 6), functionStart) === "async " ? functionStart - 6 : functionStart;
  const open = app.indexOf("{", functionStart);
  let depth = 0;
  for (let index = open; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    else if (app[index] === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(start, index + 1);
    }
  }
  throw new Error(`no se pudo aislar ${name}`);
}

function readState(stored) {
  const context = {
    __stored: stored,
    result: null,
  };
  vm.runInNewContext(`
    const STORAGE_KEY = "registro-entrenamiento-v1";
    const localStorage = { getItem: () => __stored };
    const normalizeSession = (session) => ({ ...session, normalized: true });
    ${functionSource("readSessionsState")}
    result = readSessionsState();
  `, context);
  return plain(context.result);
}

function modeInputBody() {
  const startMarker = 'exerciseList.addEventListener("input", async (event) => {';
  const endMarker = 'exerciseList.addEventListener("click", (event) => {';
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return app.slice(start + startMarker.length, app.lastIndexOf("});", end));
}

async function changeMode(session, nextMode, accepted) {
  const target = {
    dataset: { exercise: "0", identityField: "resistanceMode" },
    value: nextMode,
    matches(selector) { return selector === "[data-identity-field]"; },
  };
  const context = {
    __session: structuredClone(session),
    __target: target,
    __accepted: accepted,
    result: null,
  };
  await vm.runInNewContext(`(async () => {
    let activeSession = __session;
    const exerciseList = { querySelector: () => null };
    const window = { scrollY: 0, scrollTo() {} };
    const event = { target: __target };
    const persistSession = () => {};
    const updateProgress = () => {};
    const renderSession = () => {};
    const requestAnimationFrame = () => {};
    const toast = () => {};
    const requestConfirmation = async () => __accepted;
    const handler = async (event) => { ${modeInputBody()} };
    await handler(event);
    result = { session: activeSession, targetValue: event.target.value };
  })()`, context);
  return plain(context.result);
}

async function validateHistoricalDraft(session) {
  const writes = [];
  const toasts = [];
  const context = {
    TrainingHistoryTools: historyTools,
    __session: structuredClone(session),
    __writes: writes,
    __toasts: toasts,
    result: null,
  };
  await vm.runInNewContext(`(async () => {
    let activeSession = __session;
    let activeSessionIsHistoricalDraft = true;
    const normalizedTitle = (value) => String(value || "").trim().toLowerCase();
    const toast = (message) => __toasts.push(message);
    const readSessionsState = () => ({ sessions: [{ id: "existing" }], error: "" });
    const writeSessions = (sessions) => { __writes.push(sessions); return true; };
    const requestConfirmation = async () => true;
    const localStorage = { removeItem() {} };
    const HISTORICAL_DRAFT_KEY = "draft";
    const renderSession = () => {};
    ${functionSource("saveHistoricalDraft")}
    result = await saveHistoricalDraft();
  })()`, context);
  return { result: context.result, toasts, writes };
}

async function runDelete(sessions, targetId, confirmed, activeId = null) {
  const writes = [];
  const toasts = [];
  const context = {
    __sessions: structuredClone(sessions),
    __targetId: targetId,
    __confirmed: confirmed,
    __activeId: activeId,
    __writes: writes,
    __toasts: toasts,
    result: null,
  };
  await vm.runInNewContext(`(async () => {
    let activeSession = __activeId ? __sessions.find((session) => session.id === __activeId) : null;
    let activeSessionIsHistoricalDraft = false;
    const readSessionsState = () => ({ sessions: __sessions.map((session) => ({ ...session })), error: "" });
    const writeSessions = (next) => { __writes.push(next); return true; };
    const clearActiveSessionDraft = () => { resultDraftCleared = true; };
    const requestConfirmation = async () => __confirmed;
    const toast = (message) => __toasts.push(message);
    const renderHistory = () => {};
    let resultDraftCleared = false;
    ${functionSource("deleteSession")}
    const deleted = await deleteSession(__targetId);
    result = { deleted, activeSession, activeSessionIsHistoricalDraft, draftCleared: resultDraftCleared };
  })()`, context);
  return { result: plain(context.result), writes, toasts };
}

test("readSessionsState distingue historial vacío, válido e ilegible", () => {
  assert.deepEqual(readState(null), { sessions: [], error: "" });
  assert.match(readState("").error, /historial local no se puede leer/i);
  assert.deepEqual(readState('[{"id":"one","exercises":[]}]'), {
    sessions: [{ id: "one", exercises: [], normalized: true }],
    error: "",
  });

  for (const invalid of ["{json roto", '{"id":"no-es-lista"}', "null", '[{"id":"sin-ejercicios"}]']) {
    const state = readState(invalid);
    assert.deepEqual(state.sessions, []);
    assert.match(state.error, /historial local no se puede leer/i);
  }
});

test("elimina exactamente una sesión por id y respeta la confirmación", async () => {
  const sessions = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const cancelled = await runDelete(sessions, "B", false);
  assert.equal(cancelled.result.deleted, false);
  assert.deepEqual(cancelled.writes, []);

  const middle = await runDelete(sessions, "B", true);
  assert.equal(middle.result.deleted, true);
  assert.deepEqual(middle.writes[0].map((session) => session.id), ["A", "C"]);

  const active = await runDelete(sessions, "C", true, "C");
  assert.equal(active.result.deleted, true);
  assert.equal(active.result.activeSession, null);
  assert.equal(active.result.draftCleared, true);
  assert.deepEqual(active.writes[0].map((session) => session.id), ["A", "B"]);
});

test("persistencia, importación y alta usan el guard estricto antes de escribir", () => {
  for (const name of ["persistSession", "importHistoryFile", "saveHistoricalDraft"]) {
    const source = functionSource(name);
    assert.match(source, /readSessionsState\(\)/, `${name} debe usar readSessionsState`);
    assert.match(source, /state\.error/, `${name} debe comprobar el error de lectura`);
    assert.ok(source.indexOf("state.error") < source.indexOf("writeSessions"), `${name} debe bloquear antes de escribir`);
  }
});

test("cambiar de carga externa a TRX exige confirmación y limpia cargas solo al aceptar", async () => {
  const session = {
    updatedAt: "",
    exercises: [{
      identity: { resistanceMode: "external", loadBasis: "total_kg", detected: false },
      entries: [{ load: "50", difficulty: "", reps: "10", rir: "2" }],
    }],
  };
  const rejected = await changeMode(session, "trx", false);
  assert.equal(rejected.targetValue, "external");
  assert.equal(rejected.session.exercises[0].identity.resistanceMode, "external");
  assert.equal(rejected.session.exercises[0].entries[0].load, "50");

  const accepted = await changeMode(session, "trx", true);
  assert.equal(accepted.targetValue, "trx");
  assert.equal(accepted.session.exercises[0].identity.resistanceMode, "trx");
  assert.equal(accepted.session.exercises[0].identity.loadBasis, "unknown");
  assert.equal(accepted.session.exercises[0].entries[0].load, "");
  assert.equal(accepted.session.exercises[0].entries[0].reps, "10");
  assert.equal(accepted.session.exercises[0].entries[0].rir, "2");
});

test("cambiar de TRX a external limpia dificultades incompatibles", async () => {
  const session = {
    updatedAt: "",
    exercises: [{
      identity: { resistanceMode: "trx", loadBasis: "unknown", detected: false },
      entries: [{ load: "", difficulty: "pies marca 3", reps: "12", rir: "2" }],
    }],
  };
  const accepted = await changeMode(session, "external", true);
  assert.equal(accepted.session.exercises[0].identity.resistanceMode, "external");
  assert.equal(accepted.session.exercises[0].entries[0].difficulty, "");
  assert.equal(accepted.session.exercises[0].entries[0].reps, "12");
  assert.equal(accepted.session.exercises[0].entries[0].rir, "2");
});

test("la UI deshabilita base fuera de external y el alta revalida incompatibilidades", async () => {
  const renderSource = functionSource("renderSession");
  assert.match(renderSource, /loadBasis\.disabled = identity\.resistanceMode !== "external"/);

  const baseSession = {
    id: "draft",
    title: "Histórico",
    date: "2026-07-20T12:00:00",
    exercises: [{
      name: "Remo",
      identity: { resistanceMode: "external", loadBasis: "unknown" },
      entries: [{ load: "", difficulty: "pies marca 3", reps: "12", rir: "2" }],
    }],
  };
  const externalInvalid = await validateHistoricalDraft(baseSession);
  assert.equal(externalInvalid.result, false);
  assert.equal(externalInvalid.writes.length, 0);
  assert.match(externalInvalid.toasts[0], /Revisa el tipo de resistencia/);

  const trxInvalid = await validateHistoricalDraft({
    ...baseSession,
    exercises: [{
      ...baseSession.exercises[0],
      identity: { resistanceMode: "trx", loadBasis: "total_kg" },
      entries: [{ load: "20", difficulty: "pies marca 3", reps: "12", rir: "2" }],
    }],
  });
  assert.equal(trxInvalid.result, false);
  assert.equal(trxInvalid.writes.length, 0);
  assert.match(trxInvalid.toasts[0], /Revisa el tipo de resistencia/);
});
