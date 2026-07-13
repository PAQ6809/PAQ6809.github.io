import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("reelscribe/screen-ocr.js", "utf8");
const ui = fs.readFileSync("reelscribe/ui.js", "utf8");
const serviceWorker = fs.readFileSync("reelscribe/sw.js", "utf8");

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

const names = [
  "normalizeText",
  "compact",
  "similarity",
  "scriptStats",
  "latinWordStats",
  "languagePlausibility",
  "evaluateText",
  "acceptableText",
];
const extracted = names.map((name) => extractFunction(source, name)).join("\n");
const context = vm.createContext({
  console,
  Array,
  String,
  Number,
  Math,
  Map,
  Set,
  window: {
    ReelScribeQualityGuard: {
      isHallucinatedText() { return false; },
    },
  },
  languageSelect: { value: "auto" },
});

vm.runInContext(`
const MIN_PAGE_CONFIDENCE = 50;
function selectedLanguage() { return languageSelect?.value || "auto"; }
${extracted}
globalThis.ocrAudit = { normalizeText, similarity, scriptStats, languagePlausibility, evaluateText, acceptableText };
`, context);

const { similarity, scriptStats, languagePlausibility, evaluateText, acceptableText } = context.ocrAudit;

const screenshotGarbage = "x, - yo § -- Va ) da J 78 ” 4 fad 9 7 % % 4 PE , po a] J i 多";
assert.equal(acceptableText(screenshotGarbage, 92, "chinese"), false, "Mixed OCR gibberish must be rejected");
assert.equal(acceptableText(screenshotGarbage, 92, "auto"), false, "Mixed OCR gibberish must be rejected in auto mode");
assert.equal(acceptableText(">> >> >> >>", 99, "auto"), false, "Symbol-only OCR must be rejected");
assert.equal(acceptableText("A 7 % J -- 4 9", 95, "english"), false, "Noisy alphanumeric OCR must be rejected");
assert.equal(acceptableText("這是一段清楚的繁體中文字幕", 78, "chinese"), true, "Clear Traditional Chinese must pass");
assert.equal(acceptableText("Please keep the page open while subtitles are processed", 80, "english"), true, "Clear English must pass");
assert.equal(acceptableText("字幕を読み取っています", 78, "japanese"), true, "Clear Japanese must pass");
assert.equal(acceptableText("화면 자막을 읽고 있습니다", 78, "korean"), true, "Clear Korean must pass");
assert.equal(acceptableText("清楚字幕", 35, "chinese"), false, "Low-confidence OCR must be rejected");
assert.ok(similarity("這是一段字幕", "這是一段字幕。") >= 0.9, "Adjacent matching subtitle frames should confirm each other");
assert.ok(scriptStats(screenshotGarbage).noiseRatio > 0.3, "Screenshot fixture must remain a noisy mixed-script sample");
assert.equal(languagePlausibility(screenshotGarbage, "chinese"), false);
assert.equal(evaluateText("正常字幕內容", 82, "chinese").reason, "ok");

assert.match(source, /const FRAME_BORDER = 16/);
assert.match(source, /user_defined_dpi:\s*"300"/);
assert.match(source, /bright-text/);
assert.match(source, /function confirmCandidate/);
assert.match(source, /similarity\(pending\.text, candidate\.text\) >= 0\.62/);
assert.match(source, /已略過.*低可信畫面/);
assert.match(source, /isAcceptableText:\s*acceptableText/);
assert.match(ui, /const QUALITY_BUILD = "2026\.07\.13\.9"/);
assert.match(ui, /function isBadOcrText/);
assert.match(ui, /function isBadSavedResult/);
assert.match(ui, /畫面 OCR 只取得混合符號/);
assert.match(serviceWorker, /reelscribe-shell-v15/);
assert.doesNotMatch(serviceWorker, /skipWaiting|clients\.claim|window\.location\.reload/);

console.log("ReelScribe OCR quality audit passed: mixed-script gibberish rejection, language plausibility, temporal confirmation, preprocessing retry, saved-result purge, and stable Service Worker update.");