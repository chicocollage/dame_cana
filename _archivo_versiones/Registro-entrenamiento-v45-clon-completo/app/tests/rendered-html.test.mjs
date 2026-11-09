import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function renderRoot() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("redirects the site root to the installable training app", async () => {
  const response = await renderRoot();
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/app/index.html");
});

test("ships the PWA, check-in, historical preview, Workout Note review, alarm profiles, restore controls, feedback, Gem commands, and AI exports", async () => {
  const [html, manifestText, worker, jsonExporter, historyTools, metadata, historicalParser, feedbackTools, restTimerTools, timerSounds, gemCommandTools, app, review, packageText] = await Promise.all([
    readFile(new URL("../public/app/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/app/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/json-export.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/history-tools.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/exercise-metadata.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/historical-parser.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/feedback-tools.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/rest-timer-tools.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/timer-sounds.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/gem-command-tools.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app/workout-note-review.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(html, /Compartir con IA/);
  assert.match(html, /href="checkin\.html"[^>]*>Check-in</);
  assert.match(html, /Exportar historial para IA/);
  assert.match(html, /Importar o restaurar/);
  assert.match(html, /Pantalla activa/);
  assert.match(html, /Identificación de variante y máquina/);
  assert.match(html, /Tipo de resistencia/);
  assert.match(html, /restTimerProgress/);
  assert.match(html, /timerSoundToggle/);
  assert.match(html, /id="restAmbient"/);
  assert.match(html, /id="restAmbientFill"/);
  assert.match(html, /class="rest-ambient-edge"/);
  assert.match(html, /id="restDock"/);
  assert.match(html, /id="restTimerProgressTrack"[^>]+role="progressbar"/);
  assert.match(html, /id="restTimerSubtract"[^>]*>−15 s</);
  assert.match(html, /id="restTimerAdd"[^>]*>\+15 s</);
  assert.match(html, /id="restTimerPanel"[^>]*hidden/);
  assert.match(html, /<option value="15">15 s<\/option>/);
  assert.match(html, /<option value="30">30 s<\/option>/);
  assert.match(html, /rest-timer-tools\.js\?v=45/);
  assert.match(html, /id="timerSoundProfile"/);
  assert.match(html, /value="sport_horn"[^>]*>Bocina deportiva</);
  assert.match(html, /value="clean_bell"[^>]*>Campana limpia</);
  assert.match(html, /value="deep_pulse"[^>]*>Pulso grave</);
  assert.match(html, /id="timerSoundPreview"[^>]*>Probar sonido</);
  assert.match(html, /timer-sounds\.js\?v=45/);
  assert.match(html, /Instalar en este móvil/);
  assert.doesNotMatch(html, /id="feedbackButton"/);
  assert.match(html, /id="feedbackDialog"/);
  assert.match(html, /id="feedbackForm"/);
  assert.match(html, /id="feedbackCancelButton"/);
  assert.match(html, /id="exportFeedbackButton"/);
  assert.match(html, /feedback-tools\.js\?v=45/);
  assert.match(html, /id="feedbackAddButton"/);
  assert.match(html, /id="restFinishedDialog"/);
  assert.match(html, /id="gemCommandButton"/);
  assert.match(html, /id="gemCommandDialog"/);
  assert.match(html, /id="gemCommandInput"/);
  assert.match(html, /Pega aquí el comando generado por tu Gem\.\.\./);
  assert.match(html, /⚡ Ejecutar Acción/);
  assert.match(html, /gem-command-tools\.js\?v=45/);
  assert.match(html, /id="addHistoricalButton"/);
  assert.match(html, /id="historicalScreen"/);
  assert.match(html, /id="historicalText"/);
  assert.match(html, /id="parseHistoricalButton"/);
  assert.match(html, /id="historicalDraftBanner"/);
  assert.match(html, /id="historicalPreviewDate"/);
  assert.match(html, /id="historicalPreviewTitle"/);
  assert.match(html, /historical-parser\.js\?v=45/);
  assert.match(html, /id="workoutNoteReviewScreen"/);
  assert.match(html, /id="workoutNoteReviewList"/);
  assert.match(html, /workout-note-review\.js/);
  assert.match(html, /manifest\.webmanifest/);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.some((icon) => icon.sizes === "192x192"), true);
  assert.equal(manifest.icons.some((icon) => icon.sizes === "512x512"), true);
  assert.match(worker, /registro-entrenamiento-v45/);
  assert.match(worker, /checkin\.html/);
  assert.match(worker, /exercise-metadata\.js\?v=45/);
  assert.match(worker, /historical-parser\.js\?v=45/);
  assert.match(worker, /feedback-tools\.js\?v=45/);
  assert.match(worker, /rest-timer-tools\.js\?v=45/);
  assert.match(worker, /timer-sounds\.js\?v=45/);
  assert.match(worker, /sync-queue\.js\?v=45/);
  assert.match(worker, /gem-command-tools\.js\?v=45/);
  assert.match(jsonExporter, /training_log\.v1/);
  assert.match(jsonExporter, /training_history\.v1/);
  assert.match(historyTools, /mergePayload/);
  assert.match(historyTools, /findComparable/);
  assert.match(metadata, /resistanceMode/);
  assert.match(metadata, /bodyweight/);
  assert.match(historicalParser, /parseHistoricalWorkout/);
  assert.match(review, /parseWorkoutNoteV1/);
  assert.doesNotMatch(review, /training_(?:log|history)\.v1/);
  assert.match(feedbackTools, /app_feedback\.v1/);
  assert.doesNotMatch(feedbackTools, /training_(?:log|history)\.v1/);
  assert.match(restTimerTools, /function snapshot/);
  assert.match(restTimerTools, /function extend/);
  assert.match(timerSounds, /sport_horn/);
  assert.match(timerSounds, /clean_bell/);
  assert.match(timerSounds, /deep_pulse/);
  assert.match(gemCommandTools, /gem_command\.v1/);
  assert.match(gemCommandTools, /Content-Type": "text\/plain;charset=utf-8/);
  assert.match(gemCommandTools, /CMD-\$\{timestamp\}/);
  assert.match(app, /function playTimerAlarm/);
  assert.match(app, /difficulty/);
  assert.match(app, /TrainingRestTimerTools\.snapshot/);
  assert.match(app, /addRestTime\(-15\)/);
  assert.match(app, /addRestTime\(15\)/);
  assert.match(app, /registro-entrenamiento-feedback-v1/);
  assert.match(app, /registro-entrenamiento-historico-borrador-v1/);
  assert.match(app, /training_active_draft\.v1/);
  assert.match(html, /id="syncStatusCard"/);
  assert.match(html, /id="retrySyncButton"/);
  assert.match(html, /sync-queue\.js\?v=45/);
  assert.match(app, /Procesando comando en Sheets/);
  assert.match(app, /GemCommandTools\.execute/);
  assert.match(app, /registro-entrenamiento-sonido-perfil-v1/);
  assert.match(app, /TrainingTimerSounds\.normalizeProfile/);
  assert.match(app, /TrainingFeedbackTools\.shareOrDownload/);
  assert.doesNotMatch(packageText, /react-loading-skeleton/);

  const finishStart = app.indexOf('document.getElementById("finishButton").addEventListener("click"');
  const finishSource = app.slice(finishStart, app.indexOf("noteInput.value", finishStart));
  assert.ok(finishSource.indexOf("persistSession()") < finishSource.indexOf("TrainingSync.enqueuePayload"), "finalizar debe guardar localmente antes de encolar");

  const finishTimerSource = app.slice(app.indexOf("function finishRestTimer"), app.indexOf("function tickRestTimer"));
  const toggleTimerSource = app.slice(app.indexOf("function toggleRestTimer"), app.indexOf("function addRestTime"));
  const resetTimerSource = app.slice(
    app.indexOf('document.getElementById("restTimerReset")'),
    app.indexOf('restDuration.addEventListener("change"'),
  );
  assert.match(finishTimerSource, /playTimerAlarm\(\)/, "la finalización natural debe reproducir la alarma");
  assert.doesNotMatch(toggleTimerSource, /playTimerAlarm\(\)/, "pausar o continuar no debe reproducir la alarma directamente");
  assert.doesNotMatch(resetTimerSource, /playTimerAlarm\(\)/, "reiniciar o cancelar no debe reproducir la alarma");

  const persistSource = app.slice(app.indexOf("function persistSession"), app.indexOf("function showScreen"));
  const draftGuard = persistSource.match(/if \(activeSessionIsHistoricalDraft\) \{([\s\S]*?)\n    \}/);
  assert.ok(draftGuard, "persistSession debe separar los borradores históricos");
  assert.match(draftGuard[1], /return(?: false)?;/, "un borrador debe salir antes de persistir");
  assert.doesNotMatch(draftGuard[1], /writeSessions/, "persistSession no debe escribir borradores históricos");

  const saveHistoricalSource = app.slice(app.indexOf("function saveHistoricalDraft"), app.indexOf('document.getElementById("shareHistoryButton")'));
  assert.match(saveHistoricalSource, /writeSessions\(\[activeSession, \.\.\.sessions\]\)/, "el alta histórica debe ser append-only");
  assert.match(saveHistoricalSource, /sessions\.find/, "debe buscar posibles duplicados antes de guardar");
  assert.match(saveHistoricalSource, /Ya existe una sesión con la misma fecha y título/, "debe advertir de un posible duplicado");
  assert.match(saveHistoricalSource, /await requestConfirmation/, "un duplicado debe requerir confirmación explícita");
});
