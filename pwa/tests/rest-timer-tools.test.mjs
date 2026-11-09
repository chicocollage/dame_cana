import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const timer = await loadBrowserModule("../public/app/rest-timer-tools.js", "TrainingRestTimerTools");
const NOW = Date.parse("2026-08-02T10:00:00.000Z");

test("representa los estados idle, running, paused y complete", () => {
  assert.deepEqual(plain(timer.snapshot({ selectedSeconds: 120 }, NOW)), {
    remaining: 120,
    total: 120,
    ratio: 1,
    status: "idle",
    stage: "full",
  });

  const running = timer.snapshot({
    selectedSeconds: 120,
    endsAt: NOW + 90_000,
    total: 120,
  }, NOW);
  assert.equal(running.remaining, 90);
  assert.equal(running.status, "running");
  assert.equal(running.ratio, 0.75);
  assert.equal(running.stage, "full");

  const paused = timer.snapshot({ selectedSeconds: 120, remaining: 45, total: 120 }, NOW);
  assert.equal(paused.remaining, 45);
  assert.equal(paused.status, "paused");
  assert.equal(paused.ratio, 0.375);
  assert.equal(paused.stage, "middle");

  const complete = timer.snapshot({ selectedSeconds: 120, remaining: 45, total: 120, complete: true }, NOW);
  assert.equal(complete.remaining, 0);
  assert.equal(complete.status, "complete");
  assert.equal(complete.ratio, 0);
  assert.equal(complete.stage, "ending");
});

test("limita el ratio entre cero y uno y aplica las fases en sus umbrales", () => {
  const over = timer.snapshot({ endsAt: NOW + 200_000, total: 100 }, NOW);
  assert.equal(over.ratio, 1);
  assert.equal(over.stage, "full");

  const elapsed = timer.snapshot({ endsAt: NOW - 1_000, total: 100 }, NOW);
  assert.equal(elapsed.remaining, 0);
  assert.equal(elapsed.ratio, 0);
  assert.equal(elapsed.status, "running", "el controlador completa los efectos de un reloj vencido");
  assert.equal(elapsed.stage, "ending");

  assert.equal(timer.snapshot({ remaining: 51, total: 100 }, NOW).stage, "full");
  assert.equal(timer.snapshot({ remaining: 50, total: 100 }, NOW).stage, "middle");
  assert.equal(timer.snapshot({ remaining: 21, total: 100 }, NOW).stage, "middle");
  assert.equal(timer.snapshot({ remaining: 20, total: 100 }, NOW).stage, "ending");
});

test("al pausar redondea hacia arriba y no devuelve tiempo tras el vencimiento", () => {
  assert.equal(timer.pausedSeconds(NOW + 10_001, NOW), 11);
  assert.equal(timer.pausedSeconds(NOW + 10_000, NOW), 10);
  assert.equal(timer.pausedSeconds(NOW, NOW), 0);
  assert.equal(timer.pausedSeconds(NOW - 5_000, NOW), 0);
});

test("aÃ±ade 30 segundos durante la ejecuciÃ³n", () => {
  const extended = plain(timer.extend({
    selectedSeconds: 120,
    endsAt: NOW + 60_000,
    remaining: 0,
    total: 120,
  }, 30));
  assert.deepEqual(extended, {
    endsAt: NOW + 90_000,
    remaining: 0,
    total: 150,
  });

  const snapshot = timer.snapshot({ ...extended, selectedSeconds: 120 }, NOW);
  assert.equal(snapshot.status, "running");
  assert.equal(snapshot.remaining, 90);
  assert.equal(snapshot.total, 150);
  assert.equal(snapshot.ratio, 0.6);
});

test("aÃ±ade 30 segundos durante la pausa", () => {
  const extended = plain(timer.extend({
    selectedSeconds: 120,
    endsAt: 0,
    remaining: 45,
    total: 120,
  }, 30));
  assert.deepEqual(extended, {
    endsAt: 0,
    remaining: 75,
    total: 150,
  });

  const snapshot = timer.snapshot({ ...extended, selectedSeconds: 120 }, NOW);
  assert.equal(snapshot.status, "paused");
  assert.equal(snapshot.remaining, 75);
  assert.equal(snapshot.total, 150);
  assert.equal(snapshot.ratio, 0.5);
  assert.equal(snapshot.stage, "middle");
});

test("admite ajustes firmados y bloquea el temporizador en cero", () => {
  const reduced = plain(timer.adjust({
    selectedSeconds: 120,
    endsAt: NOW + 20_000,
    total: 120,
  }, -15, NOW));
  assert.deepEqual(reduced, {
    endsAt: NOW + 5_000,
    remaining: 0,
    total: 120,
    reachedZero: false,
  });

  const completed = plain(timer.adjust({
    selectedSeconds: 120,
    endsAt: NOW + 10_000,
    total: 120,
  }, -15, NOW));
  assert.deepEqual(completed, {
    endsAt: 0,
    remaining: 0,
    total: 120,
    reachedZero: true,
  });

  const expiredAtAdjustment = plain(timer.adjust({
    selectedSeconds: 120,
    endsAt: NOW - 1_000,
    total: 120,
  }, -15, NOW));
  assert.deepEqual(expiredAtAdjustment, {
    endsAt: 0,
    remaining: 0,
    total: 120,
    reachedZero: true,
  });
});

test("parseNfcTrigger valida ?descanso= de la etiqueta NFC", () => {
  assert.deepEqual(plain(timer.parseNfcTrigger("?descanso=90&t=abc")), { seconds: 90, id: "abc" });
  assert.deepEqual(plain(timer.parseNfcTrigger("descanso=60")), { seconds: 60, id: "" });
  for (const bad of ["", "?descanso=", "?descanso=abc", "?descanso=9", "?descanso=1801", "?descanso=-5", "?descanso=90.5", "?x=1", null, undefined]) {
    assert.equal(timer.parseNfcTrigger(bad), null, String(bad));
  }
});

test("parseNfcCommand distingue descanso, pausa y entradas inválidas", () => {
  assert.deepEqual(plain(timer.parseNfcCommand("?descanso=90&t=x")), { type: "rest", seconds: 90, id: "x" });
  assert.deepEqual(plain(timer.parseNfcCommand("?accion=pausa")), { type: "toggle", id: "" });
  assert.deepEqual(plain(timer.parseNfcCommand("?accion=pausa&t=7")), { type: "toggle", id: "7" });
  for (const bad of ["", "?accion=borrar", "?accion=", "?descanso=5", null, undefined]) {
    assert.equal(timer.parseNfcCommand(bad), null, String(bad));
  }
});

test("buildClockIntent genera los intents de la app Reloj y rechaza valores inválidos", () => {
  const set = timer.buildClockIntent("set", 90, "Descanso");
  assert.match(set, /^intent:\/\/#Intent;action=android\.intent\.action\.SET_TIMER;/);
  assert.match(set, /;i\.android\.intent\.extra\.alarm\.LENGTH=90;/);
  assert.match(set, /;B\.android\.intent\.extra\.alarm\.SKIP_UI=true;/);
  assert.match(set, /;end;$/);
  assert.match(timer.buildClockIntent("set", 45.9), /LENGTH=45;/);
  assert.match(timer.buildClockIntent("set", 30, "a;b"), /MESSAGE=a%3Bb;end;$/);
  assert.equal(timer.buildClockIntent("dismiss"), "intent://#Intent;action=android.intent.action.DISMISS_TIMER;end;");
  for (const bad of [0, -5, NaN, 86401, "x", null]) assert.equal(timer.buildClockIntent("set", bad), "", String(bad));
  assert.equal(timer.buildClockIntent("otro", 60), "");
});
