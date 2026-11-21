(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingTimerSounds = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEFAULT_PROFILE = "sport_horn";
  const PROFILES = {
    sport_horn: { label: "Bocina deportiva" },
    clean_bell: { label: "Campana limpia" },
    deep_pulse: { label: "Pulso grave" }
  };

  function normalizeProfile(value) {
    return Object.prototype.hasOwnProperty.call(PROFILES, value) ? value : DEFAULT_PROFILE;
  }

  // Keeping the sound plan as data makes profiles deterministic and testable offline.
  function tonePlan(profileValue) {
    const profile = normalizeProfile(profileValue);
    if (profile === "clean_bell") {
      return [
        { delay: 0, duration: 0.52, type: "sine", from: 880, to: 760, gain: 0.15 },
        { delay: 0, duration: 0.38, type: "sine", from: 1320, to: 1140, gain: 0.07 }
      ];
    }
    if (profile === "deep_pulse") {
      return [0, 0.24].flatMap((delay) => [
        { delay, duration: 0.22, type: "triangle", from: 180, to: 105, gain: 0.24 },
        { delay, duration: 0.2, type: "sine", from: 360, to: 220, gain: 0.1 }
      ]);
    }
    return [0, 0.29].flatMap((delay) => [
      { delay, duration: 0.25, type: "sawtooth", from: 310, to: 205, gain: 0.22 },
      { delay, duration: 0.23, type: "square", from: 760, to: 480, gain: 0.12 },
      { delay, duration: 0.24, type: "sine", from: 155, to: 115, gain: 0.08 }
    ]);
  }

  function unlock(context) {
    if (!context || context.state === "closed") return false;
    let oscillator = null;
    let gain = null;
    try {
      // Starting a source inside the user's gesture gives Chrome's autoplay policy
      // a real audio graph to unlock; resume() alone can be insufficient on Android.
      oscillator = context.createOscillator();
      gain = context.createGain();
      const now = context.currentTime;
      oscillator.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.0001, now);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.02);
      return true;
    } catch (_) {
      try { if (oscillator) oscillator.stop(context.currentTime); } catch (_) { /* unavailable */ }
      try { if (oscillator && oscillator.disconnect) oscillator.disconnect(); } catch (_) { /* unavailable */ }
      try { if (gain && gain.disconnect) gain.disconnect(); } catch (_) { /* unavailable */ }
      return false;
    }
  }

  function schedule(context, profileValue, delayValue) {
    if (!context || context.state === "closed") return null;
    const nodes = [];
    try {
      const delay = Math.max(0.03, Number(delayValue) || 0);
      const start = context.currentTime + delay;
      tonePlan(profileValue).forEach((tone) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const begins = start + tone.delay;
        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.from, begins);
        oscillator.frequency.exponentialRampToValueAtTime(tone.to, begins + tone.duration);
        gain.gain.setValueAtTime(0.0001, begins);
        gain.gain.exponentialRampToValueAtTime(tone.gain, begins + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, begins + tone.duration);
        oscillator.connect(gain).connect(context.destination);
        nodes.push({ oscillator, begins, ends: begins + tone.duration + 0.015 });
      });
      // Build the complete graph before starting any node so a construction failure
      // cannot leave a partial horn playing.
      nodes.forEach(({ oscillator, begins, ends }) => {
        oscillator.start(begins);
        oscillator.stop(ends);
      });
      let cancelled = false;
      return {
        startsAt: start,
        endsAt: Math.max(...nodes.map(({ ends }) => ends)),
        cancel() {
          if (cancelled) return;
          cancelled = true;
          nodes.forEach(({ oscillator }) => {
            try { oscillator.stop(context.currentTime); } catch (_) { /* already stopped */ }
          });
        }
      };
    } catch (_) {
      nodes.forEach(({ oscillator }) => {
        try { oscillator.stop(context.currentTime); } catch (_) { /* not started */ }
      });
      return null;
    }
  }

  function play(context, profileValue) {
    return Boolean(schedule(context, profileValue, 0));
  }

  return { DEFAULT_PROFILE, PROFILES, normalizeProfile, play, schedule, tonePlan, unlock };
});
