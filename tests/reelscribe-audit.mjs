import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const html = read("reelscribe/index.html");
const resolver = read("reelscribe/universal-link.js");
const serviceWorker = read("reelscribe/sw.js");
const manifest = JSON.parse(read("reelscribe/manifest.webmanifest"));
const sitemap = read("reelscribe/sitemap.xml");
const robots = read("robots.txt");

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

const ids = parseIds(html);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicateIds, [], "HTML contains duplicate IDs");

for (const id of [
  "ig-url",
  "check-url",
  "fallback-tools",
  "media-file",
  "transcribe",
  "results",
  "full-transcript",
  "copy-text",
  "download-srt",
  "share-site",
]) {
  assert.ok(ids.includes(id), `Missing required element #${id}`);
}

assert.match(html, /<link rel="canonical" href="https:\/\/paq6809\.github\.io\/reelscribe\/"/);
assert.match(html, /property="og:title"/);
assert.match(html, /name="twitter:card"/);
assert.match(html, /type="application\/ld\+json"/);
assert.match(html, /\.\/ui-polish\.css/);
assert.match(html, /\.\/share\.js/);
assert.doesNotMatch(html, /class="notes shell"/);
assert.doesNotMatch(html, /<h2>處理方式<\/h2>/);
assert.ok(html.indexOf('id="copy-text"') < html.indexOf('id="download-txt"'), "Copy must remain the first result action");

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, "Missing JSON-LD");
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd["@type"], "SoftwareApplication");
assert.equal(jsonLd.offers.price, "0");

assert.equal(manifest.share_target.action, "./");
assert.match(sitemap, /https:\/\/paq6809\.github\.io\/reelscribe\//);
assert.match(robots, /Sitemap: https:\/\/paq6809\.github\.io\/reelscribe\/sitemap\.xml/);
assert.match(serviceWorker, /\.\/share\.js/);
assert.match(serviceWorker, /\.\/ui-polish\.css/);

const functionNames = [
  "extractYouTubeId",
  "parseSourceUrl",
  "parseSubtitleText",
  "parseVtt",
  "parseSrt",
  "parseClock",
  "finalizeSegments",
  "cleanText",
  "joinSegments",
];

const documentStub = {
  createElement() {
    return {
      _html: "",
      set innerHTML(value) {
        this._html = String(value);
      },
      get value() {
        return this._html
          .replace(/<br\s*\/?\s*>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
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
assert.equal(youtube.canonicalUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

const directSubtitle = parseSourceUrl("https://example.com/subtitles/demo.vtt?lang=zh");
assert.equal(directSubtitle.kind, "subtitle");
assert.equal(directSubtitle.extension, "vtt");

const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.500\n第一段字幕\n\n00:00:02.500 --> 00:00:05.000\n第二段字幕`;
const parsedVtt = parseSubtitleText(vtt, "vtt");
assert.equal(parsedVtt.segments.length, 2);
assert.equal(parsedVtt.text, "第一段字幕 第二段字幕");
assert.equal(parsedVtt.duration, 5);

const srt = `1\n00:00:00,000 --> 00:00:01,500\nHello\n\n2\n00:00:01,500 --> 00:00:03,000\nWorld`;
const parsedSrt = parseSubtitleText(srt, "srt");
assert.equal(parsedSrt.segments.length, 2);
assert.equal(parsedSrt.text, "Hello World");
assert.equal(parseClock("01:02:03.500"), 3723.5);

console.log("ReelScribe audit passed: HTML, SEO, PWA, sharing, URL normalization, VTT and SRT parsing.");
