import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const appDirectory = new URL("../pwa_spec/", import.meta.url);

test("mantiene CACHE, versiones ?v= y ASSETS de la PWA coherentes", async () => {
  const [html, worker] = await Promise.all([
    readFile(new URL("index.html", appDirectory), "utf8"),
    readFile(new URL("sw.js", appDirectory), "utf8"),
  ]);

  const cacheMatch = worker.match(/const CACHE = "registro-entrenamiento-v(\d+)"/);
  const assetsMatch = worker.match(/const ASSETS = (\[[^\n]+\]);/);
  assert.ok(cacheMatch, "sw.js debe declarar una versión numérica de CACHE");
  assert.ok(assetsMatch, "sw.js debe declarar ASSETS como una lista JSON");

  const cacheVersion = cacheMatch[1];
  const assets = JSON.parse(assetsMatch[1]);
  assert.equal(new Set(assets).size, assets.length, "ASSETS no debe contener duplicados");
  assert.ok(assets.includes(`feedback-tools.js?v=${cacheVersion}`), "feedback-tools.js debe estar cacheado con la versión activa");
  assert.ok(assets.includes(`rest-timer-tools.js?v=${cacheVersion}`), "rest-timer-tools.js debe estar cacheado con la versión activa");
  assert.ok(assets.includes(`timer-sounds.js?v=${cacheVersion}`), "timer-sounds.js debe estar cacheado con la versión activa");
  assert.ok(assets.includes(`sync-queue.js?v=${cacheVersion}`), "sync-queue.js debe estar cacheado con la versión activa");
  assert.ok(assets.includes(`gem-command-tools.js?v=${cacheVersion}`), "gem-command-tools.js debe estar cacheado con la versión activa");
  assert.ok(assets.includes(`historical-parser.js?v=${cacheVersion}`), "historical-parser.js debe estar cacheado con la versión activa");

  const references = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|data:|#)/.test(value));
  for (const reference of references) {
    assert.ok(assets.includes(reference), `${reference} está referenciado por index.html pero falta en ASSETS`);
  }

  const versioned = assets.filter((asset) => /\.(?:js|css)\?v=/.test(asset));
  assert.ok(versioned.length > 0, "debe haber recursos JS/CSS versionados");
  for (const asset of versioned) {
    assert.equal(new URLSearchParams(asset.split("?")[1]).get("v"), cacheVersion, `${asset} no coincide con CACHE v${cacheVersion}`);
  }
  for (const asset of assets.filter((value) => /\.(?:js|css)(?:\?|$)/.test(value))) {
    assert.match(asset, new RegExp(`\\?v=${cacheVersion}$`), `${asset} debe llevar ?v=${cacheVersion}`);
  }

  for (const asset of assets.filter((value) => value !== "./")) {
    const pathname = asset.split("?")[0];
    await assert.doesNotReject(access(new URL(pathname, appDirectory)), `${asset} no existe en public/app`);
  }

  assert.match(worker, /cache\.put\(event\.request, copy\)/, "cada navegación debe actualizar su propia ruta en caché");
  assert.match(worker, /caches\.match\(event\.request\)/, "la pantalla de check-in debe poder abrirse sin conexión");
});
