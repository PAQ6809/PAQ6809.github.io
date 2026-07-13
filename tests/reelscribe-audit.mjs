import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const html = read("reelscribe/index.html");
const supportHtml = read("reelscribe/supported-platforms.html");
const app = read("reelscribe/app.js");
const resolver = read("reelscribe/universal-link.js");
const instagramDirect = read("reelscribe/instagram-direct.js");
const worker = read("reelscribe/worker.js");
const enhancer = read("reelscribe/speech-enhancer.js");
const runtime = read("reelscribe/runtime-optimizer.js");
const ocr = read("reelscribe/screen-ocr.js");
const ui = read("reelscribe/ui.js");
const formatCompat = read("reelscribe/format-compat.js");
const serviceWorker = read("reelscribe/sw.js");
const styles = read("reelscribe/styles.css");
const uiPolish = read("reelscribe/ui-polish.css");
const runtimeCss = read("reelscribe/runtime.css");
const manifest = JSON.parse(read("reelscribe/manifest.webmanifest"));
const sitemap = read("reelscribe/sitemap.xml");
const robots = read("robots.txt");
const codeowners = read(".github/CODEOWNERS");
const dependabot = read(".github/dependabot.yml");
const securityPolicy = read("SECURITY.md");

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

function parseIds(source) {
  return [...source.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
}

for (const [path, source] of [
  ["reelscribe/index.html", html],
  ["reelscribe/supported-platforms.html", supportHtml],
]) {
  const ids = parseIds(source);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], `${path} contains duplicate IDs`);
}

const ids = parseIds(html);
for (const id of [
  "ig-url", "check-url", "fallback-tools", "media-file", "model-select",
  "language-select", "suppress-music", "prefer-gpu", "transcribe", "results",
  "full-transcript", "copy-text", "download-srt", "share-site",
  "model-cache-status", "prepare-model", "clear-model-cache",
  "screen-ocr-tools", "start-screen-ocr", "ocr-interval", "ocr-crop", "ocr-merge",
]) {
  assert.ok(ids.includes(id), `Missing required element #${id}`);
}

assert.match(html, /<link rel="canonical" href="https:\/\/paq6809\.github\.io\/reelscribe\/"/);
assert.match(html, /property="og:title"/);
assert.match(html, /name="twitter:card"/);
assert.match(html, /type="application\/ld\+json"/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /name="referrer" content="no-referrer"/);
assert.match(html, /\.\/runtime\.css/);
assert.match(html, /\.\/runtime-optimizer\.js/);
assert.match(html, /\.\/screen-ocr\.js/);
assert.match(html, /id="suppress-music"[^>]*checked/);
assert.ok(html.indexOf('./speech-enhancer.js') < html.indexOf('./app.js'), "Speech enhancer must load before app.js");
assert.ok(html.indexOf('./app.js') < html.indexOf('./runtime-optimizer.js'), "Runtime optimizer must load after app.js");
assert.ok(html.indexOf('./runtime-optimizer.js') < html.indexOf('./screen-ocr.js'), "Storage policy must load before OCR");
assert.ok(html.indexOf('./instagram-direct.js') < html.indexOf('./universal-link.js'), "Instagram direct resolver must run first");
assert.ok(html.indexOf('id="copy-text"') < html.indexOf('id="download-txt"'), "Copy remains the first result action");
assert.doesNotMatch(html, /class="notes shell"/);

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, "Missing JSON-LD");
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd["@type"], "SoftwareApplication");
assert.equal(jsonLd.offers.price, "0");
assert.ok(jsonLd.featureList.some((item) => item.includes("背景音樂")));
assert.ok(jsonLd.featureList.some((item) => item.includes("OCR")));
assert.ok(jsonLd.featureList.some((item) => item.includes("背景模型")));

assert.equal(manifest.share_target.action, "./");
assert.match(sitemap, /https:\/\/paq6809\.github\.io\/reelscribe\//);
assert.match(robots, /Sitemap: https:\/\/paq6809\.github\.io\/reelscribe\/sitemap\.xml/);
assert.match(serviceWorker, /reelscribe-shell-v13/);
assert.match(serviceWorker, /\.\/runtime\.css/);
assert.match(serviceWorker, /\.\/runtime-optimizer\.js/);
assert.match(serviceWorker, /\.\/screen-ocr\.js/);
assert.match(serviceWorker, /\.\/speech-enhancer\.js/);
assert.match(serviceWorker, /async function networkFirst/);
assert.match(serviceWorker, /cache:\s*"no-store"/);
assert.doesNotMatch(serviceWorker, /skipWaiting\s*\(/);
assert.doesNotMatch(serviceWorker, /clients\.claim\s*\(/);

assert.match(app, /const APP_BUILD = "2026\.07\.13\.7"/);
assert.match(app, /function prepareModel/);
assert.match(app, /function setStoragePolicy/);
assert.match(app, /function mergeExternalSegments/);
assert.match(app, /storagePolicy/);
assert.match(app, /cacheAllowed/);
assert.match(app, /backgroundPreparing/);
assert.match(app, /registration\.waiting/);
assert.match(app, /updateViaCache:\s*"none"/);
assert.doesNotMatch(app, /controllerchange/);
assert.doesNotMatch(app, /window\.location\.reload\s*\(/);
assert.match(app, /window\.ReelScribeApp = Object\.freeze/);

assert.match(runtime, /navigator\.storage\.estimate/);
assert.match(runtime, /navigator\.storage\.persist/);
assert.match(runtime, /requestIdleCallback/);
assert.match(runtime, /saveData/);
assert.match(runtime, /MOBILE_PREFETCH_MIN/);
assert.match(runtime, /DESKTOP_PREFETCH_MIN/);
assert.match(runtime, /onnx-community\/whisper-tiny/);
assert.match(runtime, /onnx-community\/whisper-base/);
assert.match(runtime, /clearModelCaches/);
assert.match(runtime, /indexedDB\.databases/);
assert.doesNotMatch(runtime, /window\.location\.reload\s*\(/);

assert.match(ocr, /TESSERACT_VERSION = "7\.0\.0"/);
assert.match(ocr, /Tesseract\.createWorker/);
assert.match(ocr, /cacheMethod/);
assert.match(ocr, /MAX_MOBILE_FRAMES = 60/);
assert.match(ocr, /MAX_DESKTOP_FRAMES = 120/);
assert.match(ocr, /captureFrame/);
assert.match(ocr, /cropFraction/);
assert.match(ocr, /worker\.recognize/);
assert.match(ocr, /worker\.terminate/);
assert.match(ocr, /mergeExternalSegments/);
assert.match(ocr, /chi_tra/);
assert.match(ocr, /confidence < 42/);
assert.doesNotMatch(ocr, /fetch\([^)]*upload|FormData|document\.cookie/i);

assert.match(enhancer, /const VAD_VERSION = "0\.0\.30"/);
assert.match(enhancer, /NonRealTimeVAD/);
assert.match(enhancer, /model:\s*"v5"/);
assert.match(enhancer, /extractSpeechChannel/);
assert.match(enhancer, /applySpeechBand/);
assert.match(enhancer, /buildFrameMask/);
assert.match(enhancer, /mask\.fill\(0\.025\)/);
assert.match(enhancer, /reason:\s*"no-speech-regions"/);
assert.doesNotMatch(enhancer, /document\.cookie|password|localStorage/i);

assert.match(worker, /const FLAGSHIP_MODEL = "onnx-community\/whisper-large-v3-turbo"/);
assert.match(worker, /const ACCURATE_MODEL = "onnx-community\/whisper-small"/);
assert.match(worker, /encoder_model:\s*"q4f16"/);
assert.match(worker, /decoder_model_merged:\s*"q4f16"/);
assert.match(worker, /type === "prepare"/);
assert.match(worker, /disposeTranscriber/);
assert.match(worker, /smallestRepeatingUnit/);
assert.match(worker, /meaningfulLength === 0/);
assert.match(worker, /repetition_penalty:\s*1\.2/);
assert.match(worker, /no_repeat_ngram_size:\s*3/);
assert.match(worker, /enhancementMeta/);

assert.match(ui, /const QUALITY_BUILD = "2026\.07\.13\.7"/);
assert.match(ui, /onnx-community\/whisper-large-v3-turbo/);
assert.match(ui, /此裝置不建議/);
assert.match(ui, /smallestRepeatingUnit/);
assert.match(ui, /重複符號或文字/);
assert.match(ui, /ReelScribeQualityGuard/);
assert.doesNotMatch(ui, /controllerchange/);
assert.doesNotMatch(ui, /window\.location\.reload\s*\(/);
assert.match(runtimeCss, /\.progress-panel\s*\{[\s\S]*min-height/);
assert.match(runtimeCss, /html\.model-loading/);
assert.match(runtimeCss, /\.ocr-tools/);
assert.match(uiPolish, /\.topbar\s*\{\s*position:\s*relative/);
assert.match(uiPolish, /overflow-wrap:\s*anywhere/);
assert.match(styles, /prefers-reduced-motion/);

for (const extension of ["mkv", "avi", "flac", "opus", "m2ts", "amr", "caf"]) {
  assert.match(formatCompat, new RegExp(`\\b${extension}:`), `Missing format mapping: ${extension}`);
}
assert.match(formatCompat, /ReelScribeFormatSupport/);
assert.match(supportHtml, /Instagram／Reels/);
assert.match(supportHtml, /長影片處理方式/);
assert.match(codeowners, /\/reelscribe\/ @PAQ6809/);
assert.match(dependabot, /package-ecosystem: "github-actions"/);
assert.match(securityPolicy, /Force pushes/);
assert.match(instagramDirect, /\/api\/instagram-resolve/);
assert.match(instagramDirect, /\/api\/instagram-yt/);
assert.match(instagramDirect, /credentials:\s*"omit"/);
assert.doesNotMatch(instagramDirect, /document\.cookie|cookiesfrombrowser|password/i);

const instagramContext = vm.createContext({ URL, console });
vm.runInContext(`${extractFunction(instagramDirect, "parseInstagram")}\nglobalThis.parseInstagram = parseInstagram;`, instagramContext);
const parsedInstagram = instagramContext.parseInstagram("https://www.instagram.com/reels/DITBVk3z6pJ/?igsh=abc");
assert.equal(parsedInstagram.shortcode, "DITBVk3z6pJ");
assert.equal(parsedInstagram.canonicalUrl, "https://www.instagram.com/reel/DITBVk3z6pJ/");

const resolverNames = [
  "extractYouTubeId", "parseSourceUrl", "parseSubtitleText", "parseVtt", "parseSrt",
  "parseClock", "finalizeSegments", "cleanText", "joinSegments",
];
const documentStub = {
  createElement() {
    return {
      _html: "",
      set innerHTML(value) { this._html = String(value); },
      get value() {
        return this._html.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      },
    };
  },
};
const resolverContext = vm.createContext({ URL, document: documentStub, console });
vm.runInContext(`${resolverNames.map((name) => extractFunction(resolver, name)).join("\n")}\nglobalThis.api={parseSourceUrl,parseSubtitleText,parseClock};`, resolverContext);
const { parseSourceUrl, parseSubtitleText, parseClock } = resolverContext.api;
assert.equal(parseSourceUrl("https://youtu.be/dQw4w9WgXcQ?si=test").videoId, "dQw4w9WgXcQ");
assert.equal(parseSourceUrl("https://www.instagram.com/reel/ABC_123/").platform, "instagram");
assert.equal(parseSourceUrl("https://example.com/demo.vtt").kind, "subtitle");
const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.500\n第一段字幕\n\n00:00:02.500 --> 00:00:05.000\n第二段字幕`;
assert.equal(parseSubtitleText(vtt, "vtt").text, "第一段字幕 第二段字幕");
assert.equal(parseClock("01:02:03.500"), 3723.5);

const workerNames = [
  "deviceProfile", "selectModel", "modelFallbacks", "dtypeKey", "loadPlans",
  "isMostlySilent", "normalizeText", "compactCharacters", "meaningfulCharacters",
  "longestCharacterRun", "smallestRepeatingUnit", "textRepetitionMetrics",
  "isHallucinatedText", "overlapLength", "mergeSegments",
];
const workerContext = vm.createContext({
  console, Float32Array, Map, Set, Array, String, Math,
  self: {
    navigator: {
      gpu: {}, deviceMemory: 16, hardwareConcurrency: 16,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140",
      connection: { saveData: false, effectiveType: "4g" },
    },
  },
});
vm.runInContext(`
const FAST_MODEL="onnx-community/whisper-tiny";
const BALANCED_MODEL="onnx-community/whisper-base";
const ACCURATE_MODEL="onnx-community/whisper-small";
const FLAGSHIP_MODEL="onnx-community/whisper-large-v3-turbo";
const WEBGPU_MIXED_DTYPE={encoder_model:"fp16",decoder_model_merged:"q4f16"};
const TURBO_WEBGPU_DTYPE={encoder_model:"q4f16",decoder_model_merged:"q4f16"};
${workerNames.map((name) => extractFunction(worker, name)).join("\n")}
globalThis.api={selectModel,modelFallbacks,loadPlans,isMostlySilent,isHallucinatedText,textRepetitionMetrics,mergeSegments};
`, workerContext);
const workerApi = workerContext.api;
assert.equal(workerApi.selectModel("smart", 3 * 60, true), "onnx-community/whisper-large-v3-turbo");
assert.deepEqual(Array.from(workerApi.modelFallbacks("onnx-community/whisper-large-v3-turbo")), [
  "onnx-community/whisper-large-v3-turbo", "onnx-community/whisper-small",
  "onnx-community/whisper-base", "onnx-community/whisper-tiny",
]);
assert.equal(workerApi.loadPlans("onnx-community/whisper-large-v3-turbo", true)[0].dtype.encoder_model, "q4f16");
vm.runInContext('self.navigator.userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) Mobile"; self.navigator.deviceMemory=0;', workerContext);
assert.equal(workerApi.selectModel("smart", 3 * 60, true), "onnx-community/whisper-base");
assert.equal(workerApi.selectModel("smart", 60 * 60, true), "onnx-community/whisper-tiny");
assert.equal(workerApi.isHallucinatedText(">> ".repeat(100)), true);
assert.equal(workerApi.isHallucinatedText("居".repeat(100)), true);
assert.equal(workerApi.isHallucinatedText("今天我們介紹一個能快速整理影片字幕的免費工具。"), false);
assert.ok(workerApi.textRepetitionMetrics(">> ".repeat(50)).symbolRatio > 0.9);
assert.equal(workerApi.isMostlySilent(new Float32Array(16000)), true);

const enhancerNames = ["clamp", "biquadCoefficients", "applyBiquad", "applySpeechBand", "mergeRegions", "buildFrameMask", "applyFrameMask"];
const enhancerContext = vm.createContext({ console, Float32Array, Math });
vm.runInContext(`${enhancerNames.map((name) => extractFunction(enhancer, name)).join("\n")}\nglobalThis.api={applySpeechBand,mergeRegions,buildFrameMask,applyFrameMask};`, enhancerContext);
const enhancedAudio = new Float32Array(16000); enhancedAudio.fill(0.05);
enhancerContext.api.applySpeechBand(enhancedAudio, 16000);
assert.ok(enhancedAudio.every(Number.isFinite));
const regions = enhancerContext.api.mergeRegions([{ start: 1, end: 2 }, { start: 2.1, end: 3 }], 5);
assert.equal(regions.length, 1);
const mask = enhancerContext.api.buildFrameMask(16000 * 5, 16000, regions);
assert.ok(mask.mask.some((value) => value === 1));
assert.ok(mask.mask.some((value) => value < 0.1));

const ocrContext = vm.createContext({ console, Set, Array, String, Math, window: { ReelScribeQualityGuard: { isHallucinatedText: () => false } } });
vm.runInContext(`${extractFunction(ocr, "normalizeText")}\n${extractFunction(ocr, "compact")}\n${extractFunction(ocr, "similarity")}\nglobalThis.api={normalizeText,compact,similarity};`, ocrContext);
assert.equal(ocrContext.api.normalizeText("  第一行\n第二行  "), "第一行 第二行");
assert.ok(ocrContext.api.similarity("今天下雨", "今天下雨。") > 0.9);
assert.ok(ocrContext.api.similarity("今天下雨", "明天晴天") < 0.8);

const allClientSource = [app, runtime, ocr, enhancer, ui, resolver, instagramDirect].join("\n");
assert.doesNotMatch(allClientSource, /document\.cookie/);
assert.doesNotMatch(allClientSource, /new Function\s*\(/);
assert.doesNotMatch(allClientSource, /(^|[^\w])eval\s*\(/m);

console.log("ReelScribe audit passed: storage-aware preload, no forced refresh, stable loading layout, local OCR, Silero VAD, adaptive Whisper, hallucination guard, Instagram fallback, PWA, SEO, formats, VTT and SRT.");