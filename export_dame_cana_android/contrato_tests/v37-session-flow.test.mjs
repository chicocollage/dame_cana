import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, html, styles, review] = await Promise.all([
  readFile(new URL("../pwa_spec/app.js", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/index.html", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/workout-note-review.js", import.meta.url), "utf8"),
]);

function functionSource(name) {
  const start = app.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `no se encontró ${name}`);
  const open = app.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(start, index + 1);
    }
  }
  throw new Error(`no se pudo aislar ${name}`);
}

test("las sesiones nuevas permanecen en borrador hasta finalizar", () => {
  assert.match(app, /function startTemplate[\s\S]*pendingHistory: true/);
  assert.match(app, /startFreeSessionButton[\s\S]*pendingHistory: true/);
  assert.match(app, /if \(activeSession\.pendingHistory && !activeSession\.finished\)/);
});

test("descartar elimina solo el borrador local y no prepara sincronización", () => {
  assert.match(html, /id="discardSessionButton"/);
  const discard = functionSource("discardActiveSession");
  assert.match(discard, /title: "Descartar sesión"/);
  assert.match(discard, /clearActiveSessionDraft\(\)/);
  assert.match(discard, /activeSession = null/);
  assert.match(discard, /showScreen\("import"\)/);
  assert.doesNotMatch(discard, /TrainingSync|enqueuePayload|writeSessions/);
});

test("la revisión muestra tickets y conserva la edición bajo demanda", () => {
  assert.match(review, /function prescriptionTicketMarkup/);
  assert.match(review, /review-prescription-tickets/);
  assert.match(review, /details/);
  assert.match(review, /Editar prescripción/);
  assert.match(review, /refreshTickets/);
  assert.match(styles, /\.review-prescription-editor \{[^}]*margin: 12px 0 0 44px;/s);
});
