import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runConversion } from "./convertir_tecnica.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

test("convertir_tecnica.mjs convierte 60 ejercicios técnicos, catálogo, plantillas y oráculo de forma idempotente", async () => {
  const firstRun = await runConversion();
  assert.equal(firstRun.exerciseCount, 60);
  assert.equal(firstRun.totalDeclared, 60);
  assert.ok(firstRun.catalogCount >= 55);
  assert.equal(firstRun.mano3Count, 30);
  assert.ok(firstRun.noteFixtureCount >= 25);

  const rawJsonFirst = await readFile(join(ROOT, "app", "src", "main", "assets", "tecnica.json"), "utf8");
  await runConversion();
  const rawJsonSecond = await readFile(join(ROOT, "app", "src", "main", "assets", "tecnica.json"), "utf8");
  assert.equal(rawJsonFirst, rawJsonSecond, "La conversión debe ser 100 % idempotente");
});
