import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { plain } from "./load-browser-module.mjs";

const [app, html, styles] = await Promise.all([
  readFile(new URL("../public/app/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app/styles.css", import.meta.url), "utf8"),
]);

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

function listenerBody(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.notEqual(start, -1, `no se encontró ${startMarker}`);
  assert.notEqual(end, -1, `no se encontró ${endMarker}`);
  return app.slice(start + startMarker.length, app.lastIndexOf("});", end));
}

test("vaciar la fecha histórica propaga fecha pendiente al borrador", () => {
  const context = { result: null };
  vm.runInNewContext(`
    let activeSessionIsHistoricalDraft = true;
    let activeSession = { date: "2026-07-20T12:00:00", updatedAt: "" };
    const historicalPreviewDate = { value: "" };
    const sessionDate = { textContent: "fecha anterior" };
    const document = { getElementById: () => sessionDate };
    let persisted = 0;
    const persistSession = () => { persisted += 1; };
    const formatDate = (value) => value;
    const handler = () => { ${listenerBody(
      'historicalPreviewDate.addEventListener("change", () => {',
      'historicalPreviewTitle.addEventListener("input", () => {',
    )} };
    handler();
    result = { activeSession, label: sessionDate.textContent, persisted };
  `, context);

  assert.equal(context.result.activeSession.date, "");
  assert.equal(context.result.label, "Fecha pendiente");
  assert.equal(context.result.persisted, 1);
});

test("el selector RIR abierto queda por encima del dock de descanso", () => {
  assert.doesNotMatch(styles, /\.rest-dock\s*\{[^}]*overflow:\s*hidden/);
  assert.match(styles, /\.rir-picker\[data-open="true"\]\s*\{\s*z-index:\s*(?:[2-9]\d|100)\s*;\s*\}/);
});

test("el progreso del temporizador permanece contenido en el dock", () => {
  assert.match(html, /class="rest-dock-shell"/);
  assert.match(styles, /\.rest-dock-shell\s*\{[^}]*overflow:\s*hidden/);
  assert.match(styles, /\.rest-visual\s*\{[^}]*overflow:\s*hidden/);
});

test("aria-live del temporizador solo se actualiza cuando cambia el estado", () => {
  assert.match(html, /id="restTimerStatus"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /id="restTimerDisplay"[^>]*aria-live=/);

  const announcements = [];
  const context = {
    __announcements: announcements,
    __snapshots: [
      { remaining: 60, total: 120, ratio: 0.5, status: "running", stage: "middle" },
      { remaining: 59, total: 120, ratio: 0.49, status: "running", stage: "middle" },
      { remaining: 59, total: 120, ratio: 0.49, status: "paused", stage: "middle" },
    ],
  };
  vm.runInNewContext(`
    let restTimerEndsAt = 0;
    let restTimerRemaining = 0;
    let restTimerTotal = 0;
    let restTimerComplete = false;
    let lastAnnouncedRestState = "";
    const TrainingRestTimerTools = { snapshot: () => __snapshots.shift() };
    const selectedRestSeconds = () => 120;
    const formatTimer = (value) => String(value);
    const restTimerDisplay = { textContent: "" };
    const restTimerStatus = { set textContent(value) { __announcements.push(value); } };
    const restTimerAction = { textContent: "" };
    const restTimerButton = { setAttribute() {} };
    const restDock = { dataset: {} };
    const document = { body: { dataset: {}, style: { setProperty() {} } } };
    const restAmbient = { dataset: {} };
    const restTimerProgressTrack = { setAttribute() {} };
    const restTimerAdd = { disabled: false };
    const restTimerSubtract = { disabled: false };
    ${functionSource("renderRestTimer")}
    renderRestTimer();
    renderRestTimer();
    renderRestTimer();
  `, context);
  assert.deepEqual(announcements, ["Descansando", "Pausado"]);
});

test("el temporizador activo sigue visible y controlable fuera de la sesión sin tapar contenido", () => {
  assert.match(styles, /body\[data-timer-active="true"\]:not\(\[data-historical-draft="true"\]\) \.rest-dock \{ display: block; \}/);
  assert.match(styles, /body\[data-timer-active="true"\]:not\(\[data-historical-draft="true"\]\) \.toast \{ bottom: max\(94px,/);
  assert.match(styles, /\.rest-dock-panel \{[^}]*position: absolute;[^}]*bottom: calc\(100% \+ 8px\);[^}]*max-width: calc\(100vw - 14px\);[^}]*grid-template-columns: minmax\(0, 1fr\) 82px 92px;[^}]*gap: 6px;[^}]*padding: 8px;/s);
  assert.match(styles, /\.rest-dock-panel select, \.rest-dock-panel \.rest-panel-button \{[^}]*min-height: 44px;/s);
  assert.match(styles, /body\[data-timer-panel="open"\] \.screen:not\(\[hidden\]\) \{ padding-bottom: 220px; \}/);
  assert.match(styles, /body\[data-timer-panel="open"\] \.toast \{ bottom: max\(220px,/);
  assert.match(app, /document\.body\.dataset\.timerActive = state === "idle" \? "false" : "true"/);
  assert.match(html, /id="restTimerButton"[^>]*type="button"/);
  assert.match(html, /id="restTimerAdd"[^>]*type="button"/);
  assert.match(html, /id="restTimerOptions"[^>]*type="button"/);
  assert.match(styles, /\.rest-dock-row \{ grid-template-columns: minmax\(0, 1fr\) 44px 44px 40px; gap: 4px; padding: 5px; \}/);
  assert.match(styles, /\.rest-dock-quick, \.rest-dock-options \{ min-width: 40px; min-height: 44px; padding-inline: 0; \}/);
  assert.match(styles, /\.rest-dock-main strong \{ font-size: 28px; \}/);
});

test("el historial visual se ordena de fecha más reciente a más antigua", () => {
  const list = { children: [], innerHTML: "", appendChild(item) { this.children.push(item); } };
  const context = {
    __list: list,
    __sessions: [
      { id: "old", title: "Antigua", date: "2026-07-01T10:00:00.000Z", exercises: [] },
      { id: "new", title: "Reciente", date: "2026-08-01T10:00:00.000Z", exercises: [] },
      { id: "middle", title: "Intermedia", date: "2026-07-15T10:00:00.000Z", exercises: [] },
    ],
    result: null,
  };
  vm.runInNewContext(`
    const readSessions = () => __sessions;
    const document = {
      getElementById: () => __list,
      createElement: () => ({
        children: [],
        addEventListener() {},
        append(...children) { this.children.push(...children); },
        setAttribute() {},
        className: "",
        type: "",
        innerHTML: "",
        textContent: "",
      }),
    };
    const escapeHtml = (value) => String(value);
    const formatDate = (value) => String(value);
    let activeSession = null;
    let activeSessionIsHistoricalDraft = false;
    const renderSession = () => {};
    ${functionSource("renderHistory")}
    renderHistory();
    result = __list.children.map((item) => item.children[0].innerHTML);
  `, context);

  const rendered = plain(context.result);
  assert.match(rendered[0], /Reciente/);
  assert.match(rendered[1], /Intermedia/);
  assert.match(rendered[2], /Antigua/);
});
