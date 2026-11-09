import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checkinUrl = new URL("../public/app/checkin.html", import.meta.url);

test("el check-in conserva el contrato remoto checkin.v1 en un único HTML", async () => {
  const html = await readFile(checkinUrl, "utf8");
  const syncQueue = await readFile(new URL("../public/app/sync-queue.js", import.meta.url), "utf8");
  const requiredKeys = [
    "sleep_hours", "sleep_quality", "fatigue", "appetite_energy", "soreness_glute",
    "pain_lumbar", "pain_shoulder", "weight_avg", "weight_count", "waist_1", "waist_2",
    "waist_3", "hip_1", "hip_2", "hip_3", "nutrition_changes", "notes"
  ];

  assert.match(syncQueue, /const ENDPOINT = "https:\/\/script\.google\.com\/macros\/s\/AKfycbwQIItMuOszCh2RmjtnoymELZky0GifsZD_0KsREs7rlBETHIzi8lDDfDFknB3XAgnt\/exec"/);
  assert.match(html, /schema: "checkin\.v1"/);
  assert.match(syncQueue, /method: "POST"/);
  assert.match(syncQueue, /headers: \{ "Content-Type": "text\/plain;charset=utf-8" \}/);
  assert.match(syncQueue, /body: JSON\.stringify\(item\.payload\)/);
  assert.match(html, /function localDate\(\)/);
  assert.match(html, /value="Check-in semanal"/);
  assert.match(html, /value="Medidas"/);
  assert.match(html, /value="Dolor \/ incidencia"/);
  assert.match(html, /hip \/ waist/);
  assert.match(html, /🟢 Sincronizado/);
  assert.match(html, /Reintentar sincronización/);
  assert.match(html, /sync-queue\.js\?v=50/);
  assert.match(html, /input\[type="range"\]::-webkit-slider-runnable-track/);
  assert.match(html, /input\[type="range"\]::-webkit-slider-thumb/);
  assert.match(html, /input\[type="range"\]::-moz-range-track/);
  assert.match(html, /input\[type="range"\]::-moz-range-thumb/);
  assert.match(html, /<style>/, "el formulario debe mantener CSS embebido");
  assert.ok(html.indexOf("TrainingSync.saveCheckinLocal(payload)") < html.indexOf("TrainingSync.enqueuePayload(payload"), "debe guardar el check-in localmente antes de encolarlo");
  assert.match(html, /function nullableNumber/);
  assert.match(html, /field\.type === "range" && !touchedFields\.has\(name\)\) return null/);
  assert.match(html, /record_status = payload\.missing_fields\.length \? "partial" : "complete"/);
  assert.match(html, /function hasCheckinContent/);
  assert.doesNotMatch(html, /name="nutrition_changes"[^>]*value="Ninguno"/);

  for (const key of requiredKeys) {
    assert.match(html, new RegExp(`name="${key}"`), `falta el control ${key}`);
    assert.match(html, new RegExp(`${key}:`), `falta ${key} en el payload`);
  }
});
