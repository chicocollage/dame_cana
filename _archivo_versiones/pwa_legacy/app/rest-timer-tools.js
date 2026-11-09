(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingRestTimerTools = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function snapshot(state, nowValue) {
    const source = state || {};
    const now = finite(nowValue) || Date.now();
    const selected = Math.max(1, finite(source.selectedSeconds) || 120);
    const endsAt = Math.max(0, finite(source.endsAt));
    const paused = Math.max(0, finite(source.remaining));
    const complete = Boolean(source.complete);
    const remaining = complete ? 0 : endsAt ? Math.max(0, (endsAt - now) / 1000) : paused || selected;
    const total = Math.max(1, finite(source.total) || selected);
    const ratio = Math.max(0, Math.min(1, remaining / total));
    const status = complete ? "complete" : endsAt ? "running" : paused ? "paused" : "idle";
    const stage = ratio <= 0.2 ? "ending" : ratio <= 0.5 ? "middle" : "full";
    return { remaining, total, ratio, status, stage };
  }

  function pausedSeconds(endsAt, nowValue) {
    return Math.max(0, Math.ceil((finite(endsAt) - (finite(nowValue) || Date.now())) / 1000));
  }

  function adjust(state, deltaValue, nowValue) {
    const source = state || {};
    const delta = finite(deltaValue);
    const now = finite(nowValue) || Date.now();
    const endsAt = Math.max(0, finite(source.endsAt));
    const remaining = Math.max(0, finite(source.remaining));
    const selected = Math.max(1, finite(source.selectedSeconds) || 120);
    const currentRemaining = endsAt
      ? Math.max(0, (endsAt - now) / 1000)
      : remaining;
    const nextRemaining = Math.max(0, currentRemaining + delta);
    const positiveDelta = Math.max(0, delta);
    const hadActiveTimer = Boolean(endsAt || remaining);
    return {
      endsAt: endsAt && nextRemaining > 0 ? now + nextRemaining * 1000 : 0,
      remaining: endsAt ? 0 : nextRemaining,
      // Only an extension increases the visual duration. A reduction advances the
      // remaining time against the original reference instead of making time appear.
      total: Math.max(1, finite(source.total) || selected) + positiveDelta,
      reachedZero: hadActiveTimer && nextRemaining === 0
    };
  }

  // Kept for callers from prior versions. The app uses adjust() when it needs a
  // real-time signed delta; extend() preserves the former deterministic shape.
  function extend(state, secondsValue, nowValue) {
    const source = state || {};
    const seconds = finite(secondsValue);
    const endsAt = Math.max(0, finite(source.endsAt));
    const remaining = Math.max(0, finite(source.remaining));
    const selected = Math.max(1, finite(source.selectedSeconds) || 120);
    return {
      endsAt: endsAt ? Math.max(0, endsAt + seconds * 1000) : 0,
      remaining: endsAt ? remaining : Math.max(0, remaining + seconds),
      total: Math.max(1, finite(source.total) || selected) + Math.max(0, seconds)
    };
  }

  return { adjust, extend, pausedSeconds, snapshot };
});
