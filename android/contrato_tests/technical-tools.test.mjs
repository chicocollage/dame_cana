import assert from "node:assert/strict";
import test from "node:test";
import { loadBrowserModule, plain } from "./load-browser-module.mjs";
const data = await loadBrowserModule("../pwa_spec/technical-data.js", "TrainingTechnicalData");
const tools = await loadBrowserModule("../pwa_spec/technical-tools.js", "TrainingTechnicalTools");
const catalog = await loadBrowserModule("../pwa_spec/exercise-catalog.js", "TrainingExerciseCatalog");

test("vincula los 56 ejercicios del catálogo a fichas distintas y completas", () => {
  const matches = catalog.CATALOG.slice(0, 56).map((exercise) => tools.find({ name: exercise.name, catalogId: exercise.id }, data, catalog.CATALOG));
  assert.equal(matches.length, 56);
  assert.equal(new Set(matches.map((record) => record.id)).size, 56);
  for (const record of matches) {
    assert.ok(record.base.configuracion);
    assert.ok(record.base.objetivo);
    assert.ok(["borrador", "confirmado"].includes(record.base.estado));
  }
  assert.equal(tools.find(catalog.byId.get("E001"), data, catalog.CATALOG).id, "G01");
  assert.equal(tools.find(catalog.byId.get("E012"), data, catalog.CATALOG).id, "G12");
  assert.equal(tools.find(catalog.byId.get("E029"), data, catalog.CATALOG).id, "B04");
});

test("sesiones antiguas sin id se vinculan por nombre y alias explícito", () => {
  for (const exercise of catalog.CATALOG) assert.ok(tools.find({ name: exercise.name }, data, catalog.CATALOG));
  assert.equal(tools.find({ name: "HIP THRUST EN MÁQUINA" }, data, catalog.CATALOG).id, "G01");
  assert.equal(tools.find({ name: "Sentadilla búlgara en Smith" }, data, catalog.CATALOG).id, "G08");
});

test("no mezcla Smith, barra y máquina ni usa slots originales tras sustituir", () => {
  assert.equal(tools.find({ name: "Hip thrust en Smith", catalogId: "E002", slotId: "A01" }, data, catalog.CATALOG).id, "G02");
  assert.equal(tools.find({ name: "Hip thrust con barra", catalogId: "E001" }, data, catalog.CATALOG).id, "G03");
  assert.equal(tools.find({ name: "Hip thrust" }, data, catalog.CATALOG), null);
  assert.equal(tools.find({ name: "Mi ejercicio personalizado" }, data, catalog.CATALOG), null);
});

test("la consulta no modifica ejercicios, resultados o datos técnicos", () => {
  const exercise = { name: "Hip thrust en máquina", catalogId: "E001", entries: [{ load: "80", reps: "10", rir: "2" }] };
  const before = JSON.stringify(exercise);
  const original = JSON.stringify(plain(data));
  tools.find(exercise, data, catalog.CATALOG);
  assert.equal(JSON.stringify(exercise), before);
  assert.equal(JSON.stringify(plain(data)), original);
  assert.equal(tools.find(exercise, { schema: "unknown" }, catalog.CATALOG), null);
});

test("gira una tarjeta clonada de template, excluye controles y vuelve con Escape", () => {
  // Template contents start in an inert document; the card is adopted on insertion.
  class Element {
    constructor(tag, document) { this.tag = tag; this.ownerDocument = document; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.className = ""; }
    get firstChild() { return this.children[0] || null; }
    appendChild(child) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
      child.parent = this; this.children.push(child); return child;
    }
    append(...children) { children.forEach((child) => this.appendChild(child)); }
    after(child) { child.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, child); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    focus() { this.focused = true; }
    querySelector(selector) {
      for (const child of this.children) {
        if (child.className === selector.slice(1)) return child;
        const nested = child.querySelector(selector); if (nested) return nested;
      }
      return null;
    }
  }
  const inertDocument = { defaultView: null, createElement: (tag) => new Element(tag, inertDocument) };
  const card = new Element("article", inertDocument); card.dataset.exerciseCard = "0";
  const header = new Element("div", inertDocument); header.className = "exercise-card-header"; card.append(header);
  const exercise = { name: "Hip thrust en máquina", catalogId: "E001", entries: [{ load: "80", reps: "10" }] };
  const before = JSON.stringify(exercise);
  tools.mount(card, exercise, data, catalog.CATALOG);
  card.ownerDocument = { defaultView: { getSelection: () => ({ isCollapsed: true }) } };
  card.listeners.click({ target: { closest: () => null } });
  assert.equal(card.dataset.techFlipped, "true");
  assert.equal(card.querySelector(".exercise-front").inert, true);
  assert.equal(card.querySelector(".exercise-back").inert, false);
  card.listeners.keydown({ key: "Escape", stopPropagation() {} });
  assert.equal(card.dataset.techFlipped, "false");
  assert.equal(card.querySelector(".exercise-front").inert, false);
  card.listeners.click({ target: { closest: () => ({ tag: "input" }) } });
  assert.equal(card.dataset.techFlipped, "false");
  assert.equal(JSON.stringify(exercise), before);
});
