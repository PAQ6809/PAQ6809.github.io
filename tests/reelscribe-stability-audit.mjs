import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const compatibility = read("reelscribe/format-compat.js");
const runtime = read("reelscribe/runtime-optimizer.js");
const app = read("reelscribe/app.js");
const ui = read("reelscribe/ui.js");
const serviceWorker = read("reelscribe/sw.js");
const screenOcr = read("reelscribe/screen-ocr.js");

assert.match(compatibility, /class ResilientModelWorker extends EventTarget/);
assert.match(compatibility, /foreground-preempted-background/);
assert.match(compatibility, /transcription-preempted-background/);
assert.match(compatibility, /mobile-serial-load/);
assert.match(compatibility, /cancelBackgroundWork/);
assert.match(compatibility, /Object\.defineProperty\(window, "ReelScribeApp"/);
assert.match(compatibility, /releaseLoadedOnMobile/);
assert.match(compatibility, /history\.replaceState/);
assert.match(compatibility, /start-screen-ocr/);
assert.match(compatibility, /ReelScribeScreenOcr\?\.isRunning/);

assert.match(runtime, /const BUILD = "2026\.07\.13\.8"/);
assert.match(runtime, /if \(!force && isMobile\(\)\)/);
assert.match(runtime, /行動裝置已停用自動背景下載/);
assert.match(runtime, /app\.getFile\?\.\(\) \|\| app\.isProcessing\?\.\(\)/);
assert.match(runtime, /cancelScheduledPreparation/);
assert.match(runtime, /cancelBackgroundPreparation/);
assert.match(runtime, /prepare-timeout/);
assert.match(runtime, /document\.visibilityState === "hidden"/);
assert.match(runtime, /requestIdleCallback/);
assert.match(runtime, /HARD_PRESSURE_RATIO = 0\.82/);

for (const [name, source] of [
  ["app", app],
  ["ui", ui],
  ["runtime", runtime],
  ["service worker", serviceWorker],
]) {
  assert.doesNotMatch(source, /window\.location\.reload\s*\(/, `${name} must not force reload`);
  assert.doesNotMatch(source, /controllerchange/, `${name} must not reload on controller change`);
}

assert.doesNotMatch(serviceWorker, /skipWaiting\s*\(/);
assert.doesNotMatch(serviceWorker, /clients\.claim\s*\(/);
assert.match(serviceWorker, /reelscribe-shell-v13/);
assert.match(screenOcr, /isRunning:\s*\(\) => running/);

assert.doesNotMatch(compatibility, /document\.cookie|new Function\s*\(|\beval\s*\(/);
assert.doesNotMatch(runtime, /document\.cookie|new Function\s*\(|\beval\s*\(/);

console.log("ReelScribe stability audit passed: no forced reload, mobile serial model loading, background-worker preemption, OCR/transcription exclusion, and storage-aware warmup.");