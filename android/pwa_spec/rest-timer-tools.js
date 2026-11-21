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

  // Lee ?descanso=<segundos>&t=<id> (URL grabada en una etiqueta NFC).
  // Devuelve { seconds, id } o null si falta o es inválido (10–1800 s, entero).
  function parseNfcTrigger(search) {
    const query = String(search || "").replace(/^\?/, "");
    const params = {};
    query.split("&").forEach((pair) => {
      const index = pair.indexOf("=");
      if (index < 1) return;
      try { params[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1)); } catch (error) { /* ignora pares mal codificados */ }
    });
    const raw = params.descanso;
    if (typeof raw !== "string" || !/^\d{1,4}$/.test(raw.trim())) return null;
    const seconds = Number(raw);
    if (seconds < 10 || seconds > 1800) return null;
    return { seconds, id: params.t || "" };
  }

  // Comando NFC genérico: ?descanso=N[&t=ID] (iniciar descanso) o ?accion=pausa[&t=ID] (pausar/reanudar).
  function parseNfcCommand(search) {
    const rest = parseNfcTrigger(search);
    if (rest) return { type: "rest", seconds: rest.seconds, id: rest.id };
    const query = String(search || "").replace(/^\?/, "");
    const params = {};
    query.split("&").forEach((pair) => {
      const index = pair.indexOf("=");
      if (index < 1) return;
      try { params[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1)); } catch (error) { /* ignora pares mal codificados */ }
    });
    if (params.accion === "pausa") return { type: "toggle", id: params.t || "" };
    return null;
  }

  // URL intent: de Chrome Android para la app Reloj (alarma del sistema). "set" arma un temporizador
  // sin interfaz; "dismiss" cancela los temporizadores (API 26+). Devuelve "" si los segundos no son válidos.
  function buildClockIntent(kind, secondsValue, label) {
    if (kind === "dismiss") return "intent://#Intent;action=android.intent.action.DISMISS_TIMER;end;";
    const seconds = Math.floor(finite(secondsValue));
    if (kind !== "set" || seconds < 1 || seconds > 86400) return "";
    const message = encodeURIComponent(String(label || "Descanso")).replace(/;/g, "%3B");
    return `intent://#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=${seconds};B.android.intent.extra.alarm.SKIP_UI=true;S.android.intent.extra.alarm.MESSAGE=${message};end;`;
  }

  return { adjust, buildClockIntent, extend, parseNfcCommand, parseNfcTrigger, pausedSeconds, snapshot };
});
