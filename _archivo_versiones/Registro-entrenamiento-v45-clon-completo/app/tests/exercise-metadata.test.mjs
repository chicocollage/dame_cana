import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule } from "./load-browser-module.mjs";

const { combine, infer, loadBasisFrom, resistanceMode } = await loadBrowserModule(
  "../public/app/exercise-metadata.js",
  "TrainingExerciseMetadata",
);

test("detecta identidad explícita y conserva correcciones compatibles", () => {
  const machine = infer({ name: "Remo bajo en máquina Technogym", cue: "Asiento 4 · marcador" });
  assert.equal(machine.resistanceMode, "external");
  assert.equal(machine.variant, "Máquina Technogym");
  assert.match(machine.settings, /Asiento 4/i);
  assert.equal(machine.loadBasis, "machine_stack_kg");

  const trx = infer({ name: "Remo en TRX", identityText: "correas altura 5 · pies en marca 3" });
  assert.equal(trx.resistanceMode, "trx");
  assert.equal(trx.variant, "TRX");
  assert.match(trx.settings, /pies en marca 3/i);
  assert.equal(resistanceMode("Dominadas pronas"), "bodyweight");
  assert.equal(resistanceMode("Dominadas asistidas en máquina"), "external");

  const inherited = combine(trx, {
    resistanceMode: "trx",
    variant: "TRX alto",
    settings: "pies marca 2",
    loadBasis: "unknown",
  });
  assert.equal(inherited.variant, "TRX alto");
  assert.equal(inherited.detected, false);

  const changedMode = combine(trx, {
    resistanceMode: "external",
    variant: "Máquina",
    settings: "asiento 3",
    loadBasis: "machine_stack_kg",
  });
  assert.equal(changedMode.resistanceMode, "trx");
  assert.equal(changedMode.detected, true);
});

test("no confunde repeticiones por lado con carga por lado", () => {
  assert.equal(loadBasisFrom("10 repeticiones por lado"), "unknown");
  assert.equal(loadBasisFrom("20 kg por lado"), "per_side_kg");
});
