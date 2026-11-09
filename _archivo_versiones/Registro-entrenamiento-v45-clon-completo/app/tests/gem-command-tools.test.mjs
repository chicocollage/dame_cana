import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserSandbox, loadScript, plain } from "./load-browser-module.mjs";

async function loadGemTools() {
  const sandbox = createBrowserSandbox();
  await loadScript("../public/app/gem-command-tools.js", sandbox);
  return sandbox.GemCommandTools;
}

test("prepara comandos Gem con el contrato exacto de Sheets", async () => {
  const tools = await loadGemTools();
  let sent;
  const result = await tools.execute('{"action":"alta_maquina"}', {
    now: () => 1234567890,
    fetch: async (url, options) => {
      sent = { url, options };
      return new Response(JSON.stringify({ status: "IMPORTED", code: 200, message: "Máquina registrada." }), { status: 200 });
    }
  });

  assert.equal(sent.url, tools.ENDPOINT);
  assert.equal(sent.options.method, "POST");
  assert.deepEqual(plain(sent.options.headers), { "Content-Type": "text/plain;charset=utf-8" });
  assert.deepEqual(JSON.parse(sent.options.body), {
    schema: "gem_command.v1",
    event_id: "CMD-1234567890",
    rawCommand: '{"action":"alta_maquina"}'
  });
  assert.deepEqual(plain(result), { ok: true, message: "Máquina registrada." });
});

test("mantiene el texto para corregir cuando Sheets rechaza el comando", async () => {
  const tools = await loadGemTools();
  const result = await tools.execute('{"invalid":true}', {
    fetch: async () => new Response(JSON.stringify({ status: "ERROR", code: 400, message: "Falta el identificador." }), { status: 400 })
  });

  assert.deepEqual(plain(result), { ok: false, message: "Falta el identificador." });
  assert.deepEqual(plain(await tools.execute("   ")), {
    ok: false,
    message: "Pega un comando generado por tu Gem antes de ejecutarlo."
  });
});
