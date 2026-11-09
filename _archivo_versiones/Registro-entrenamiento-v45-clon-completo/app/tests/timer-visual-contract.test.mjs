import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, styles] = await Promise.all([
  readFile(new URL("../public/app/app.js", import.meta.url), "utf8"),
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

function cssBlock(selectorPattern) {
  const match = styles.match(new RegExp(`${selectorPattern}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `no se encontró el bloque CSS ${selectorPattern}`);
  return match[1];
}

test("render escribe una sola vez el puente --timer-progress", () => {
  const render = functionSource("renderRestTimer");
  assert.equal((render.match(/setProperty\("--timer-progress"/g) || []).length, 1);
  assert.match(render, /\$\{\(ratio \* 100\)\.toFixed\(2\)\}%/);
  assert.doesNotMatch(render, /\.style\.(?:height|width|top)\s*=/);
  assert.doesNotMatch(render, /restAmbientFill|restTimerProgress\.style/);
});

test("cortina, borde y barra consumen el mismo progreso sin tocar el reloj", () => {
  const overlay = cssBlock("\\.rest-ambient-fill");
  const edge = cssBlock("\\.rest-ambient-edge");
  const bar = cssBlock("#restTimerProgress");
  assert.match(overlay, /height:\s*calc\(100% - var\(--timer-progress\)\)/);
  assert.match(edge, /height:\s*calc\(100% - var\(--timer-progress\)\)/);
  assert.match(bar, /clip-path:[^;]*var\(--timer-progress\)/);
  assert.match(overlay, /transition:\s*height 1s linear/);
  assert.match(edge, /transition:\s*height 1s linear/);
  assert.match(bar, /transition:[^;]*clip-path/);
});

test("la referencia visual conserva zona atenuada, cortina lima y borde inferior sólido", () => {
  const veil = cssBlock("\\.rest-ambient::before");
  const overlay = cssBlock("\\.rest-ambient-fill");
  const edge = cssBlock("\\.rest-ambient-edge");
  assert.match(veil, /rgba\([^)]*0\.14\)/);
  assert.match(overlay, /background:\s*rgba\(180, 240, 0, 0\.18\)/);
  assert.match(edge, /border-bottom:\s*2px solid #121212/);
});

test("la cortina no intercepta interacción y conserva el estado con movimiento reducido", () => {
  const ambient = cssBlock("\\.rest-ambient");
  assert.match(ambient, /pointer-events:\s*none/);
  const reducedMotion = styles.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(reducedMotion, "falta la adaptación prefers-reduced-motion");
  assert.match(reducedMotion[1], /\.rest-ambient\s*\{\s*display:\s*block\s*!important/);
  assert.match(reducedMotion[1], /transition:\s*none\s*!important/);
  assert.match(reducedMotion[1], /transition-duration:\s*0\.01ms\s*!important/);
});

test("la cortina queda sobre el contenido y bajo los controles", () => {
  const main = cssBlock("main");
  const ambient = cssBlock("\\.rest-ambient");
  const header = cssBlock("\\.app-header");
  const dock = cssBlock("\\.rest-dock");
  assert.match(main, /z-index:\s*1/);
  assert.match(main, /padding-bottom:\s*90px/);
  assert.match(ambient, /z-index:\s*5/);
  assert.match(header, /z-index:\s*10/);
  assert.match(dock, /z-index:\s*15/);
});

test("al iniciar, la cortina lima cubre y desciende revelando la pantalla desde arriba", () => {
  assert.match(styles, /\.rest-ambient-fill,\s*\.rest-ambient-edge\s*\{[^}]*top:\s*calc\(100% - var\(--timer-progress\)\);[^}]*height:\s*var\(--timer-progress\);[^}]*transition:\s*height 1s linear, top 1s linear;/s);
});

test("el fondo del control principal muestra el tiempo restante", () => {
  assert.match(styles, /\.rest-dock-shell \{ display: none; \}/);
  assert.match(styles, /\.rest-dock-main::before\s*\{[^}]*width:\s*var\(--timer-progress\);[^}]*transition:\s*width 1s linear/s);
  assert.match(styles, /\.rest-dock\[data-state="running"\] \.rest-dock-main::before \{ background: var\(--comic-lime\); \}/);
});
