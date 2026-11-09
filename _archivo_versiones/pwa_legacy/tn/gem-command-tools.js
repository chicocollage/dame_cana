(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GemCommandTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbwQIItMuOszCh2RmjtnoymELZky0GifsZD_0KsREs7rlBETHIzi8lDDfDFknB3XAgnt/exec";
  function getEndpoint() {
    try {
      return (globalThis.localStorage && globalThis.localStorage.getItem("training_sync_endpoint")) || ENDPOINT;
    } catch (_) {
      return ENDPOINT;
    }
  }

  function createEventId(now) {
    const timestamp = typeof now === "function" ? now() : Date.now();
    return `CMD-${timestamp}`;
  }

  async function readResponse(response) {
    const bodyText = await response.text();
    if (!bodyText) return {};
    try {
      return JSON.parse(bodyText);
    } catch (_) {
      return { message: bodyText };
    }
  }

  async function execute(rawCommand, options) {
    const command = String(rawCommand || "").trim();
    if (!command) return { ok: false, message: "Pega un comando generado por tu Gem antes de ejecutarlo." };

    const settings = options || {};
    const request = settings.fetch || (typeof fetch === "function" ? fetch : null);
    if (!request) throw new Error("No se ha podido preparar la conexión con Sheets.");

    const targetUrl = settings.endpoint || getEndpoint();
    const response = await request(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        schema: "gem_command.v1",
        event_id: createEventId(settings.now),
        rawCommand: command
      })
    });
    const payload = await readResponse(response);
    const acceptedCode = payload.code == null || Number(payload.code) === 200;

    if (response.ok && payload.status === "IMPORTED" && acceptedCode) {
      return { ok: true, message: payload.message || "Acción aplicada en Google Sheets." };
    }

    return {
      ok: false,
      message: payload.message || "Sheets no ha podido aplicar este comando. Revísalo e inténtalo de nuevo."
    };
  }

  return Object.freeze({ ENDPOINT, createEventId, execute });
});
