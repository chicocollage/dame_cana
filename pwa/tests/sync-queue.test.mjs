import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserSandbox, loadScript, plain } from "./load-browser-module.mjs";

function localStorageFixture(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

async function makeSync(overrides = {}) {
  const navigator = overrides.navigator || { onLine: false };
  const sandbox = createBrowserSandbox({
    localStorage: overrides.localStorage || localStorageFixture(),
    navigator,
    fetch: overrides.fetch,
  });
  await loadScript("../public/app/sync-queue.js", sandbox);
  return { sync: sandbox.TrainingSync, navigator };
}

const finishedSession = {
  id: "session-1",
  title: "Día A",
  date: "2026-08-15T10:00:00.000Z",
  finished: true,
  exercises: [
    {
      name: "Hip thrust",
      identity: { resistanceMode: "external", variant: "Máquina", loadBasis: "total_kg", settings: "3" },
      perSide: false,
      note: "Sin molestias",
      entries: [{ load: "80", reps: "10", rir: "2", difficulty: "" }]
    },
    {
      name: "Remo TRX",
      identity: { resistanceMode: "trx", variant: "TRX", loadBasis: "unknown", settings: "alto" },
      note: "Controlado",
      entries: [{ load: "", reps: "12", rir: "2", difficulty: "pies marca 3" }]
    }
  ]
};

test("crea el payload training_log.v1 finalizado sin inventar carga en TRX", async () => {
  const { sync } = await makeSync();
  const payload = plain(sync.buildTrainingPayload(finishedSession, "EVENT-fixed"));
  assert.equal(payload.schema, "training_log.v1");
  assert.equal(payload.event_id, "EVENT-fixed");
  assert.equal(payload.session.date, "2026-08-15");
  assert.equal(payload.session.finished, true);
  assert.equal(payload.session.exercise_count, 2);
  assert.equal(payload.session.planned_set_count, 2);
  assert.equal(payload.session.recorded_set_count, 2);
  assert.equal(payload.exercises[0].result.sets[0].load_kg, 80);
  assert.equal(payload.exercises[1].result.sets[0].load_kg, null);
  assert.equal(payload.exercises[1].result.sets[0].resistance.difficulty, "pies marca 3");
  assert.throws(() => sync.buildTrainingPayload({ ...finishedSession, finished: false }), /finalizadas/);
  assert.throws(() => sync.enqueuePayload({ schema: "training_active_draft.v1" }), /no se puede sincronizar/);
});

test("conserva event_id en cola, deja 5xx pendiente y sincroniza IMPORTED al reintentar", async () => {
  const calls = [];
  let attempt = 0;
  const navigator = { onLine: false };
  const { sync } = await makeSync({
    navigator,
    fetch: async (url, options) => {
      calls.push({ url, options });
      attempt += 1;
      if (attempt === 1) return new Response(JSON.stringify({ status: "TEMPORARY" }), { status: 503 });
      return new Response(JSON.stringify({ status: "IMPORTED" }), { status: 200 });
    }
  });
  const payload = sync.buildTrainingPayload(finishedSession, "EVENT-stable");
  const queued = sync.enqueuePayload(payload, { recordId: finishedSession.id });
  assert.equal(queued.status, "pending");
  assert.equal(calls.length, 0, "sin cobertura no debe intentar bloquear el guardado");

  navigator.onLine = true;
  await sync.sendItem("EVENT-stable");
  let stored = plain(sync.readQueue()[0]);
  assert.equal(stored.status, "pending");
  assert.match(stored.last_error, /503/);
  assert.equal(sync.summary("EVENT-stable").state, "error");

  await sync.sendItem("EVENT-stable");
  stored = plain(sync.readQueue()[0]);
  assert.equal(stored.status, "synced");
  assert.equal(stored.backend_status, "IMPORTED");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, sync.ENDPOINT);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.equal(JSON.parse(calls[0].options.body).event_id, "EVENT-stable");
  assert.equal(JSON.parse(calls[1].options.body).event_id, "EVENT-stable");
});

test("summary devuelve synced cuando la cola está vacía", async () => {
  const { sync } = await makeSync();
  const result = plain(sync.summary());
  assert.equal(result.state, "synced");
  assert.equal(result.detail, "No hay registros pendientes.");
  assert.equal(result.pending_count, 0);
});
test("acepta DUPLICATE y guarda el check-in local antes de encolarlo", async () => {
  const navigator = { onLine: false };
  const storage = localStorageFixture();
  const { sync } = await makeSync({ navigator, localStorage: storage });
  const payload = {
    schema: "checkin.v1",
    type: "Check-in semanal",
    event_id: "EVENT-checkin",
    date: "2026-08-15",
    sleep_hours: 7.5
  };
  sync.saveCheckinLocal(payload);
  assert.equal(JSON.parse(storage.getItem(sync.CHECKIN_LOG_KEY))[0].event_id, "EVENT-checkin");
  sync.enqueuePayload(payload, { recordId: payload.event_id });
  assert.equal(sync.readQueue()[0].event_id, "EVENT-checkin");

  navigator.onLine = true;
  const duplicateSandbox = createBrowserSandbox({
    localStorage: storage,
    navigator,
    fetch: async () => new Response(JSON.stringify({ status: "DUPLICATE" }), { status: 200 })
  });
  await loadScript("../public/app/sync-queue.js", duplicateSandbox);
  await duplicateSandbox.TrainingSync.sendItem("EVENT-checkin");
  assert.equal(duplicateSandbox.TrainingSync.readQueue()[0].status, "synced");
});
