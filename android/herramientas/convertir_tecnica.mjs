import { mkdir, readFile, readdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrowserModule, plain } from "../contrato_tests/load-browser-module.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export async function runConversion() {
  const assetsDir = join(ROOT, "app", "src", "main", "assets");
  const assetsMano3Dir = join(assetsDir, "mano3");
  const contratoDir = join(ROOT, "contrato");
  const contratoSalidasDir = join(contratoDir, "salidas");
  await mkdir(assetsMano3Dir, { recursive: true });
  await mkdir(contratoSalidasDir, { recursive: true });

  // 1. Convertir technical-data.js -> app/src/main/assets/tecnica.json
  const technicalData = await loadBrowserModule("../pwa_spec/technical-data.js", "TrainingTechnicalData");
  const cleanTechnical = plain(technicalData);
  await writeFile(join(assetsDir, "tecnica.json"), JSON.stringify(cleanTechnical, null, 2) + "\n", "utf8");

  // 2. Convertir exercise-catalog.js -> app/src/main/assets/catalogo.json
  const catalogApi = await loadBrowserModule("../pwa_spec/exercise-catalog.js", "TrainingExerciseCatalog");
  const baseCatalog = plain(catalogApi.CATALOG);
  await writeFile(join(assetsDir, "catalogo.json"), JSON.stringify({ groups: plain(catalogApi.GROUPS), exercises: baseCatalog }, null, 2) + "\n", "utf8");

  // 3. Convertir day-templates.js -> app/src/main/assets/plantillas_dia.json
  const dayTemplatesApi = await loadBrowserModule("../pwa_spec/day-templates.js", "TrainingDayTemplates");
  const dayTemplates = plain(dayTemplatesApi.TEMPLATES);
  await writeFile(join(assetsDir, "plantillas_dia.json"), JSON.stringify(dayTemplates, null, 2) + "\n", "utf8");

  // 4. Copiar sesion_activa.json y assets/mano3/*.webp
  await copyFile(join(ROOT, "pwa_spec", "sesion_activa.json"), join(assetsDir, "sesion_activa.json"));
  const mano3Src = join(ROOT, "pwa_spec", "assets", "mano3");
  const mano3Files = await readdir(mano3Src);
  for (const f of mano3Files) {
    if (f.endsWith(".webp")) {
      await copyFile(join(mano3Src, f), join(assetsMano3Dir, f));
    }
  }

  // 5. Generar oráculo de Golden Tests en contrato/salidas/ desde parser.js
  const { parseWorkout, parseWorkoutNoteV1 } = await loadBrowserModule("../pwa_spec/parser.js", "TrainingParser");

  const noteFixturesDir = join(ROOT, "contrato_tests", "fixtures", "workout-note-v1");
  const noteFiles = (await readdir(noteFixturesDir)).filter((f) => f.endsWith(".txt")).sort();
  const noteOracle = {};
  for (const f of noteFiles) {
    const raw = await readFile(join(noteFixturesDir, f), "utf8");
    noteOracle[f] = {
      input: raw,
      workoutNoteV1: plain(parseWorkoutNoteV1(raw)),
      workout: plain(parseWorkout(raw)),
    };
  }
  await writeFile(join(contratoSalidasDir, "workout-note-v1.oracle.json"), JSON.stringify(noteOracle, null, 2) + "\n", "utf8");

  return {
    exerciseCount: Object.keys(cleanTechnical.ejercicios || {}).length,
    totalDeclared: cleanTechnical.total_ejercicios,
    catalogCount: Array.isArray(baseCatalog) ? baseCatalog.length : 0,
    mano3Count: mano3Files.filter((f) => f.endsWith(".webp")).length,
    noteFixtureCount: noteFiles.length,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const summary = await runConversion();
  console.log("Conversión completada:", JSON.stringify(summary));
}
