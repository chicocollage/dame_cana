import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, html, styles] = await Promise.all([
  readFile(new URL("../pwa_spec/app.js", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/index.html", import.meta.url), "utf8"),
  readFile(new URL("../pwa_spec/styles.css", import.meta.url), "utf8"),
]);

test("las confirmaciones usan un diálogo nativo y ninguna operación usa window.confirm", () => {
  assert.match(html, /<dialog class="feedback-sheet confirm-sheet" id="confirmDialog"/);
  assert.match(app, /function requestConfirmation/);
  assert.match(app, /confirmDialog\.addEventListener\("cancel"/);
  assert.doesNotMatch(app, /window\.confirm/);
  for (const title of ["Eliminar entrenamiento", "Restaurar historial", "Cambiar tipo de resistencia", "Sesión duplicada", "Finalizar sesión", "Descartar sesión"]) {
    assert.match(app, new RegExp(title));
  }
});

test("el catálogo usa filtros musculares horizontales sin convertir el filtro en texto de búsqueda", () => {
  assert.match(app, /TrainingExerciseCatalog\.search\(exercisePickerSearch\.value, pickerGroupFilter, localStorage\)/);
  assert.match(app, /button\.setAttribute\("aria-pressed", pickerGroupFilter === filter/);
  assert.match(styles, /\.picker-groups \{[^}]*flex-wrap: nowrap;[^}]*gap: 8px;[^}]*overflow-x: auto;[^}]*white-space: nowrap;/s);
  assert.match(styles, /\.picker-group\[aria-pressed="true"\]/);
});

test("la cortina del temporizador conserva la capa no interactiva y aplica el acabado lima", () => {
  assert.match(styles, /\.rest-ambient \{[^}]*pointer-events: none;/s);
  assert.match(styles, /\.rest-ambient-fill \{[^}]*background: rgba\(180, 240, 0, 0\.18\);[^}]*transition: height 1s linear;/s);
  assert.match(styles, /\.rest-ambient-edge \{[^}]*border-bottom: 2px solid #121212;[^}]*transition: height 1s linear;/s);
  assert.match(styles, /\.confirm-actions button \{[^}]*min-height: 52px;/s);
});

test("el fin de descanso exige cierre manual y las mejoras se gestionan desde Historial", () => {
  assert.match(html, /id="restFinishedDialog"/);
  assert.match(html, /id="restFinishedDialogCloseButton"/);
  assert.match(app, /function showRestFinishedDialog/);
  assert.match(app, /if \(restFinishedDialog\.open\) return;/);
  assert.match(html, /Cerrar · A por la serie/);
  assert.match(styles, /\.rest-finished-sheet \.confirm-sheet-content \{[^}]*background: var\(--ink\);/s);
  assert.match(app, /function deleteFeedbackEntry/);
  assert.match(app, /confirmLabel: "Eliminar como resuelta"/);
  assert.match(app, /entries\.splice\(selectedIndex, 1\)/);
  assert.match(html, /id="feedbackAddButton"/);
  assert.doesNotMatch(html, /id="feedbackButton"/);
});
