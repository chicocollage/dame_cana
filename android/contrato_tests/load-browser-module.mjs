import { readFile } from "node:fs/promises";
import vm from "node:vm";

export function createBrowserSandbox(overrides = {}) {
  const sandbox = {
    ArrayBuffer,
    Blob,
    Date,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    clearTimeout,
    console,
    setTimeout,
    ...overrides,
  };
  sandbox.self = sandbox;
  return vm.createContext(sandbox);
}

export async function loadScript(relativePath, sandbox = createBrowserSandbox()) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(fileUrl, "utf8");
  vm.runInContext(source, sandbox, { filename: fileUrl.pathname });
  return sandbox;
}

export async function loadBrowserModule(relativePath, globalName) {
  const sandbox = await loadScript(relativePath);
  if (!sandbox[globalName]) throw new Error(`El módulo ${relativePath} no expuso ${globalName}.`);
  return sandbox[globalName];
}

export async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
