import assert from "node:assert/strict";
import test from "node:test";

import { loadBrowserModule, plain } from "./load-browser-module.mjs";

const sounds = await loadBrowserModule("../public/app/timer-sounds.js", "TrainingTimerSounds");

function fakeAudioContext(overrides = {}) {
  const oscillators = [];
  const gains = [];
  const destination = { name: "destination" };
  const context = {
    state: "running",
    currentTime: 10,
    destination,
    createOscillator() {
      const oscillator = {
        type: "",
        frequency: {
          calls: [],
          setValueAtTime(value, time) { this.calls.push(["set", value, time]); },
          exponentialRampToValueAtTime(value, time) { this.calls.push(["ramp", value, time]); },
        },
        connections: [],
        starts: [],
        stops: [],
        connect(target) { this.connections.push(target); return target; },
        start(time) { this.starts.push(time); },
        stop(time) { this.stops.push(time); },
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      const gain = {
        gain: {
          calls: [],
          setValueAtTime(value, time) { this.calls.push(["set", value, time]); },
          exponentialRampToValueAtTime(value, time) { this.calls.push(["ramp", value, time]); },
        },
        connections: [],
        connect(target) { this.connections.push(target); return target; },
      };
      gains.push(gain);
      return gain;
    },
    ...overrides,
  };
  return { context, destination, gains, oscillators };
}

test("expone tres perfiles estables y usa la bocina deportiva como fallback", () => {
  assert.equal(sounds.DEFAULT_PROFILE, "sport_horn");
  assert.deepEqual(Object.keys(sounds.PROFILES), ["sport_horn", "clean_bell", "deep_pulse"]);
  assert.equal(sounds.PROFILES.sport_horn.label, "Bocina deportiva");
  assert.equal(sounds.PROFILES.clean_bell.label, "Campana limpia");
  assert.equal(sounds.PROFILES.deep_pulse.label, "Pulso grave");
  assert.equal(sounds.normalizeProfile("clean_bell"), "clean_bell");
  assert.equal(sounds.normalizeProfile("perfil_desconocido"), "sport_horn");
  assert.equal(sounds.normalizeProfile(null), "sport_horn");
});

test("genera planes deterministas, válidos y distintos por perfil", () => {
  const profiles = Object.keys(sounds.PROFILES);
  const plans = profiles.map((profile) => plain(sounds.tonePlan(profile)));
  profiles.forEach((profile, index) => {
    assert.deepEqual(plain(sounds.tonePlan(profile)), plans[index]);
    assert.ok(plans[index].length >= 2);
    plans[index].forEach((tone) => {
      assert.ok(tone.delay >= 0);
      assert.ok(tone.duration > 0);
      assert.ok(tone.from > 0);
      assert.ok(tone.to > 0);
      assert.ok(tone.gain > 0 && tone.gain <= 1);
      assert.ok(["sine", "square", "sawtooth", "triangle"].includes(tone.type));
    });
  });
  assert.notDeepEqual(plans[0], plans[1]);
  assert.notDeepEqual(plans[1], plans[2]);
  assert.deepEqual(plain(sounds.tonePlan("desconocido")), plans[0]);
});

test("no programa audio sin contexto y admite suspended para activar auto-resume", () => {
  assert.equal(sounds.play(null, "sport_horn"), false);
  const suspended = fakeAudioContext({ state: "suspended" });
  assert.equal(sounds.play(suspended.context, "clean_bell"), true);
  assert.equal(suspended.oscillators.length, sounds.tonePlan("clean_bell").length);
  assert.equal(suspended.gains.length, sounds.tonePlan("clean_bell").length);
  const closed = fakeAudioContext({ state: "closed" });
  assert.equal(sounds.play(closed.context, "clean_bell"), false);
  assert.equal(closed.oscillators.length, 0);
});

test("play devuelve false si Web Audio falla durante la programación", () => {
  const broken = fakeAudioContext({
    createOscillator() { throw new Error("Audio bloqueado"); },
  });
  assert.equal(sounds.play(broken.context, "sport_horn"), false);
});

test("programa cada tono en un AudioContext activo", () => {
  const fake = fakeAudioContext();
  const plan = plain(sounds.tonePlan("clean_bell"));
  assert.equal(sounds.play(fake.context, "clean_bell"), true);
  assert.equal(fake.oscillators.length, plan.length);
  assert.equal(fake.gains.length, plan.length);

  plan.forEach((tone, index) => {
    const begins = fake.context.currentTime + 0.03 + tone.delay;
    const oscillator = fake.oscillators[index];
    const gain = fake.gains[index];
    assert.equal(oscillator.type, tone.type);
    assert.deepEqual(oscillator.frequency.calls, [
      ["set", tone.from, begins],
      ["ramp", tone.to, begins + tone.duration],
    ]);
    assert.deepEqual(gain.gain.calls, [
      ["set", 0.0001, begins],
      ["ramp", tone.gain, begins + 0.012],
      ["ramp", 0.0001, begins + tone.duration],
    ]);
    assert.equal(oscillator.connections[0], gain);
    assert.equal(gain.connections[0], fake.destination);
    assert.deepEqual(oscillator.starts, [begins]);
    assert.deepEqual(oscillator.stops, [begins + tone.duration + 0.015]);
  });
});

test("unlock arranca una fuente silenciosa incluso con el contexto suspendido", () => {
  const fake = fakeAudioContext({ state: "suspended" });
  assert.equal(sounds.unlock(fake.context), true);
  assert.equal(fake.oscillators.length, 1);
  assert.deepEqual(fake.oscillators[0].frequency.calls, [["set", 440, fake.context.currentTime]]);
  assert.deepEqual(fake.gains[0].gain.calls, [["set", 0.0001, fake.context.currentTime]]);
  assert.deepEqual(fake.oscillators[0].starts, [fake.context.currentTime]);
  assert.deepEqual(fake.oscillators[0].stops, [fake.context.currentTime + 0.02]);
});

test("unlock desconecta el grafo si no puede detener la fuente de cebado", () => {
  const calls = { oscillatorDisconnect: 0, gainDisconnect: 0 };
  const gain = {
    gain: { setValueAtTime() {} },
    connect() { return this; },
    disconnect() { calls.gainDisconnect += 1; },
  };
  const oscillator = {
    frequency: { setValueAtTime() {} },
    connect() { return gain; },
    start() {},
    stop() { throw new Error("stop bloqueado"); },
    disconnect() { calls.oscillatorDisconnect += 1; },
  };
  const context = {
    state: "suspended",
    currentTime: 10,
    destination: {},
    createOscillator() { return oscillator; },
    createGain() { return gain; },
  };
  assert.equal(sounds.unlock(context), false);
  assert.deepEqual(calls, { oscillatorDisconnect: 1, gainDisconnect: 1 });
});

test("schedule usa el reloj de audio y permite cancelar una alarma futura", () => {
  const fake = fakeAudioContext();
  const alarm = sounds.schedule(fake.context, "clean_bell", 30);
  assert.ok(alarm);
  assert.equal(alarm.startsAt, fake.context.currentTime + 30);
  assert.ok(alarm.endsAt > alarm.startsAt);
  assert.equal(fake.oscillators[0].starts[0], fake.context.currentTime + 30);
  alarm.cancel();
  fake.oscillators.forEach((oscillator) => {
    assert.equal(oscillator.stops.at(-1), fake.context.currentTime);
  });
});

test("un fallo al construir el grafo no deja tonos parciales arrancados", () => {
  let created = 0;
  const fake = fakeAudioContext({
    createOscillator() {
      created += 1;
      if (created === 2) throw new Error("segundo tono roto");
      return fake.context.__originalCreateOscillator();
    },
  });
  fake.context.__originalCreateOscillator = () => {
    const oscillator = {
      type: "",
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      starts: [],
      stops: [],
      connect(target) { return target; },
      start(time) { this.starts.push(time); },
      stop(time) { this.stops.push(time); },
    };
    fake.oscillators.push(oscillator);
    return oscillator;
  };
  assert.equal(sounds.play(fake.context, "sport_horn"), false);
  assert.equal(fake.oscillators[0].starts.length, 0);
});

test("programa el fallback exactamente como el perfil predeterminado", () => {
  const defaultFake = fakeAudioContext();
  const fallbackFake = fakeAudioContext();
  assert.equal(sounds.play(defaultFake.context, sounds.DEFAULT_PROFILE), true);
  assert.equal(sounds.play(fallbackFake.context, "no_existe"), true);

  const schedule = (fake) => fake.oscillators.map((oscillator, index) => ({
    type: oscillator.type,
    frequency: oscillator.frequency.calls,
    gain: fake.gains[index].gain.calls,
    starts: oscillator.starts,
    stops: oscillator.stops,
  }));
  assert.deepEqual(schedule(fallbackFake), schedule(defaultFake));
});

test("sport_horn incluye un armónico medio y energía audible objetiva", () => {
  const plan = plain(sounds.tonePlan("sport_horn"));
  assert.ok(plan.some((tone) => tone.from >= 400 && tone.from <= 1200 && tone.to >= 300 && tone.gain >= 0.05),
    "la bocina debe incluir un armónico en la banda media");
  assert.ok(plan.some((tone) => tone.gain >= 0.18 && tone.duration >= 0.2),
    "la bocina debe incluir al menos un tono principal con ganancia y duración apreciables");
  assert.ok(new Set(plan.map((tone) => tone.delay)).size >= 2, "la bocina debe conservar más de un impulso");
});
