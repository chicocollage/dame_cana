import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

async function loadParser() {
  const source = await readFile(new URL("../public/app/historical-parser.js", import.meta.url), "utf8");
  const context = { self: {} };
  vm.runInNewContext(source, context, { filename: "historical-parser.js" });
  return context.self.TrainingHistoricalParser;
}

test("parses an external-load historical session without transport metadata", async () => {
  const parser = await loadParser();
  const result = parser.parseHistoricalWorkout(`Fecha: 2026-07-15
Entrenamiento: Día A

Ejercicio: Hip thrust
Modo: carga externa
Variante: Máquina Technogym
Ajustes: respaldo 3
Base de carga: total
Objetivo: 3 x 8-10
RIR objetivo: 2
Descanso: 2 min
Serie 1: carga=80 kg; reps=10; rir=2
Serie 2: carga=80,5; reps=9; rir=1.5
Serie 3: carga=80; reps=8; rir=1
Notas: buena estabilidad`);

  assert.equal(result.error, "");
  assert.deepEqual(Array.from(result.warnings), []);
  assert.equal(result.draft.date, "2026-07-15T12:00:00");
  assert.equal(result.draft.title, "Día A");
  assert.equal(result.draft.finished, true);
  assert.equal("id" in result.draft, false);
  assert.equal("sourceNote" in result.draft, false);
  assert.equal("updatedAt" in result.draft, false);
  assert.equal(result.draft.exercises[0].identity.resistanceMode, "external");
  assert.equal(result.draft.exercises[0].identity.loadBasis, "total_kg");
  assert.equal(result.draft.exercises[0].entries[1].load, "80.5");
  assert.equal(result.draft.exercises[0].entries[1].rir, "1.5");
});

test("keeps TRX and bodyweight difficulty separate from external load", async () => {
  const parser = await loadParser();
  const result = parser.parseHistoricalWorkout(`Fecha: 2026-07-16
Entrenamiento: Tirón
Ejercicio: Remo
Modo: TRX
Ajustes: correas altura 5
Serie 1: dificultad=pies marca 3; reps=12; rir=2
Ejercicio: Dominadas
Modo: autocarga
Variante: banda roja
Serie 1: dificultad=banda roja; reps=8; rir=1`);

  assert.equal(result.error, "");
  assert.equal(result.draft.exercises[0].identity.resistanceMode, "trx");
  assert.equal(result.draft.exercises[0].entries[0].load, "");
  assert.equal(result.draft.exercises[0].entries[0].difficulty, "pies marca 3");
  assert.equal(result.draft.exercises[1].identity.resistanceMode, "bodyweight");
  assert.equal(result.draft.exercises[1].entries[0].difficulty, "banda roja");
});

test("preserves partial sets as blank entries without inventing results", async () => {
  const parser = await loadParser();
  const result = parser.parseHistoricalWorkout(`Fecha: 2026-07-17
Entrenamiento: Parcial
Ejercicio: Press
Modo: carga externa
Objetivo: 3 x 8-10
Serie 1: carga=40; reps=10
Serie 3: carga=40`);

  assert.equal(result.error, "");
  assert.equal(result.draft.exercises[0].sets, 3);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.draft.exercises[0].entries[1])),
    { load: "", difficulty: "", reps: "", rir: "" }
  );
  assert.equal(result.draft.exercises[0].entries[0].rir, "");
  assert.equal(result.draft.exercises[0].entries[2].reps, "");
  assert.match(result.warnings.join("\n"), /registro parcial/);
  assert.match(result.warnings.join("\n"), /falta la Serie 2/);
});

test("reports ambiguous difficulty without silently choosing TRX or bodyweight", async () => {
  const parser = await loadParser();
  const result = parser.parseHistoricalWorkout(`Fecha: 2026-07-18
Entrenamiento: Ambiguo
Ejercicio: Remo
Serie 1: dificultad=pies adelantados; reps=12`);

  assert.match(result.error, /Línea 3: .*usa dificultad pero no indica/);
  assert.equal(result.draft.exercises[0].entries[0].difficulty, "pies adelantados");
  assert.equal(result.draft.exercises[0].entries[0].rir, "");
});

test("reports resistance values and load bases incompatible with the selected mode", async () => {
  const parser = await loadParser();
  const external = parser.parseHistoricalWorkout(`Fecha: 2026-07-19
Entrenamiento: Error externo
Ejercicio: Remo
Modo: carga externa
Serie 1: dificultad=marca 3; reps=10`);
  const trx = parser.parseHistoricalWorkout(`Fecha: 2026-07-19
Entrenamiento: Error TRX
Ejercicio: Remo
Modo: TRX
Base: total
Serie 1: carga=20; reps=10`);

  assert.match(external.error, /Línea 5: dificultad no es compatible/);
  assert.match(trx.error, /Línea 6: carga no es compatible/);
  assert.match(trx.error, /Línea 5: Base de carga solo es compatible/);
});

test("defaults explicit load to external with a warning and reports syntax errors by line", async () => {
  const parser = await loadParser();
  const compatible = parser.parseHistoricalWorkout(`Fecha: 2026-07-20
Entrenamiento: Legado
Ejercicio: Curl
Serie 1: carga=12; reps=10`);
  const invalid = parser.parseHistoricalWorkout(`Fecha: 2026-02-30
Entrenamiento: Fallos
Ejercicio: Curl
Serie 1: carga 12; repeticiones=10`);

  assert.equal(compatible.error, "");
  assert.equal(compatible.draft.exercises[0].identity.resistanceMode, "external");
  assert.match(compatible.warnings.join("\n"), /Modo ausente/);
  assert.match(invalid.error, /Línea 1: Fecha no válida/);
  assert.match(invalid.error, /Línea 4: dato de serie no válido/);
  assert.match(invalid.error, /Línea 4: campo de serie no reconocido/);
});

test("requires Modo when reps or RIR appear without load, but infers external from explicit load", async () => {
  const parser = await loadParser();
  const resultsOnly = parser.parseHistoricalWorkout(`Fecha: 2026-07-20
Entrenamiento: Sin modo
Ejercicio: Curl
Serie 1: reps=10; rir=2`);
  assert.match(resultsOnly.error, /Modo ausente en «Curl»; indica carga externa, TRX o autocarga/);
  assert.equal(resultsOnly.draft.exercises[0].identity.resistanceMode, "");

  const explicitLoad = parser.parseHistoricalWorkout(`Fecha: 2026-07-20
Entrenamiento: Carga explícita
Ejercicio: Curl
Serie 1: carga=12; reps=10; rir=2`);
  assert.equal(explicitLoad.error, "");
  assert.equal(explicitLoad.draft.exercises[0].identity.resistanceMode, "external");
  assert.match(explicitLoad.warnings.join("\n"), /la carga explícita permite proponer carga externa/);
});

test("interprets Finalizado sí/no explicitly", async () => {
  const parser = await loadParser();
  const completed = parser.parseHistoricalWorkout(`Fecha: 2026-07-21
Entrenamiento: Completo
Finalizado: sí
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40; reps=10; rir=2`);
  const unfinished = parser.parseHistoricalWorkout(`Fecha: 2026-07-22
Entrenamiento: Incompleto
Finalizado: no
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40; reps=8`);

  assert.equal(completed.error, "");
  assert.equal(completed.draft.finished, true);
  assert.equal(unfinished.error, "");
  assert.equal(unfinished.draft.finished, false);

  const invalid = parser.parseHistoricalWorkout(`Fecha: 2026-07-22
Entrenamiento: Dudoso
Finalizado: quizá
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40`);
  assert.match(invalid.error, /Línea 3: Finalizado no válido/);
});

test("accepts real calendar dates and rejects invalid dates or formats", async () => {
  const parser = await loadParser();
  const leapYear = parser.parseHistoricalWorkout(`Fecha: 2024-02-29
Entrenamiento: Bisiesto
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40`);
  assert.equal(leapYear.error, "");
  assert.equal(leapYear.draft.date, "2024-02-29T12:00:00");

  const invalidDay = parser.parseHistoricalWorkout(`Fecha: 2025-02-29
Entrenamiento: Fecha imposible
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40`);
  const invalidFormat = parser.parseHistoricalWorkout(`Fecha: 21/07/2026
Entrenamiento: Formato incorrecto
Ejercicio: Press
Modo: carga externa
Serie 1: carga=40`);
  assert.match(invalidDay.error, /Línea 1: Fecha no válida/);
  assert.match(invalidFormat.error, /Línea 1: Fecha no válida/);
});

test("preserves partial and out-of-objective sets without inventing missing values", async () => {
  const parser = await loadParser();
  const result = parser.parseHistoricalWorkout(`Fecha: 2026-07-23
Entrenamiento: Parcial extendido
Finalizado: no
Ejercicio: Press
Modo: carga externa
Objetivo: 2 x 8-10
Serie 1: carga=40; reps=10; rir=2
Serie 3: carga=42`);

  assert.equal(result.error, "");
  assert.equal(result.draft.finished, false);
  assert.equal(result.draft.exercises[0].sets, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(result.draft.exercises[0].entries[1])), {
    load: "",
    difficulty: "",
    reps: "",
    rir: "",
  });
  assert.equal(result.draft.exercises[0].entries[2].load, "42");
  assert.equal(result.draft.exercises[0].entries[2].reps, "");
  assert.match(result.warnings.join("\n"), /series por encima de las 2 previstas/);
  assert.match(result.warnings.join("\n"), /falta la Serie 2/);
});

test("reports unsupported modes, bases and resistance combinations", async () => {
  const parser = await loadParser();
  const unknown = parser.parseHistoricalWorkout(`Fecha: 2026-07-24
Entrenamiento: Campos incompatibles
Ejercicio: Remo
Modo: elástico
Base: marciano
Serie 1: dificultad=media; reps=10`);
  assert.match(unknown.error, /Línea 4: Modo no reconocido/);
  assert.match(unknown.error, /Línea 5: Base de carga no reconocida/);
  assert.match(unknown.error, /usa dificultad pero no indica si el modo es TRX o autocarga/);

  const bodyweightWithLoad = parser.parseHistoricalWorkout(`Fecha: 2026-07-24
Entrenamiento: Autocarga incompatible
Ejercicio: Dominadas
Modo: autocarga
Serie 1: carga=10; reps=6; rir=2`);
  assert.match(bodyweightWithLoad.error, /carga no es compatible con el modo autocarga/);
});

test("round-trips historical text through local session and the v1 JSON contracts", async () => {
  const parser = await loadParser();
  const historyTools = await loadBrowserModule("../public/app/history-tools.js", "TrainingHistoryTools");
  const exporter = await loadBrowserModule("../public/app/json-export.js", "TrainingJsonExporter");
  const parsed = parser.parseHistoricalWorkout(`Fecha: 2026-07-25
Entrenamiento: Mixto retrospectivo
Finalizado: no
Ejercicio: Hip thrust
Modo: carga externa
Variante: Máquina Technogym
Base: total
Objetivo: 1 x 8-10
Serie 1: carga=80,5; reps=10; rir=2
Ejercicio: Remo
Modo: TRX
Ajustes: correas altura 5
Serie 1: dificultad=pies marca 3; reps=12; rir=1.5
Ejercicio: Dominadas
Modo: autocarga
Variante: banda roja
Serie 1: dificultad=banda roja; reps=7; rir=1`);
  assert.equal(parsed.error, "");

  const localSession = {
    id: "historical-integration",
    title: parsed.draft.title,
    date: parsed.draft.date,
    updatedAt: "2026-08-02T12:00:00.000Z",
    finished: parsed.draft.finished,
    sourceNote: "",
    exercises: parsed.draft.exercises.map((exercise) => ({
      ...plain(exercise),
      identity: plain(historyTools.identityOf(exercise)),
      note: exercise.note || "",
      entries: exercise.entries.map((item) => ({
        load: item.load || "",
        difficulty: item.difficulty || "",
        reps: item.reps || "",
        rir: item.rir || "",
      })),
    })),
  };

  const record = exporter.buildTrainingRecord(localSession, "2026-08-02T13:00:00.000Z");
  assert.equal(record.schema, "training_log.v1");
  assert.equal(record.session.finished, false);
  assert.equal(record.exercises[0].identity.resistance_mode, "external");
  assert.equal(record.exercises[0].result.sets[0].load_kg, "80.5");
  assert.equal(record.exercises[0].result.sets[0].reps, "10");
  assert.equal(record.exercises[0].result.sets[0].rir, "2");
  assert.equal(record.exercises[1].identity.resistance_mode, "trx");
  assert.equal(record.exercises[1].result.sets[0].load_kg, "");
  assert.equal(record.exercises[1].result.sets[0].resistance.difficulty, "pies marca 3");
  assert.equal(record.exercises[1].result.sets[0].reps, "12");
  assert.equal(record.exercises[1].result.sets[0].rir, "1.5");
  assert.equal(record.exercises[2].identity.resistance_mode, "bodyweight");
  assert.equal(record.exercises[2].result.sets[0].resistance.difficulty, "banda roja");

  const restored = historyTools.sessionFromRecord(record);
  assert.equal(restored.id, localSession.id);
  assert.equal(restored.finished, false);
  assert.equal(restored.exercises[0].entries[0].load, "80.5");
  assert.equal(restored.exercises[1].entries[0].difficulty, "pies marca 3");
  assert.equal(restored.exercises[2].entries[0].reps, "7");
  assert.equal(restored.exercises[2].entries[0].rir, "1");

  const history = exporter.buildTrainingHistory([localSession]);
  assert.equal(history.schema, "training_history.v1");
  assert.equal(history.session_schema, "training_log.v1");
  assert.equal(history.sessions[0].schema, "training_log.v1");
});
