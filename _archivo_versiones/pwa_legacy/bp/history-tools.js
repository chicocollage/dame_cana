(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingHistoryTools = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const text = (value) => String(value == null ? "" : value).trim();
  const normalized = (value) => text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  function identityOf(exercise) {
    const identity = exercise && exercise.identity ? exercise.identity : {};
    return {
      resistanceMode: text(identity.resistanceMode || identity.resistance_mode || "external") || "external",
      variant: text(identity.variant),
      settings: text(identity.settings || identity.machine_settings),
      loadBasis: text(identity.loadBasis || identity.load_basis || "unknown") || "unknown",
      detected: Boolean(identity.detected)
    };
  }

  function hasIdentity(identity) {
    return Boolean(identity.variant || identity.settings || identity.resistanceMode !== "external" || (identity.loadBasis && identity.loadBasis !== "unknown"));
  }

  function comparableExercises(left, right) {
    if (normalized(left && left.name) !== normalized(right && right.name)) return false;
    const a = identityOf(left);
    const b = identityOf(right);
    if (a.resistanceMode !== b.resistanceMode) return false;
    if (!hasIdentity(a) && !hasIdentity(b)) return true;
    return normalized(a.variant) === normalized(b.variant)
      && normalized(a.settings) === normalized(b.settings)
      && a.loadBasis === b.loadBasis;
  }

  function latestIdentity(name, sessions) {
    const wanted = normalized(name);
    const ordered = (Array.isArray(sessions) ? sessions : []).slice()
      .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
    for (const session of ordered) {
      const exercise = (session.exercises || []).find((item) => normalized(item.name) === wanted && hasIdentity(identityOf(item)));
      if (exercise) return identityOf(exercise);
    }
    return { resistanceMode: "external", variant: "", settings: "", loadBasis: "unknown", detected: false };
  }

  function findComparable(activeSession, exerciseIndex, sessions) {
    return findComparableHistory(activeSession, exerciseIndex, sessions, 1)[0] || null;
  }

  function latestRecordedExercise(current, sessions, beforeDate, excludedId) {
    const mode = identityOf(current).resistanceMode;
    const before = Date.parse(beforeDate || 0);
    const ordered = (Array.isArray(sessions) ? sessions : [])
      .filter((session) => session && session.id !== excludedId && (!before || Date.parse(session.date) < before))
      .slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    for (const session of ordered) {
      const exercise = (session.exercises || []).find((item) => normalized(item.name) === normalized(current.name)
        && identityOf(item).resistanceMode === mode
        && (item.entries || []).some((entry) => text(entry.load) || text(entry.difficulty) || text(entry.reps)));
      if (exercise) return { session, exercise };
    }
    return null;
  }

  function findComparableHistory(activeSession, exerciseIndex, sessions, limit = 3) {
    if (!activeSession || !activeSession.exercises || !activeSession.exercises[exerciseIndex]) return [];
    const current = activeSession.exercises[exerciseIndex];
    const activeDate = Date.parse(activeSession.date || 0);
    const ordered = (Array.isArray(sessions) ? sessions : [])
      .filter((session) => session && session.id !== activeSession.id)
      .filter((session) => !activeDate || Date.parse(session.date || 0) < activeDate)
      .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
    const matches = [];
    for (const session of ordered) {
      const exercise = (session.exercises || []).find((item) => comparableExercises(current, item));
      if (exercise && (exercise.entries || []).some((entry) => text(entry.load) || text(entry.difficulty) || text(entry.reps) || text(entry.rir))) {
        matches.push({ session, exercise });
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  function sessionFromRecord(record) {
    if (!record || record.schema !== "training_log.v1" || !record.session || !Array.isArray(record.exercises)) {
      throw new Error("El archivo contiene una sesión no compatible.");
    }
    const meta = record.session;
    if (!text(meta.id) || !text(meta.date)) throw new Error("Una sesión no tiene identificador o fecha.");
    return {
      id: text(meta.id),
      title: text(meta.title) || "Entrenamiento importado",
      date: text(meta.date),
      updatedAt: text(meta.updated_at || meta.date),
      finished: Boolean(meta.finished),
      sourceNote: text(meta.source_note),
      exercises: record.exercises.map((item) => {
        const prescription = item.prescription || {};
        const result = item.result || {};
        const resultSets = Array.isArray(result.sets) ? result.sets : [];
        const setCount = Math.max(Number(prescription.sets || 0), resultSets.length);
        return {
          name: text(item.name) || "Ejercicio sin nombre",
          sets: setCount,
          repsMin: prescription.reps_min == null ? null : Number(prescription.reps_min),
          repsMax: prescription.reps_max == null ? null : Number(prescription.reps_max),
          perSide: Boolean(prescription.per_side),
          targetRir: text(prescription.target_rir),
          rest: text(prescription.rest),
          cue: text(prescription.coach_cue),
          identity: identityOf(item),
          note: text(result.movement_notes),
          entries: Array.from({ length: setCount }, (_, index) => {
            const entry = resultSets[index] || {};
            const resistance = entry.resistance || {};
            return { load: text(entry.load_kg), difficulty: text(resistance.difficulty || entry.difficulty), reps: text(entry.reps), rir: text(entry.rir) };
          })
        };
      })
    };
  }

  function recordsFromPayload(payload) {
    if (!payload || typeof payload !== "object") throw new Error("El archivo no contiene JSON válido.");
    if (payload.schema === "training_log.v1") return [payload];
    if (payload.schema === "training_history.v1" && payload.session_schema === "training_log.v1" && Array.isArray(payload.sessions)) {
      return payload.sessions;
    }
    throw new Error("El archivo no usa training_log.v1 ni training_history.v1.");
  }

  function mergePayload(existingSessions, payload) {
    const existing = Array.isArray(existingSessions) ? existingSessions.slice() : [];
    const incoming = recordsFromPayload(payload).map(sessionFromRecord);
    const byId = new Map(existing.map((session) => [session.id, session]));
    let added = 0;
    let updated = 0;
    let skipped = 0;
    incoming.forEach((session) => {
      const current = byId.get(session.id);
      if (!current) {
        byId.set(session.id, session);
        added += 1;
      } else if (Date.parse(session.updatedAt || 0) > Date.parse(current.updatedAt || 0)) {
        byId.set(session.id, session);
        updated += 1;
      } else {
        skipped += 1;
      }
    });
    return {
      sessions: Array.from(byId.values()).sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0)),
      added,
      updated,
      skipped,
      incoming: incoming.length
    };
  }

  return { comparableExercises, findComparable, findComparableHistory, identityOf, latestIdentity, latestRecordedExercise, mergePayload, recordsFromPayload, sessionFromRecord };
});
