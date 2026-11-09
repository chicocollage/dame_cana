(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(root);
  else root.TrainingSync = factory(root);
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbzUYfnQVpU7aCyWKjslj41McIbZHktUR5ivWW5xWwWzVWDioqhWRnCkR7uuvlWX95VS/exec";
  const QUEUE_KEY = "training_sync_queue.v1";
  const CHECKIN_LOG_KEY = "checkin_log.v1";
  const CHANGE_EVENT = "training-sync-change";
  const SUPPORTED_SCHEMAS = new Set(["training_log.v1", "checkin.v1"]);
  const inFlight = new Set();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createEventId() {
    return `EVENT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  function storage() {
    if (!root.localStorage) throw new Error("El almacenamiento local no está disponible.");
    return root.localStorage;
  }

  function readList(key) {
    const raw = storage().getItem(key);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error(`El registro local ${key} no es válido.`);
    return parsed;
  }

  function writeList(key, items) {
    storage().setItem(key, JSON.stringify(items));
  }

  function readQueue() {
    return readList(QUEUE_KEY);
  }

  function notify(eventId) {
    if (typeof root.dispatchEvent !== "function" || typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent(CHANGE_EVENT, { detail: summary(eventId) }));
  }

  function isOnline() {
    return !root.navigator || root.navigator.onLine !== false;
  }

  function numberOrNull(value) {
    if (value == null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function buildTrainingPayload(session, eventId) {
    if (!session || session.finished !== true || !Array.isArray(session.exercises)) {
      throw new Error("Solo se pueden sincronizar sesiones finalizadas.");
    }
    const exercises = session.exercises.map((exercise, exerciseIndex) => {
      const identity = exercise.identity || {};
      const resistanceMode = text(identity.resistanceMode) || "external";
      return {
        index: exerciseIndex + 1,
        name: text(exercise.name),
        identity: {
          variant: text(identity.variant),
          load_basis: text(identity.loadBasis) || "unknown",
          resistance_mode: resistanceMode,
          machine_settings: text(identity.settings)
        },
        prescription: {
          per_side: Boolean(exercise.perSide)
        },
        result: {
          movement_notes: text(exercise.note),
          sets: (exercise.entries || []).map((entry, setIndex) => ({
            index: setIndex + 1,
            load_kg: resistanceMode === "external" ? numberOrNull(entry.load) : null,
            reps: numberOrNull(entry.reps),
            rir: numberOrNull(entry.rir),
            resistance: {
              mode: resistanceMode,
              difficulty: text(entry.difficulty)
            }
          }))
        }
      };
    });
    const allSets = exercises.flatMap((exercise) => exercise.result.sets);
    return {
      schema: "training_log.v1",
      exported_at: nowIso(),
      event_id: eventId || createEventId(),
      session: {
        id: text(session.id),
        date: text(session.date).slice(0, 10),
        title: text(session.title),
        finished: true,
        exercise_count: exercises.length,
        planned_set_count: allSets.length,
        recorded_set_count: allSets.filter((set) => set.reps != null).length
      },
      exercises
    };
  }

  function saveCheckinLocal(payload) {
    if (!payload || payload.schema !== "checkin.v1" || !text(payload.event_id)) {
      throw new Error("El check-in local no tiene un event_id válido.");
    }
    const records = readList(CHECKIN_LOG_KEY);
    if (!records.some((record) => record && record.event_id === payload.event_id)) {
      records.unshift({ ...clone(payload), saved_at: nowIso() });
      writeList(CHECKIN_LOG_KEY, records);
    }
    return clone(payload);
  }

  function enqueuePayload(payload, options) {
    const schema = payload && payload.schema;
    if (!SUPPORTED_SCHEMAS.has(schema)) throw new Error("Este tipo de registro no se puede sincronizar.");
    if (schema === "training_log.v1" && (!payload.session || payload.session.finished !== true)) {
      throw new Error("Un entrenamiento sin finalizar no puede entrar en la cola.");
    }
    const eventId = text(payload.event_id) || createEventId();
    const recordId = text(options && options.recordId) || eventId;
    const queue = readQueue();
    const existing = queue.find((item) => item && item.schema === schema && item.record_id === recordId);
    if (existing) {
      if (existing.status !== "synced") scheduleSend(existing.event_id);
      return clone(existing);
    }
    const createdAt = nowIso();
    const item = {
      event_id: eventId,
      schema,
      record_id: recordId,
      payload: { ...clone(payload), event_id: eventId },
      status: "pending",
      attempts: 0,
      last_error: "",
      backend_status: "",
      created_at: createdAt,
      updated_at: createdAt
    };
    queue.unshift(item);
    writeList(QUEUE_KEY, queue);
    notify(eventId);
    scheduleSend(eventId);
    return clone(item);
  }

  function updateItem(eventId, update) {
    const queue = readQueue();
    const index = queue.findIndex((item) => item && item.event_id === eventId);
    if (index < 0) return null;
    queue[index] = { ...queue[index], ...update, updated_at: nowIso() };
    writeList(QUEUE_KEY, queue);
    notify(eventId);
    return clone(queue[index]);
  }

  async function responseStatus(response) {
    let body = {};
    try {
      const raw = await response.text();
      body = raw ? JSON.parse(raw) : {};
    } catch (_) {
      body = {};
    }
    return text(body.status || (body.result && body.result.status)).toUpperCase();
  }

  async function sendItem(eventId) {
    if (inFlight.has(eventId)) return null;
    const item = readQueue().find((candidate) => candidate && candidate.event_id === eventId);
    if (!item || item.status === "synced" || !isOnline()) return item ? clone(item) : null;
    if (typeof root.fetch !== "function") {
      return updateItem(eventId, { status: "pending", last_error: "La conexión no está disponible." });
    }
    inFlight.add(eventId);
    updateItem(eventId, { attempts: Number(item.attempts || 0) + 1, last_error: "" });
    try {
      const response = await root.fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(item.payload)
      });
      const backendStatus = await responseStatus(response);
      if (response.status === 200 && (backendStatus === "IMPORTED" || backendStatus === "DUPLICATE")) {
        return updateItem(eventId, { status: "synced", last_error: "", backend_status: backendStatus, synced_at: nowIso() });
      }
      if (response.status >= 500) {
        return updateItem(eventId, { status: "pending", last_error: `Error temporal del servidor (${response.status}).`, backend_status: backendStatus });
      }
      return updateItem(eventId, {
        status: "error",
        last_error: backendStatus ? `Respuesta no aceptada: ${backendStatus}.` : `Respuesta no aceptada (${response.status}).`,
        backend_status: backendStatus
      });
    } catch (_) {
      return updateItem(eventId, { status: "pending", last_error: "Error de conexión.", backend_status: "" });
    } finally {
      inFlight.delete(eventId);
    }
  }

  function scheduleSend(eventId) {
    if (!isOnline()) return;
    Promise.resolve().then(() => sendItem(eventId)).catch(() => {});
  }

  async function retryPending() {
    if (!isOnline()) {
      notify();
      return [];
    }
    const retryable = readQueue().filter((item) => item && item.status !== "synced");
    return Promise.all(retryable.map((item) => sendItem(item.event_id)));
  }

  function summary(eventId) {
    let queue = [];
    try {
      queue = readQueue();
    } catch (_) {
      return { state: "error", label: "🔴 Error de conexión", detail: "No se puede leer la cola local.", can_retry: true, pending_count: 0 };
    }
    const pending = queue.filter((item) => item && item.status !== "synced");
    const selected = (eventId && pending.find((item) => item.event_id === eventId))
      || pending[0]
      || (eventId && queue.find((item) => item && item.event_id === eventId))
      || queue[0];
    if (!selected || selected.status === "synced") {
      return {
        state: "synced",
        label: "🟢 Sincronizado",
        detail: selected ? "Subido a Google Drive." : "No hay registros pendientes.",
        can_retry: false,
        pending_count: pending.length
      };
    }
    if (selected.status === "error" || selected.last_error) {
      return { state: "error", label: "🔴 Error de conexión", detail: "El registro sigue guardado en este móvil.", can_retry: true, pending_count: pending.length, event_id: selected.event_id };
    }
    return { state: "pending", label: "🟡 Pendiente", detail: "Guardado en este móvil; esperando cobertura.", can_retry: true, pending_count: pending.length, event_id: selected.event_id };
  }

  function subscribe(listener) {
    if (typeof listener !== "function" || typeof root.addEventListener !== "function") return function () {};
    const handler = (event) => listener(event.detail || summary());
    root.addEventListener(CHANGE_EVENT, handler);
    return () => root.removeEventListener(CHANGE_EVENT, handler);
  }

  if (typeof root.addEventListener === "function") {
    root.addEventListener("online", () => { retryPending().catch(() => {}); });
    root.addEventListener("storage", (event) => {
      if (event.key === QUEUE_KEY) notify();
    });
  }

  return {
    ENDPOINT,
    QUEUE_KEY,
    CHECKIN_LOG_KEY,
    buildTrainingPayload,
    createEventId,
    enqueuePayload,
    readQueue: () => clone(readQueue()),
    retryPending,
    saveCheckinLocal,
    sendItem,
    subscribe,
    summary
  };
});
