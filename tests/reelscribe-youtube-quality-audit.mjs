import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const ui = read("reelscribe/ui.js");
const direct = read("reelscribe/instagram-direct.js");
const sw = read("reelscribe/sw.js");

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

const qualityFunctions = [
  "compactCharacters",
  "meaningfulCharacters",
  "wordTokens",
  "smallestRepeatingUnit",
  "tokenRepetitionMetrics",
  "isHallucinatedText",
].map((name) => extractFunction(ui, name)).join("\n");

const qualityContext = vm.createContext({ String, Array, Map, Set, Math, console });
vm.runInContext(`${qualityFunctions}\nglobalThis.audit = { isHallucinatedText, tokenRepetitionMetrics };`, qualityContext);
const { isHallucinatedText, tokenRepetitionMetrics } = qualityContext.audit;

const repeatedEnglish = "I'm not. I'm. I'm, I'm! " + "I'm ".repeat(14);
assert.equal(isHallucinatedText(repeatedEnglish), true, "Repeated English token hallucination must be rejected");
assert.equal(isHallucinatedText("Thank you for watching. ".repeat(5)), true, "Repeated phrase hallucination must be rejected");
assert.equal(isHallucinatedText("今天我們測試公開影片字幕是否能正確取得，並保留可編輯的時間軸。"), false);
assert.ok(tokenRepetitionMetrics(repeatedEnglish).dominantRatio > 0.7);
assert.match(ui, /localStorage\.removeItem\("reelscribe:last"\)/);
assert.match(ui, /I'm、>>、單一中文字或重複片語/);
assert.match(ui, /QUALITY_BUILD = "2026\.07\.13\.9"/);

const parseYouTubeSource = extractFunction(direct, "parseYouTube");
const youtubeContext = vm.createContext({ URL, String });
vm.runInContext(`${parseYouTubeSource}\nglobalThis.parseYouTube = parseYouTube;`, youtubeContext);
assert.equal(youtubeContext.parseYouTube("https://youtu.be/dQw4w9WgXcQ?si=test").videoId, "dQw4w9WgXcQ");
assert.equal(youtubeContext.parseYouTube("https://www.youtube.com/shorts/dQw4w9WgXcQ").canonicalUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
assert.equal(youtubeContext.parseYouTube("https://example.com/watch?v=dQw4w9WgXcQ"), null);
assert.match(direct, /\/api\/youtube-captions/);
assert.match(direct, /credentials:\s*"omit"/);
assert.match(direct, /referrerPolicy:\s*"no-referrer"/);
assert.match(direct, /ReelScribeYouTubeDirect/);
assert.match(direct, /runUniversalFallback/);
assert.match(direct, /YouTube 自動字幕/);
assert.match(sw, /reelscribe-shell-v15/);
assert.doesNotMatch(sw, /skipWaiting\(|clients\.claim\(/);

console.log("ReelScribe YouTube and transcript-quality audit passed.");
