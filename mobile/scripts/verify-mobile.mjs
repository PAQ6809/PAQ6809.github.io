import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const packageJson = JSON.parse(await read("package.json"));
const capacitor = JSON.parse(await read("capacitor.config.json"));
const catalog = JSON.parse(await read("models/catalog.json"));
const syncScript = await read("scripts/sync-web.mjs");
const nativeEntry = await read("src/native-entry.js");

assert.equal(capacitor.appId, "io.github.paq6809.reelscribe");
assert.equal(capacitor.webDir, "www");
assert.equal(capacitor.android.cleartext, false);
assert.equal(packageJson.dependencies["@capacitor/core"], "8.4.1");
assert.match(syncScript, /window\.__REELSCRIBE_NATIVE__/);
assert.match(syncScript, /registerServiceWorker/);
assert.match(syncScript, /getResult/);
assert.match(nativeEntry, /Filesystem\.writeFile/);
assert.match(nativeEntry, /Share\.share/);
assert.match(nativeEntry, /appUrlOpen/);
assert.doesNotMatch(nativeEntry, /document\.cookie/);
assert.doesNotMatch(nativeEntry, /new Function\s*\(/);
assert.doesNotMatch(nativeEntry, /(^|[^\w])eval\s*\(/m);

const ids = new Set();
for (const model of catalog.models) {
  assert.ok(model.id && !ids.has(model.id), `Duplicate or missing model id: ${model.id}`);
  ids.add(model.id);
  assert.ok(["active-web", "native-candidate", "research-only"].includes(model.state));
  assert.ok(model.licenseReviewRequired === true || typeof model.license === "string");
  assert.ok(model.installPolicy && model.platforms?.length);
}
assert.ok(catalog.models.some((model) => model.id.includes("qwen3-asr-0.6b")));
assert.ok(catalog.models.some((model) => model.id.includes("funasr-nano")));
assert.ok(catalog.models.some((model) => model.id.includes("omnilingual")));
assert.ok(catalog.models.some((model) => model.id.includes("moonshine")));

console.log("ReelScribe mobile verification passed.");
