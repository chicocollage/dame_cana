import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, html, styles] = await Promise.all([
  readFile(new URL("../pwa_spec/app.js", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/index.html", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/styles.css", import.meta.url), "utf8"),
]);

test("Sustituir conserva su selector y listener y ocupa la tercera columna compacta", () => {
  assert.match(html, /class="substitute-exercise no-print"/);
  assert.match(app, /querySelector\("\.substitute-exercise"\)/);
  assert.match(styles, /\.exercise-card-header \{[^}]*grid-template-columns: 46px minmax\(0, 1fr\) auto;/s);
  assert.match(styles, /\.substitute-exercise \{[^}]*justify-self: end;/s);
  assert.match(styles, /\.substitute-exercise \{[^}]*height: 32px;/s);
});

test("las series usan la rejilla y controles compactos aprobados", () => {
  assert.match(styles, /\.set-row \{[^}]*grid-template-columns: 28px 1fr 1fr 48px 40px 40px;[^}]*gap: 6px;[^}]*align-items: center;/s);
  assert.match(styles, /\.set-row input \{[^}]*height: 42px;[^}]*text-align: center;[^}]*font-size: 16px;/s);
  assert.match(styles, /\.set-row \.rir-trigger \{[^}]*width: 48px;[^}]*height: 38px;/s);
  assert.match(styles, /\.rir-options\[hidden\] \{ display: none; \}/);
  assert.match(app, /function rirPicker/);
  assert.match(app, /trigger\.dataset\.field = "rir"/);
  assert.match(app, /button\.dataset\.rirValue = option/);
  assert.match(app, /const completedLabel = document\.createElement\("label"\); completedLabel\.className = "set-complete";/);
  assert.match(app, /completed\.dataset\.field = "completed"; completed\.dataset\.exercise = exerciseIndex; completed\.dataset\.set = setIndex;/);
  assert.match(app, /completedLabel\.append\(completed, completedVisual\);/);
  assert.match(app, /row\.append\(completedLabel, remove\);/);
  assert.match(app, /activeSession\.exercises\[exerciseIndex\]\.entries\[setIndex\]\[target\.dataset\.field\] = target\.dataset\.field === "completed" \? target\.checked : target\.value;/);
  assert.match(styles, /\.set-complete \{[^}]*width: 40px;[^}]*height: 40px;/s);
  assert.match(styles, /\.set-complete input\[data-field="completed"\] \{[^}]*inset: 0;[^}]*width: 40px;[^}]*height: 40px;[^}]*opacity: 0;/s);
  assert.match(styles, /\.set-complete-visual \{[^}]*width: 22px;[^}]*height: 22px;/s);
  assert.match(styles, /\.set-complete input:checked \+ \.set-complete-visual \{[^}]*background: #b4f000;/s);
  assert.match(styles, /\.set-complete input:focus-visible \+ \.set-complete-visual/);
  assert.match(styles, /\.remove-set-button \{[^}]*width: 40px;[^}]*height: 40px;/s);
  assert.match(styles, /\.remove-set-button::before \{[^}]*width: 28px;[^}]*height: 28px;/s);
});

test("los controles rectangulares usan tokens sin alterar tarjetas ni RIR", () => {
  assert.match(styles, /--radius-compact: 8px;/);
  assert.match(styles, /--radius-control: 10px;/);
  assert.match(styles, /--radius-panel: 14px;/);
  assert.match(styles, /\.rest-dock \{[^}]*border-radius: var\(--radius-panel\);/s);
  assert.match(styles, /\.set-row \.rir-trigger \{[^}]*border-radius: 999px;/s);
  assert.match(styles, /\.exercise-card \{[^}]*border-radius: 2px;/s);
});

test("la regla lateral desaparece y los H1 principales quedan a 22px", () => {
  assert.doesNotMatch(styles, /\.screen::before/);
  assert.match(styles, /\.screen \{ position: relative; padding: 58px 42px 136px 52px; \}/);
  assert.match(styles, /h1 \{[^}]*font-size: 22px;[^}]*font-weight: 900;/s);
  assert.match(styles, /\.session-heading h1 \{ font-size: 22px; font-weight: 900; \}/);
});

test("la prescripción de cada ejercicio mantiene una lectura compacta y más fuerte", () => {
  assert.match(styles, /\/\* v42[\s\S]*?\.pill \{[^}]*font-family: var\(--display\);[^}]*font-size: 11px;[^}]*font-weight: 900;[^}]*font-variant-numeric: tabular-nums;/s);
  assert.match(styles, /@media \(max-width: 430px\) \{\s*\.pill \{ min-height: 21px; padding: 4px 7px; font-size: 10px; \}/);
});
