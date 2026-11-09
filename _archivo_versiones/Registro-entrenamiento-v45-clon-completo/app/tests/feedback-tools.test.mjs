import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const feedback = await loadBrowserModule("../public/app/feedback-tools.js", "TrainingFeedbackTools");

function entry(overrides = {}) {
  return {
    id: "feedback-1",
    created_at: "2026-08-02T10:00:00.000Z",
    app_version: "10",
    screen: "session",
    session_id: "session-1",
    session_title: "Día A",
    exercise_name: "Hip thrust",
    set_index: "2",
    field: "repeticiones",
    category: "too_many_taps",
    comment: "Demasiados pasos",
    ...overrides,
  };
}

test("rechaza comentarios completamente vacíos y exige identidad válida", () => {
  assert.throws(
    () => feedback.createEntry(entry({ category: "  ", comment: "\n\t" })),
    /comentario|categoría/i,
  );
  assert.throws(() => feedback.createEntry(entry({ id: "" })), /identificador/i);
  assert.throws(() => feedback.createEntry(entry({ created_at: "fecha imposible" })), /fecha/i);

  const categoryOnly = feedback.createEntry(entry({ comment: "" }));
  assert.equal(categoryOnly.category, "too_many_taps");
  assert.equal(categoryOnly.comment, "");

  const commentOnly = feedback.createEntry(entry({ category: "", comment: "Solo texto" }));
  assert.equal(commentOnly.category, "");
  assert.equal(commentOnly.comment, "Solo texto");
});

test("preserva Unicode, contexto y el límite del comentario", () => {
  const unicode = feedback.createEntry(entry({
    screen: "historial",
    session_title: "Día Ñ · Glúteo 💪",
    category: "other",
    comment: "Difícil volver atrás — botón pequeño 😅",
  }));
  assert.equal(unicode.session_title, "Día Ñ · Glúteo 💪");
  assert.equal(unicode.comment, "Difícil volver atrás — botón pequeño 😅");
  assert.equal(unicode.screen, "historial");
  assert.equal(unicode.exercise_name, "Hip thrust");
  assert.equal(unicode.set_index, "2");
  assert.equal(unicode.field, "repeticiones");

  const long = feedback.createEntry(entry({ comment: "x".repeat(feedback.MAX_COMMENT_LENGTH + 25) }));
  assert.equal(long.comment.length, feedback.MAX_COMMENT_LENGTH);
});

test("conserva múltiples entradas y las exporta en orden cronológico", () => {
  const later = entry({ id: "later", created_at: "2026-08-02T12:00:00.000Z", comment: "Segunda" });
  const earlier = entry({ id: "earlier", created_at: "2026-08-02T09:00:00.000Z", comment: "Primera" });
  const sameTime = entry({ id: "same-time", created_at: "2026-08-02T12:00:00.000Z", comment: "Tercera" });
  const exported = feedback.buildFeedbackExport([later, earlier, sameTime], "2026-08-03T10:00:00.000Z");

  assert.equal(exported.summary.entry_count, 3);
  assert.deepEqual(exported.entries.map((item) => item.id), ["earlier", "later", "same-time"]);
  assert.deepEqual(exported.entries.map((item) => item.comment), ["Primera", "Segunda", "Tercera"]);
});

test("usa un esquema separado del historial deportivo", () => {
  const exported = plain(feedback.buildFeedbackExport([entry()], "2026-08-03T10:00:00.000Z"));
  assert.equal(feedback.SCHEMA, "app_feedback.v1");
  assert.equal(exported.schema, "app_feedback.v1");
  assert.equal("session_schema" in exported, false);
  assert.equal("sessions" in exported, false);
  assert.equal(exported.entries[0].session_id, "session-1");

  const serialized = feedback.makeFeedbackJson([entry()], "2026-08-03T10:00:00.000Z");
  assert.equal(JSON.parse(serialized).schema, "app_feedback.v1");
  assert.doesNotMatch(serialized, /training_(?:log|history)\.v1/);
});

test("normaliza descartando entradas inválidas sin alterar las válidas", () => {
  const valid = entry({ comment: " Válida con espacios " });
  const normalized = feedback.normalizeEntries([
    valid,
    null,
    entry({ id: "" }),
    entry({ created_at: "no-es-fecha" }),
    entry({ category: "", comment: "" }),
  ]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, valid.id);
  assert.equal(normalized[0].comment, "Válida con espacios");
  assert.deepEqual(plain(feedback.normalizeEntries("no es una lista")), []);
});

test("conserva contexto opcional de ejercicio y normaliza entradas v1 antiguas", () => {
  const contextual = feedback.createEntry(entry({
    exercise_name: "Remo en TRX",
    set_index: 3,
    field: "dificultad",
  }));
  assert.equal(contextual.exercise_name, "Remo en TRX");
  assert.equal(contextual.set_index, "3");
  assert.equal(contextual.field, "dificultad");

  const legacy = {
    id: "legacy-feedback",
    created_at: "2026-08-01T10:00:00.000Z",
    app_version: "10",
    screen: "session",
    session_id: "session-old",
    session_title: "Día antiguo",
    category: "other",
    comment: "Entrada anterior sin contexto de campo",
  };
  const normalized = feedback.normalizeEntries([legacy]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, legacy.id);
  assert.equal(normalized[0].exercise_name, "");
  assert.equal(normalized[0].set_index, "");
  assert.equal(normalized[0].field, "");

  const exported = feedback.buildFeedbackExport([legacy, contextual], "2026-08-03T10:00:00.000Z");
  assert.equal(exported.schema, "app_feedback.v1");
  assert.equal(exported.summary.entry_count, 2);
  assert.equal(exported.entries[1].exercise_name, "Remo en TRX");
  assert.equal(exported.entries[1].set_index, "3");
  assert.equal(exported.entries[1].field, "dificultad");
});
