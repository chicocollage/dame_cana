import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { plain } from "./load-browser-module.mjs";

const app = await readFile(new URL("../pwa_spec/app.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `no se encontró ${name}`);
  const open = app.indexOf("{", start);
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

const session = {
  id: "session-active",
  title: "Día A",
  finished: false,
  exercises: [{ name: "Hip thrust", entries: [{ load: "80", reps: "10", rir: "2" }] }],
};

function readDraft(stored) {
  const context = { __stored: stored, result: undefined };
  vm.runInNewContext(`
    const ACTIVE_DRAFT_KEY = "training_active_draft.v1";
    const localStorage = { getItem: () => __stored };
    const normalizeSession = (value) => ({ ...value, normalized: true });
    ${functionSource("isRestorableActiveSession")}
    ${functionSource("readActiveSessionDraft")}
    result = readActiveSessionDraft();
  `, context);
  return plain(context.result);
}

function restoreDraft(stored) {
  const context = { __stored: stored, result: undefined, __toasts: [] };
  vm.runInNewContext(`
    const ACTIVE_DRAFT_KEY = "training_active_draft.v1";
    const localStorage = { getItem: () => __stored };
    const normalizeSession = (value) => ({ ...value, normalized: true });
    let activeSession = null;
    let activeSessionIsHistoricalDraft = true;
    let renders = 0;
    const renderSession = () => { renders += 1; };
    const toast = (message) => __toasts.push(message);
    ${functionSource("isRestorableActiveSession")}
    ${functionSource("readActiveSessionDraft")}
    ${functionSource("restoreActiveSessionDraft")}
    const restored = restoreActiveSessionDraft();
    result = { restored, activeSession, activeSessionIsHistoricalDraft, renders, toasts: __toasts };
  `, context);
  return plain(context.result);
}

function persistActive(sessionValue, state) {
  const context = {
    __session: structuredClone(sessionValue),
    __state: state,
    __draftWrites: [],
    __historyWrites: [],
    __clears: 0,
    result: undefined,
  };
  vm.runInNewContext(`
    let activeSession = __session;
    let activeSessionIsHistoricalDraft = false;
    const saveStatus = { textContent: "", dataset: {} };
    const writeActiveSessionDraft = (value) => { __draftWrites.push(value); return true; };
    const readSessionsState = () => __state;
    const writeSessions = (value) => { __historyWrites.push(value); return true; };
    const clearActiveSessionDraft = () => { __clears += 1; return true; };
    const toast = () => {};
    ${functionSource("persistSession")}
    result = { saved: persistSession(), saveStatus };
  `, context);
  return { result: plain(context.result), draftWrites: context.__draftWrites, historyWrites: context.__historyWrites, clears: context.__clears };
}

test("el borrador activo conserva la sesión completa y rechaza valores finalizados o corruptos", () => {
  const stored = JSON.stringify({ schema: "training_active_draft.v1", version: 1, saved_at: "2026-08-09T12:00:00.000Z", session });
  assert.deepEqual(readDraft(stored), { ...session, normalized: true });
  assert.equal(readDraft("{json roto"), null);
  assert.equal(readDraft(JSON.stringify({ schema: "training_active_draft.v1", version: 1, session: { ...session, finished: true } })), null);
  assert.equal(readDraft(JSON.stringify({ schema: "training_active_draft.v1", version: 2, session })), null);
});

test("el arranque restaura una sesión no finalizada sin convertirla en borrador histórico", () => {
  const stored = JSON.stringify({ schema: "training_active_draft.v1", version: 1, session });
  const restored = restoreDraft(stored);
  assert.equal(restored.restored, true);
  assert.equal(restored.activeSession.id, session.id);
  assert.equal(restored.activeSession.normalized, true);
  assert.equal(restored.activeSessionIsHistoricalDraft, false);
  assert.equal(restored.renders, 1);
  assert.match(restored.toasts[0], /restaurada/i);
});

test("la persistencia protege el borrador antes de tocar un historial ilegible", () => {
  const outcome = persistActive(session, { sessions: [], error: "El historial local no se puede leer." });
  assert.equal(outcome.result.saved, false);
  assert.equal(outcome.draftWrites.length, 1);
  assert.equal(outcome.historyWrites.length, 0);
  assert.equal(outcome.clears, 0);
  assert.equal(outcome.result.saveStatus.textContent, "Borrador protegido");
});

test("una sesión confirmada desde Workout Note no entra en historial antes de finalizar", () => {
  const outcome = persistActive({ ...session, pendingHistory: true }, { sessions: [], error: "" });
  assert.equal(outcome.result.saved, true);
  assert.equal(outcome.draftWrites.length, 1);
  assert.equal(outcome.historyWrites.length, 0);
  assert.equal(outcome.result.saveStatus.textContent, "Borrador protegido");
});

test("finalizar elimina el borrador solo después de guardar el historial", () => {
  const outcome = persistActive({ ...session, finished: true }, { sessions: [], error: "" });
  assert.equal(outcome.result.saved, true);
  assert.equal(outcome.draftWrites.length, 0);
  assert.equal(outcome.historyWrites.length, 1);
  assert.equal(outcome.clears, 1);
});

test("el ciclo de vida guarda al ocultarse y al cerrar la PWA", () => {
  assert.match(app, /document\.visibilityState === "hidden"\) checkpointActiveSession\(\)/);
  assert.match(app, /window\.addEventListener\("pagehide", \(\) => \{\s+checkpointActiveSession\(\)/);
});
