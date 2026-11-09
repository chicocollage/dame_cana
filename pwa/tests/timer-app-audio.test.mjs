import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const app = await readFile(new URL("../public/app/app.js", import.meta.url), "utf8");

function functionSource(name) {
  const functionStart = app.indexOf(`function ${name}`);
  assert.notEqual(functionStart, -1, `no se encontró ${name}`);
  const start = app.slice(functionStart - 6, functionStart) === "async " ? functionStart - 6 : functionStart;
  const open = app.indexOf("{", functionStart);
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

async function prime(initialContext, allowCreate, AudioContextClass) {
  const context = {
    __initial: initialContext,
    __allowCreate: allowCreate,
    __AudioContextClass: AudioContextClass,
    __unlocks: 0,
    result: null,
  };
  await vm.runInNewContext(`(async () => {
    let audioContext = __initial;
    const timerSoundEnabled = () => true;
    const window = { AudioContext: __AudioContextClass };
    const TrainingTimerSounds = { unlock() { __unlocks += 1; return true; } };
    ${functionSource("primeTimerAudio")}
    const value = await primeTimerAudio(__allowCreate);
    result = { value, audioContext, unlocks: __unlocks };
  })()`, context);
  return context.result;
}

test("prime crea bajo allowCreate y recrea un contexto cerrado", async () => {
  let created = 0;
  class FakeAudioContext {
    constructor() { created += 1; this.state = "running"; }
  }
  const absentWithoutGesture = await prime(null, false, FakeAudioContext);
  assert.equal(absentWithoutGesture.value, false);
  assert.equal(created, 0);

  const createdWithGesture = await prime(null, true, FakeAudioContext);
  assert.equal(createdWithGesture.value, true);
  assert.equal(created, 1);
  assert.equal(createdWithGesture.unlocks, 1);

  const closedWithoutGesture = await prime({ state: "closed" }, false, FakeAudioContext);
  assert.equal(closedWithoutGesture.value, false);
  assert.equal(created, 1);

  const recreated = await prime({ state: "closed" }, true, FakeAudioContext);
  assert.equal(recreated.value, true);
  assert.equal(created, 2);
  assert.equal(recreated.audioContext.state, "running");
  assert.equal(recreated.unlocks, 1);
});

test("prime reanuda contextos suspended e interrupted", async () => {
  for (const initialState of ["suspended", "interrupted"]) {
    let resumes = 0;
    const audioContext = {
      state: initialState,
      async resume() { resumes += 1; this.state = "running"; },
    };
    const result = await prime(audioContext, false, class Unused {});
    assert.equal(result.value, true);
    assert.equal(resumes, 1);
    assert.equal(result.audioContext, audioContext);
  }
});

test("prime arranca una fuente antes de esperar a resume", async () => {
  const context = { order: [], result: null };
  await vm.runInNewContext(`(async () => {
    let audioContext = null;
    class FakeAudioContext {
      constructor() { this.state = "suspended"; }
      async resume() { order.push("resume"); this.state = "running"; }
    }
    const window = { AudioContext: FakeAudioContext };
    const timerSoundEnabled = () => true;
    const TrainingTimerSounds = { unlock() { order.push("unlock"); return true; } };
    ${functionSource("primeTimerAudio")}
    result = await primeTimerAudio(true);
  })()`, context);
  assert.equal(context.result, true);
  assert.deepEqual(context.order, ["unlock", "resume"]);
});

test("fallo al reanudar audio no impide iniciar el temporizador visual", async () => {
  const context = { result: null };
  await vm.runInNewContext(`(async () => {
    let audioContext = null;
    class BrokenAudioContext {
      constructor() { this.state = "suspended"; }
      async resume() { throw new Error("bloqueado"); }
    }
    const window = { AudioContext: BrokenAudioContext };
    const TrainingTimerSounds = { unlock() { return true; } };
    const timerSoundEnabled = () => true;
    let restTimerEndsAt = 0;
    let restTimerRemaining = 0;
    let restTimerTotal = 0;
    let restTimerComplete = false;
    let restTimerInterval = null;
    const selectedRestSeconds = () => 60;
    const TrainingRestTimerTools = { pausedSeconds: () => 0 };
    const finishRestTimer = async () => {};
    const tickRestTimer = () => {};
    const setInterval = () => "interval";
    const clearInterval = () => {};
    const navigator = { vibrate() {} };
    const toast = () => {};
    let renders = 0;
    const renderRestTimer = () => { renders += 1; };
    ${functionSource("primeTimerAudio")}
    ${functionSource("toggleRestTimer")}
    const before = Date.now();
    await toggleRestTimer();
    result = { restTimerEndsAt, restTimerTotal, restTimerInterval, renders, before };
  })()`, context);
  assert.ok(context.result.restTimerEndsAt >= context.result.before + 60_000);
  assert.equal(context.result.restTimerTotal, 60);
  assert.equal(context.result.restTimerInterval, "interval");
  assert.equal(context.result.renders, 1);
});

test("playTimerAlarm es seguro ante reproducción fallida", async () => {
  const context = { result: null };
  await vm.runInNewContext(`(async () => {
    let audioContext = { state: "running" };
    let immediateTimerAlarm = null;
    const timerSoundEnabled = () => true;
    const timerSoundProfile = () => "sport_horn";
    const window = {};
    const TrainingTimerSounds = { schedule() { throw new Error("salida rota"); } };
    ${functionSource("primeTimerAudio")}
    ${functionSource("playTimerAlarm")}
    result = await playTimerAlarm();
  })()`, context);
  assert.equal(context.result, false);
});

test("silenciar durante resume cancela la alarma inmediata pendiente", async () => {
  const context = { calls: { cancel: 0, schedule: 0 }, result: null };
  await vm.runInNewContext(`(async () => {
    let enabled = true;
    let releaseResume = null;
    let immediateTimerAlarm = null;
    const audioContext = { state: "suspended", currentTime: 10 };
    const timerSoundEnabled = () => enabled;
    const timerSoundProfile = () => "sport_horn";
    const TrainingTimerSounds = {
      schedule() {
        calls.schedule += 1;
        return { cancel() { calls.cancel += 1; } };
      }
    };
    const primeTimerAudio = () => new Promise((resolve) => {
      releaseResume = () => { audioContext.state = "running"; resolve(true); };
    });
    ${functionSource("playTimerAlarm")}
    const playing = playTimerAlarm();
    enabled = false;
    releaseResume();
    result = { played: await playing, pending: Boolean(immediateTimerAlarm) };
  })()`, context);
  assert.deepEqual(context.calls, { cancel: 1, schedule: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)), { played: false, pending: false });
});

test("finishRestTimer es idempotente aunque la alarma sea asíncrona", async () => {
  const calls = { alarm: 0, clear: 0, render: 0, toast: 0, vibrate: 0 };
  const context = { __calls: calls, result: null };
  await vm.runInNewContext(`(async () => {
    let restTimerComplete = false;
    let restTimerInterval = "interval";
    let restTimerEndsAt = 123;
    let restTimerRemaining = 45;
    let scheduledTimerAlarm = null;
    const audioContext = null;
    const clearInterval = () => { __calls.clear += 1; };
    const renderRestTimer = () => { __calls.render += 1; };
    const navigator = { vibrate() { __calls.vibrate += 1; } };
    const playTimerAlarm = async () => { __calls.alarm += 1; await Promise.resolve(); return true; };
    const cancelScheduledTimerAlarm = () => { scheduledTimerAlarm = null; };
    const timerSoundEnabled = () => true;
    const toast = () => { __calls.toast += 1; };
    ${functionSource("finishRestTimer")}
    await Promise.all([finishRestTimer(), finishRestTimer()]);
    result = { restTimerComplete, restTimerInterval, restTimerEndsAt, restTimerRemaining };
  })()`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)), {
    restTimerComplete: true,
    restTimerInterval: null,
    restTimerEndsAt: 0,
    restTimerRemaining: 0,
  });
  assert.deepEqual(calls, { alarm: 1, clear: 1, render: 1, toast: 1, vibrate: 1 });
});

async function finishWithQueuedAlarm(currentTime, startsAt, state = "running") {
  const calls = { alarm: 0, cancel: 0 };
  const context = { __calls: calls, __currentTime: currentTime, __startsAt: startsAt, __state: state, result: null };
  await vm.runInNewContext(`(async () => {
    let restTimerComplete = false;
    let restTimerInterval = "interval";
    let restTimerEndsAt = 123;
    let restTimerRemaining = 1;
    let scheduledTimerAlarm = { startsAt: __startsAt, endsAt: __startsAt + 0.8, cancel() { __calls.cancel += 1; } };
    const audioContext = { state: __state, currentTime: __currentTime };
    const clearInterval = () => {};
    const renderRestTimer = () => {};
    const navigator = { vibrate() {} };
    const timerSoundEnabled = () => true;
    const playTimerAlarm = async () => { __calls.alarm += 1; return true; };
    const cancelScheduledTimerAlarm = () => {
      if (!scheduledTimerAlarm) return;
      scheduledTimerAlarm.cancel();
      scheduledTimerAlarm = null;
    };
    const toast = () => {};
    ${functionSource("finishRestTimer")}
    await finishRestTimer();
    result = { scheduled: Boolean(scheduledTimerAlarm) };
  })()`, context);
  return { calls, result: context.result };
}

test("finalizar cancela una alarma cuyo reloj de audio aún no llegó y usa fallback", async () => {
  const finished = await finishWithQueuedAlarm(20, 30);
  assert.deepEqual(finished.calls, { alarm: 1, cancel: 1 });
  assert.equal(finished.result.scheduled, false);
});

test("finalizar no duplica una alarma cuyo instante ya llegó", async () => {
  const finished = await finishWithQueuedAlarm(30.01, 30);
  assert.deepEqual(finished.calls, { alarm: 0, cancel: 0 });
  assert.equal(finished.result.scheduled, true);
});

test("finalizar no duplica una alarma ya iniciada aunque el contexto esté suspendido", async () => {
  const finished = await finishWithQueuedAlarm(30.4, 30, "suspended");
  assert.deepEqual(finished.calls, { alarm: 0, cancel: 0 });
  assert.equal(finished.result.scheduled, true);
});

test("finalizar libera el handle de una alarma que ya terminó", async () => {
  const finished = await finishWithQueuedAlarm(31, 30, "suspended");
  assert.deepEqual(finished.calls, { alarm: 0, cancel: 0 });
  assert.equal(finished.result.scheduled, false);
});

test("añadir tiempo cancela siempre y rearma tras recuperar un contexto suspendido", async () => {
  const context = { calls: { arm: 0, cancel: 0, prime: 0 }, result: null };
  await vm.runInNewContext(`(async () => {
    let restTimerEndsAt = 1000;
    let restTimerRemaining = 0;
    let restTimerTotal = 60;
    let restTimerComplete = false;
    const selectedRestSeconds = () => 60;
    const timerSoundEnabled = () => true;
    const cancelScheduledTimerAlarm = () => { calls.cancel += 1; };
    const primeTimerAudio = async () => { calls.prime += 1; return true; };
    const armTimerAlarm = () => { calls.arm += 1; return true; };
    const TrainingRestTimerTools = {
      extend() { return { endsAt: 31000, remaining: 0, total: 90 }; }
    };
    const renderRestTimer = () => {};
    const toast = () => {};
    ${functionSource("addRestTime")}
    addRestTime(30);
    await Promise.resolve();
    result = { restTimerEndsAt, restTimerTotal };
  })()`, context);
  assert.deepEqual(context.calls, { arm: 1, cancel: 1, prime: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)), { restTimerEndsAt: 31000, restTimerTotal: 90 });
});
