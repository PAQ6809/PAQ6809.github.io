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
const ui = read("reelscribe/ui.js");
const formatCompat = read("reelscribe/format-compat.js");
const serviceWorker = read("reelscribe/sw.js");
const uiPolish = read("reelscribe/ui-polish.css");
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
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicateIds, [], `${path} contains duplicate IDs`);
}

const ids = parseIds(html);
for (const id of [
  "ig-url", "check-url", "fallback-tools", "media-file", "model-select",
  "transcribe", "results", "full-transcript", "copy-text", "download-srt", "share-site",
]) {
  assert.ok(ids.includes(id), `Missing required element #${id}`);
}

assert.match(html, /<link rel="canonical" href="https:\/\/paq6809\.github\.io\/reelscribe\/"/);
assert.match(html, /property="og:title"/);
assert.match(html, /name="twitter:card"/);
assert.match(html, /type="application\/ld\+json"/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /name="referrer" content="no-referrer"/);
assert.match(html, /\.\/ui-polish\.css/);
assert.match(html, /\.\/format-compat\.js/);
assert.match(html, /\.\/instagram-direct\.js/);
assert.match(html, /\.\/share\.js/);
assert.match(html, /value="smart" selected/);
assert.match(html, /supported-platforms\.html/);
assert.doesNotMatch(html, /class="notes shell"/);
assert.ok(html.indexOf('./instagram-direct.js') < html.indexOf('./universal-link.js'), "Instagram direct resolver must run before the generic resolver");
assert.ok(html.indexOf('id="copy-text"') < html.indexOf('id="download-txt"'), "Copy must remain the first result action");

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, "Missing JSON-LD");
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd["@type"], "SoftwareApplication");
assert.equal(jsonLd.offers.price, "0");
assert.ok(jsonLd.featureList.some((item) => item.includes("Instagram")));
assert.ok(jsonLd.featureList.some((item) => item.includes("長影片")));

assert.equal(manifest.share_target.action, "./");
assert.match(sitemap, /https:\/\/paq6809\.github\.io\/reelscribe\//);
assert.match(sitemap, /supported-platforms\.html/);
assert.match(robots, /Sitemap: https:\/\/paq6809\.github\.io\/reelscribe\/sitemap\.xml/);
assert.match(serviceWorker, /\.\/instagram-direct\.js/);
assert.match(serviceWorker, /\.\/format-compat\.js/);
assert.match(serviceWorker, /\.\/supported-platforms\.html/);
assert.match(serviceWorker, /\.\/share\.js/);
assert.match(serviceWorker, /reelscribe-shell-v10/);
assert.match(serviceWorker, /async function networkFirst/);
assert.match(serviceWorker, /cache:\s*"no-store"/);
assert.match(serviceWorker, /event\.request\.mode === "navigate"/);

assert.match(app, /const APP_BUILD = "2026\.07\.13\.3"/);
assert.match(app, /window\.ReelScribeApp = Object\.freeze/);
assert.match(app, /updateViaCache:\s*"none"/);
assert.match(app, /controllerchange/);
assert.match(app, /sessionStorage\.getItem/);
assert.match(instagramDirect, /window\.ReelScribeApp/);
assert.match(instagramDirect, /app\.setFile\(file\)/);
assert.match(instagramDirect, /app\.startTranscription/);
assert.match(ui, /const QUALITY_BUILD = "2026\.07\.13\.4"/);
assert.match(ui, /ReelScribeQualityGuard/);
assert.match(ui, /clearBadSavedResult/);
assert.match(ui, /suppressHallucinatedResult/);
assert.match(uiPolish, /\.topbar\s*\{\s*position:\s*relative/);
assert.match(uiPolish, /\.provider-log[\s\S]*flex-wrap:\s*wrap/);
assert.match(uiPolish, /overflow-wrap:\s*anywhere/);

for (const extension of ["mkv", "avi", "flac", "opus", "m2ts", "amr", "caf"]) {
  assert.match(formatCompat, new RegExp(`\\b${extension}:`), `Missing format mapping: ${extension}`);
}
assert.match(formatCompat, /ReelScribeFormatSupport/);
assert.match(supportHtml, /Instagram／Reels/);
assert.match(supportHtml, /TikTok/);
assert.match(supportHtml, /MKV/);
assert.match(supportHtml, /長影片處理方式/);

assert.match(codeowners, /\/reelscribe\/ @PAQ6809/);
assert.match(codeowners, /\/\.github\/workflows\/ @PAQ6809/);
assert.match(dependabot, /package-ecosystem: "github-actions"/);
assert.match(securityPolicy, /Force pushes/);
assert.match(securityPolicy, /private vulnerability reporting/i);

assert.match(instagramDirect, /https:\/\/vite-xi-one-59\.vercel\.app/);
assert.match(instagramDirect, /\/api\/instagram-resolve/);
assert.match(instagramDirect, /\/api\/instagram-yt/);
assert.match(instagramDirect, /credentials:\s*"omit"/);
assert.match(instagramDirect, /referrerPolicy:\s*"no-referrer"/);
assert.match(instagramDirect, /MAX_MEDIA_BYTES/);
assert.doesNotMatch(instagramDirect, /document\.cookie|cookiesfrombrowser|password/i);

const instagramContext = vm.createContext({ URL, console });
vm.runInContext(`${extractFunction(instagramDirect, "parseInstagram")}\nglobalThis.parseInstagram = parseInstagram;`, instagramContext);
const parsedInstagram = instagramContext.parseInstagram("https://www.instagram.com/reels/DITBVk3z6pJ/?igsh=abc");
assert.equal(parsedInstagram.shortcode, "DITBVk3z6pJ");
assert.equal(parsedInstagram.canonicalUrl, "https://www.instagram.com/reel/DITBVk3z6pJ/");
assert.equal(instagramContext.parseInstagram("https://example.com/reel/DITBVk3z6pJ/"), null);

const functionNames = [
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
const context = vm.createContext({ URL, document: documentStub, console });
const extracted = functionNames.map((name) => extractFunction(resolver, name)).join("\n");
vm.runInContext(`${extracted}\nglobalThis.auditApi = { parseSourceUrl, parseSubtitleText, parseClock };`, context);
const { parseSourceUrl, parseSubtitleText, parseClock } = context.auditApi;

const youtube = parseSourceUrl("https://youtu.be/dQw4w9WgXcQ?si=test&utm_source=share");
assert.equal(youtube.platform, "youtube");
assert.equal(youtube.videoId, "dQw4w9WgXcQ");
const instagram = parseSourceUrl("https://www.instagram.com/reel/ABC_123/?igshid=test");
assert.equal(instagram.platform, "instagram");
const genericPublicVideoPage = parseSourceUrl("https://www.snapchat.com/spotlight/example");
assert.equal(genericPublicVideoPage.platform, "generic");
const directSubtitle = parseSourceUrl("https://example.com/subtitles/demo.vtt?lang=zh");
assert.equal(directSubtitle.kind, "subtitle");

const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.500\n第一段字幕\n\n00:00:02.500 --> 00:00:05.000\n第二段字幕`;
const parsedVtt = parseSubtitleText(vtt, "vtt");
assert.equal(parsedVtt.segments.length, 2);
assert.equal(parsedVtt.text, "第一段字幕 第二段字幕");
assert.equal(parsedVtt.duration, 5);
const srt = `1\n00:00:00,000 --> 00:00:01,500\nHello\n\n2\n00:00:01,500 --> 00:00:03,000\nWorld`;
const parsedSrt = parseSubtitleText(srt, "srt");
assert.equal(parsedSrt.text, "Hello World");
assert.equal(parseClock("01:02:03.500"), 3723.5);

assert.match(worker, /repetition_penalty:\s*1\.18/);
assert.match(worker, /no_repeat_ngram_size:\s*3/);
assert.match(worker, /max_new_tokens/);
assert.match(worker, /transcribeWithHallucinationGuard/);

const workerFunctionNames = [
  "selectModel", "isMostlySilent", "normalizeText", "meaningfulCharacters",
  "longestCharacterRun", "textRepetitionMetrics", "isHallucinatedText",
  "overlapLength", "mergeSegments",
];
const workerExtracted = workerFunctionNames.map((name) => extractFunction(worker, name)).join("\n");
const workerContext = vm.createContext({ console, Float32Array, Map, Set, Array, String, Math, self: { navigator: { gpu: {}, deviceMemory: 8 } } });
vm.runInContext(`
const FAST_MODEL = "onnx-community/whisper-tiny";
const QUALITY_MODEL = "onnx-community/whisper-base";
${workerExtracted}
globalThis.workerAudit = { selectModel, isMostlySilent, mergeSegments, isHallucinatedText, textRepetitionMetrics };
`, workerContext);
const { selectModel, isMostlySilent, mergeSegments, isHallucinatedText, textRepetitionMetrics } = workerContext.workerAudit;
assert.equal(selectModel("smart", 5 * 60, true), "onnx-community/whisper-base");
assert.equal(selectModel("smart", 60 * 60, true), "onnx-community/whisper-tiny");
assert.equal(isMostlySilent(new Float32Array(16000)), true);
const voiced = new Float32Array(16000); voiced.fill(0.08);
assert.equal(isMostlySilent(voiced), false);
const merged = [{ start: 0, end: 4, text: "Hello world" }];
mergeSegments(merged, [{ start: 3, end: 7, text: "world again" }]);
assert.equal(merged.length, 2);
assert.match(merged[1].text, /again/);
assert.equal(isHallucinatedText("居".repeat(120)), true);
assert.equal(isHallucinatedText("今天我們要介紹一個能快速整理影片字幕的免費工具。"), false);
assert.ok(textRepetitionMetrics("居".repeat(80)).dominantRatio > 0.95);

console.log("ReelScribe audit passed: anti-hallucination retry and rejection, fresh PWA cache, iPhone Instagram handoff, Instagram fallback, HTML, SEO, CSP, formats, long-video mode, URL normalization, VTT and SRT parsing.");