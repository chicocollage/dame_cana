import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const { parseWorkout, parseWorkoutNoteV1 } = await loadBrowserModule("../public/app/parser.js", "TrainingParser");

test("interpreta notas compactas, bloques e identidad explícita", () => {
  const markdown = parseWorkout(`# Día A · Glúteo y torso
1. Hip thrust en máquina — 3 × 8–10 · RIR 2 · descanso 2–3 min · Pausa arriba.
2. Búlgara — 3x8-12 por lado · RIR 1-2`);
  assert.equal(markdown.title, "Día A · Glúteo y torso");
  assert.equal(markdown.exercises.length, 2);
  assert.deepEqual(plain(markdown.exercises[0]), {
    name: "Hip thrust en máquina",
    sets: 3,
    repsMin: 8,
    repsMax: 10,
    targetRir: "2",
    rest: "2–3 min",
    perSide: false,
    cue: "Pausa arriba.",
    identityText: "",
  });
  assert.equal(markdown.exercises[1].perSide, true);
  assert.equal(markdown.exercises[1].cue, "");

  const blocks = parseWorkout(`Entrenamiento: Torso
Ejercicio: Remo con pecho apoyado
Series: 3
Repeticiones: 8 a 12
RIR: 2
Descanso: 2 min
Técnica: Pecho estable.`);
  assert.equal(blocks.title, "Torso");
  assert.equal(blocks.exercises.length, 1);
  assert.equal(blocks.exercises[0].repsMax, 12);
  assert.equal(blocks.exercises[0].cue, "Pecho estable.");

  const identified = parseWorkout(`# Tirón
1. Remo sentado — 3 × 10 · RIR 2
Identidad: Máquina Technogym · asiento 4 · marcador`);
  assert.equal(identified.exercises[0].identityText, "Máquina Technogym · asiento 4 · marcador");

  const identifiedBlock = parseWorkout(`Entrenamiento: TRX
Ejercicio: Remo en TRX
Series: 3
Repeticiones: 12
Identidad: correas altura 5 · pies en marca 3`);
  assert.equal(identifiedBlock.exercises[0].identityText, "correas altura 5 · pies en marca 3");
  assert.ok(parseWorkout("Hoy entrenamos fuerte").error);
});

test("no inventa resultados realizados", () => {
  const parsed = parseWorkout("1. Press banca — 3 × 8–10 · RIR 2");
  assert.equal(parsed.exercises.length, 1);
  assert.equal("entries" in parsed.exercises[0], false);
  assert.equal("actualRir" in parsed.exercises[0], false);
});

test("Workout Note v1 conserva prescripción, referencias e instrucciones sin crear resultados", async () => {
  const source = await readFile(new URL("./fixtures/workout-note-v1/principal.txt", import.meta.url), "utf8");
  const draft = plain(parseWorkoutNoteV1(source));

  assert.equal(draft.schema, "workout_note_draft.v1");
  assert.equal(draft.rawText, source.replace(/\r\n?/g, "\n"));
  assert.deepEqual(draft.session, {
    label: "Día A",
    focusText: "Glúteo + pecho, dorsal y hombro",
    rawHeader: "Día A — Glúteo + pecho, dorsal y hombro"
  });
  assert.equal(draft.exercises.length, 4);
  assert.deepEqual(draft.exercises.map((exercise) => exercise.name), [
    "Hip thrust en máquina",
    "Sentadilla Hack Matrix",
    "Press inclinado convergente en máquina",
    "Jalón al pecho agarre medio/neutro"
  ]);

  const [hip, hack, press, jalon] = draft.exercises;
  assert.deepEqual(hip.prescription, {
    sets: 3, repsMin: 6, repsMax: 10, targetRirMin: 1, targetRirMax: 2,
    restSecondsMin: 180, restSecondsMax: 240, perSide: false
  });
  assert.equal(hip.comparableRecord.rawDate, "05/08");
  assert.equal(hip.comparableRecord.dateIso, null);
  assert.equal(hip.comparableRecord.sets.length, 2);
  assert.deepEqual(hip.comparableRecord.sets.map((item) => item.rawText), ["60 kg × 10 @2", "60 kg × 10 @2"]);
  assert.deepEqual(hip.instructions.slice(0, 2).map((item) => item.type), ["today", "target"]);
  assert.equal(hip.instructions.at(-1).type, "other");

  assert.equal(hack.comparableRecord, null);
  assert.equal(hack.prescription.restSecondsMin, 180);
  assert.deepEqual(hack.instructions.filter((item) => ["depth", "record"].includes(item.type)).map((item) => item.type), ["depth", "record"]);

  assert.equal(press.comparableRecord, null);
  assert.deepEqual(press.historicalMentions, [{
    rawText: "Sí tenemos press horizontal reciente a 20 kg, pero no trasladaría esa carga porque es otra geometría.",
    comparable: false,
    rawDate: null,
    dateIso: null,
    explicitLoad: { value: 20, unit: "kg" }
  }]);
  assert.equal(press.prescription.restSecondsMax, 180);

  assert.equal(jalon.comparableRecord.rawDate, "03/08");
  assert.equal(jalon.comparableRecord.dateIso, null);
  assert.deepEqual(jalon.comparableRecord.sets, []);
  assert.equal(jalon.comparableRecord.status, "partial");
  assert.ok(draft.fragments.every((item) => ["parsed", "partial", "unresolved"].includes(item.status)));
  assert.equal("entries" in hip, false);
});

test("Workout Note v1 admite variantes tipográficas y conserva casos no comparables", () => {
  const draft = plain(parseWorkoutNoteV1(`Día B — Prueba

Press — 3 x 6-10
RIR 2 · Descanso 3 min
Registro previo: 60kg x10 @2, el 2026-08-05.

Press — 3×8
RIR 1-2 · Descanso 90 s
Registro comparable: ninguno comparable.
Línea desconocida que debe seguir presente.`));
  assert.equal(draft.exercises.length, 2);
  assert.deepEqual(draft.exercises.map((exercise) => exercise.prescription.repsMax), [10, 8]);
  assert.deepEqual(draft.exercises.map((exercise) => exercise.prescription.targetRirMax), [2, 2]);
  assert.deepEqual(draft.exercises.map((exercise) => exercise.prescription.restSecondsMin), [180, 90]);
  assert.equal(draft.exercises[0].comparableRecord.dateIso, "2026-08-05");
  assert.equal(draft.exercises[0].comparableRecord.sets[0].rawText, "60kg x10 @2");
  assert.equal(draft.exercises[1].comparableRecord, null);
  assert.ok(draft.exercises[1].instructions.some((item) => item.rawText === "Línea desconocida que debe seguir presente."));
  assert.ok(draft.exercises[1].fragments.some((item) => item.rawText === "Línea desconocida que debe seguir presente."));
});

test("Workout Note v1 reconoce RIR textual en referencias sin inventar fechas ni valores", () => {
  const draft = plain(parseWorkoutNoteV1(`Día C

Remo — 3 × 8
RIR 2 · Descanso 90 s
Último registro: 60 kg × 10 RIR 2, el 05/08.`));
  const record = draft.exercises[0].comparableRecord;
  assert.equal(record.rawDate, "05/08");
  assert.equal(record.dateIso, null);
  assert.deepEqual(record.sets[0], {
    load: 60, loadUnit: "kg", reps: 10, rir: 2,
    rawText: "60 kg × 10 RIR 2", status: "parsed"
  });
});

const fixture = async (name) => plain(parseWorkoutNoteV1(
  await readFile(new URL(`./fixtures/workout-note-v1/${name}.txt`, import.meta.url), "utf8")
));

test("corpus v1: conserva encabezados y variantes de series/repeticiones", async () => {
  const cases = [
    ["01-header-hyphen", "Día B", "Espalda + hombro", 3, 6, 10],
    ["02-header-leg", "Día C", "Pierna", 2, 12, 12],
    ["03-spec-unicode-range", "Día A", "Prueba", 3, 6, 10],
    ["04-spec-ascii-range", "Día A", "Prueba", 3, 6, 10],
    ["05-spec-uppercase-x", "Día A", "Prueba", 3, 6, 10],
    ["06-spec-single", "Día A", "Prueba", 3, 8, 8]
  ];
  for (const [name, label, focusText, sets, repsMin, repsMax] of cases) {
    const draft = await fixture(name);
    const exercise = draft.exercises[0];
    assert.equal(draft.exercises.length, 1, name);
    assert.equal(draft.session.label, label, name);
    assert.equal(draft.session.focusText, focusText, name);
    assert.deepEqual(exercise.prescription, {
      sets, repsMin, repsMax, targetRirMin: null, targetRirMax: null,
      restSecondsMin: null, restSecondsMax: null, perSide: false
    }, name);
  }
});

test("corpus v1: normaliza RIR y descanso a números internos", async () => {
  const rirCases = [
    ["07-rir-unicode-range", 1, 2],
    ["08-rir-ascii-range", 1, 2],
    ["09-rir-single", 2, 2],
    ["10-rir-colon", 2, 2]
  ];
  for (const [name, min, max] of rirCases) {
    const exercise = (await fixture(name)).exercises[0];
    assert.equal(exercise.prescription.targetRirMin, min, name);
    assert.equal(exercise.prescription.targetRirMax, max, name);
  }
  const restCases = [
    ["11-rest-unicode-range", 180, 240],
    ["12-rest-ascii-range", 180, 240],
    ["13-rest-single-min", 180, 180],
    ["14-rest-90s", 90, 90],
    ["15-rest-120s", 120, 120]
  ];
  for (const [name, min, max] of restCases) {
    const exercise = (await fixture(name)).exercises[0];
    assert.equal(exercise.prescription.restSecondsMin, min, name);
    assert.equal(exercise.prescription.restSecondsMax, max, name);
  }
});

test("corpus v1: reconoce referencias históricas simples y múltiples", async () => {
  const cases = [
    ["16-record-at", 60, 10, 2],
    ["17-record-tight", 60, 10, 2],
    ["18-record-rir", 60, 10, 2],
    ["19-record-at-one", 60, 10, 1]
  ];
  for (const [name, load, reps, rir] of cases) {
    const record = (await fixture(name)).exercises[0].comparableRecord;
    assert.equal(record.status, "parsed", name);
    assert.deepEqual(record.sets[0].load, load, name);
    assert.deepEqual(record.sets[0].reps, reps, name);
    assert.deepEqual(record.sets[0].rir, rir, name);
  }
  const multiple = (await fixture("20-record-multiple")).exercises[0].comparableRecord;
  assert.equal(multiple.sets.length, 2);
  assert.deepEqual(multiple.sets.map((item) => item.rir), [2, 2]);
});

test("corpus v1: no inventa fechas y deja variantes no soportadas como parciales", async () => {
  const short = (await fixture("21-date-short")).exercises[0].comparableRecord;
  assert.equal(short.rawDate, "05/08");
  assert.equal(short.dateIso, null);

  const oneDigit = (await fixture("22-date-one-digit")).exercises[0].comparableRecord;
  assert.equal(oneDigit.rawDate, "5/8");
  assert.equal(oneDigit.dateIso, null);
  assert.equal(oneDigit.status, "parsed");

  const withYear = (await fixture("23-date-with-year")).exercises[0].comparableRecord;
  assert.equal(withYear.dateIso, "2026-08-05");
  assert.equal(withYear.status, "parsed");
  assert.equal(withYear.rawDate, "05/08/2026");
  assert.match(withYear.rawText, /05\/08\/2026/);

  for (const [name, rawDate] of [["35-date-short-zero-day", "05/8"], ["36-date-short-zero-month", "5/08"]]) {
    const record = (await fixture(name)).exercises[0].comparableRecord;
    assert.equal(record.rawDate, rawDate, name);
    assert.equal(record.dateIso, null, name);
  }
  const invalid = (await fixture("37-date-with-year-invalid")).exercises[0].comparableRecord;
  assert.equal(invalid.rawDate, "31/02/2026");
  assert.equal(invalid.dateIso, null);
});

test("corpus v1: conserva la ausencia de referencia sin fabricar resultados", async () => {
  const noneComparable = (await fixture("24-none-comparable")).exercises[0];
  const noTengo = (await fixture("25-no-tengo")).exercises[0];
  const plainNone = (await fixture("26-ninguno")).exercises[0];
  assert.equal(noneComparable.comparableRecord, null);
  assert.equal(noTengo.comparableRecord, null);
  assert.equal(plainNone.comparableRecord, null);
  for (const exercise of [noneComparable, noTengo, plainNone]) {
    assert.ok(exercise.fragments.some((item) => item.category === "comparable-record"));
    assert.equal("entries" in exercise, false);
  }
});

test("corpus v1: blinda menciones históricas no comparables", async () => {
  for (const [name, load] of [["27-noncomparable-press", 20], ["28-noncomparable-machine", 70]]) {
    const exercise = (await fixture(name)).exercises[0];
    assert.equal(exercise.comparableRecord, null, name);
    assert.equal(exercise.historicalMentions.length, 1, name);
    assert.equal(exercise.historicalMentions[0].comparable, false, name);
    assert.equal(exercise.historicalMentions[0].explicitLoad.value, load, name);
    assert.equal(exercise.prescription.load, undefined, name);
  }
});

test("corpus v1: conserva datos parciales, instrucciones, texto desconocido y repetición de ejercicios", async () => {
  for (const name of ["29-partial-lost-load", "30-partial-no-reps", "31-partial-no-series"]) {
    const record = (await fixture(name)).exercises[0].comparableRecord;
    assert.equal(record.status, "partial", name);
    assert.deepEqual(record.sets, [], name);
  }

  const instructions = (await fixture("32-instructions")).exercises[0];
  assert.deepEqual(instructions.instructions.slice(0, 4).map((item) => item.type), ["today", "target", "depth", "record"]);
  assert.equal(instructions.instructions.at(-1).type, "other");
  assert.ok(instructions.instructions.every((item) => typeof item.text === "string"));

  const unknown = (await fixture("33-unknown")).exercises[0];
  assert.ok(unknown.instructions.some((item) => item.rawText.includes("no estructurada")));
  assert.ok(unknown.fragments.some((item) => item.rawText.includes("no estructurada")));

  const repeated = await fixture("34-repeated-exercise");
  assert.deepEqual(repeated.exercises.map((item) => item.name), ["Press banca", "Press banca"]);
  assert.deepEqual(repeated.exercises.map((item) => item.prescription.sets), [3, 2]);
  assert.deepEqual(repeated.exercises.map((item) => item.prescription.repsMax), [8, 12]);
});
