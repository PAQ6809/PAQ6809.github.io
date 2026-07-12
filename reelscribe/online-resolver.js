const ui = {
  input: document.querySelector("#ig-url"),
  paste: document.querySelector("#paste-url"),
  resolve: document.querySelector("#check-url"),
  status: document.querySelector("#url-status"),
  actions: document.querySelector("#verified-link-actions"),
  openSource: document.querySelector("#open-instagram"),
  focusUpload: document.querySelector("#focus-upload"),
  linkCard: document.querySelector(".link-card"),
  fileInput: document.querySelector("#media-file"),
  language: document.querySelector("#language-select"),
  results: document.querySelector("#results"),
  stats: document.querySelector("#result-stats"),
  transcript: document.querySelector("#full-transcript"),
  segments: document.querySelector("#segments"),
  segmentCount: document.querySelector("#segment-count"),
  copy: document.querySelector("#copy-text"),
  txt: document.querySelector("#download-txt"),
  srt: document.querySelector("#download-srt"),
  vtt: document.querySelector("#download-vtt"),
  rebuild: document.querySelector("#rebuild-text"),
};

const FALLBACK_PROVIDERS = {
  piped: [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://api.piped.yt",
    "https://pipedapi.reallyaweso.me",
    "https://api.piped.private.coffee",
    "https://piped-api.privacy.com.de"
  ],
  invidious: [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://yt.chocolatemoo53.com",
    "https://invidious.tiekoetter.com"
  ],
  reader: {
    enabled: true,
    baseUrl: "https://r.jina.ai/",
    timeoutMs: 12000,
    cacheToleranceSeconds: 3600
  }
};

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "igsh", "igshid", "mibextid", "si", "share_id", "ref"
]);
const REQUEST_TIMEOUT_MS = 7500;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 120000;

let providersPromise = null;
let activeController = null;
let onlineResult = null;
let statusPanel = null;
let resultMeta = null;

function init() {
  if (!ui.input || !ui.resolve || !ui.linkCard) return;

  const title = ui.linkCard.querySelector("h2");
  const description = ui.linkCard.querySelector(".muted");
  const badge = ui.linkCard.querySelector(".optional");
  if (title) title.textContent = "貼上影片或短影片連結";
  if (description) description.textContent = "系統會先搜尋平台公開字幕、時間軸或逐字稿，不下載原始影片。找不到公開字幕時，再提供本機 AI 備援。";
  if (badge) {
    badge.textContent = "主要方式";
    badge.className = "required";
  }

  ui.input.placeholder = "YouTube、Instagram、TikTok、Facebook、X、Threads、Vimeo、VTT 或 SRT";
  ui.resolve.textContent = "立即解析";
  ui.openSource.textContent = "開啟原始頁面";
  ui.focusUpload.textContent = "改用本機辨識";

  const strip = document.createElement("div");
  strip.className = "platform-strip";
  strip.setAttribute("aria-label", "支援來源");
  strip.innerHTML = ["YouTube", "Shorts", "Instagram", "TikTok", "Facebook", "X", "Threads", "Vimeo", "VTT / SRT"]
    .map((item) => `<span class="platform-chip">${item}</span>`)
    .join("");
  description?.after(strip);

  statusPanel = document.createElement("div");
  statusPanel.className = "online-status-card";
  statusPanel.hidden = true;
  statusPanel.innerHTML = `
    <div class="online-status-head">
      <div class="online-status-copy">
        <strong data-online-title>準備解析</strong>
        <span data-online-detail></span>
      </div>
      <button class="online-cancel" type="button" data-online-cancel hidden>取消</button>
    </div>
    <div class="online-progress-track" aria-hidden="true"><div class="online-progress-bar" data-online-progress></div></div>
    <div class="online-privacy-note" data-online-note></div>
    <div class="online-provider-details" data-online-providers></div>
    <div class="online-fallback-grid" data-online-fallback hidden>
      <button class="button secondary" type="button" data-upload-fallback>選擇影片檔</button>
      <button class="button ghost" type="button" data-tab-fallback>錄製桌機分頁</button>
      <button class="button ghost" type="button" data-mic-fallback>麥克風錄音</button>
    </div>`;
  ui.linkCard.appendChild(statusPanel);

  resultMeta = document.createElement("div");
  resultMeta.className = "online-result-meta";
  resultMeta.hidden = true;
  resultMeta.innerHTML = `
    <div class="online-result-badges">
      <span class="source-badge" data-online-source></span>
      <span class="confidence-badge" data-online-confidence></span>
    </div>
    <span class="muted small" data-online-provider></span>`;
  const resultHeading = ui.results?.querySelector(".results-heading");
  resultHeading?.after(resultMeta);

  const disclaimer = document.createElement("p");
  disclaimer.className = "online-disclaimer";
  disclaimer.hidden = true;
  disclaimer.setAttribute("data-online-disclaimer", "");
  resultMeta?.after(disclaimer);

  ui.resolve.addEventListener("click", interceptResolve, true);
  ui.paste?.addEventListener("click", interceptPaste, true);
  ui.input.addEventListener("keydown", interceptEnter, true);
  statusPanel.querySelector("[data-online-cancel]")?.addEventListener("click", cancelActive);
  statusPanel.querySelector("[data-upload-fallback]")?.addEventListener("click", () => ui.fileInput?.click());
  statusPanel.querySelector("[data-tab-fallback]")?.addEventListener("click", () => document.querySelector("#capture-tab-audio")?.click());
  statusPanel.querySelector("[data-mic-fallback]")?.addEventListener("click", () => document.querySelector("#capture-microphone")?.click());

  [ui.copy, ui.txt, ui.srt, ui.vtt, ui.rebuild].forEach((element) => {
    element?.addEventListener("click", interceptResultAction, true);
  });

  const sharedUrl = new URL(location.href).searchParams.get("url") || new URL(location.href).searchParams.get("text");
  if (sharedUrl && /^https?:\/\//i.test(sharedUrl.trim())) {
    ui.input.value = sharedUrl.trim();
    setTimeout(() => resolveCurrent(), 300);
  }
}

function interceptResolve(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  resolveCurrent();
}

async function interceptPaste(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    ui.input.value = await navigator.clipboard.readText();
    resolveCurrent();
  } catch {
    ui.input.focus();
    setInlineStatus("瀏覽器無法自動讀取剪貼簿，請長按貼上後按「立即解析」。", "error");
  }
}

function interceptEnter(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolveCurrent();
}

function interceptResultAction(event) {
  if (!onlineResult) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const target = event.currentTarget;
  if (target === ui.copy) copyOnlineText();
  if (target === ui.txt) downloadOnline("txt");
  if (target === ui.srt) downloadOnline("srt");
  if (target === ui.vtt) downloadOnline("vtt");
  if (target === ui.rebuild) {
    onlineResult.text = onlineResult.segments.map((segment) => segment.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    ui.transcript.value = onlineResult.text;
    cacheResult(onlineResult.url, onlineResult);
  }
}

function cancelActive() {
  activeController?.abort();
  activeController = null;
  setResolveStatus("已取消", "沒有傳送任何帳號、Cookie 或密碼。", 0, "");
}

async function resolveCurrent() {
  let normalized;
  try {
    normalized = normalizePublicUrl(ui.input.value);
  } catch (error) {
    setInlineStatus(error.message || "請輸入有效的公開網址。", "error");
    return;
  }

  ui.input.value = normalized;
  ui.openSource.href = normalized;
  ui.actions.hidden = false;
  onlineResult = null;
  resultMeta.hidden = true;
  document.querySelector("[data-online-disclaimer]").hidden = true;

  const cached = getCachedResult(normalized);
  if (cached) {
    showOnlineResult({ ...cached, url: normalized, provider: `${cached.provider || "公開來源"} · 本機快取` });
    setInlineStatus("已從這台裝置的快取取得字幕。", "ok");
    return;
  }

  activeController?.abort();
  activeController = new AbortController();
  ui.linkCard.classList.add("is-resolving");
  setInlineStatus("正在尋找最快的公開字幕來源…", "ok");
  setResolveStatus("辨識平台", "先找現成字幕，找不到才進入備援。", 8, "不會要求社群帳號、密碼或登入 Cookie。", true);

  try {
    const platform = detectPlatform(normalized);
    setResolveStatus(`正在解析 ${platform.label}`, "平行查詢可用的公開字幕來源。", 18, "只傳送公開影片網址；不儲存原始影片。", true);
    const result = await resolveUrl(normalized, platform, activeController.signal);
    if (!result?.text?.trim()) throw new Error("目前沒有找到可公開讀取的字幕或逐字稿。 ");
    result.url = normalized;
    result.platform = result.platform || platform.label;
    cacheResult(normalized, result);
    showOnlineResult(result);
    setInlineStatus("字幕解析完成，可以直接複製或下載。", "ok");
    setResolveStatus("字幕完成", `已取得 ${result.segments.length} 段文字。`, 100, "來源與可信度會顯示在字幕上方。", false);
  } catch (error) {
    if (error?.name === "AbortError") return;
    const message = error?.message || "目前無法從公開來源取得字幕。";
    setInlineStatus(message, "error");
    setResolveStatus("公開字幕暫時不可用", message, 0, "可直接改用本機辨識；影片仍不會上傳到我們的伺服器。", false, true);
  } finally {
    activeController = null;
    ui.linkCard.classList.remove("is-resolving");
  }
}

function normalizePublicUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("請先貼上影片或字幕連結。 ");
  if (value.length > 2048) throw new Error("網址過長，請重新複製原始分享連結。 ");
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("只接受 HTTPS 或 HTTP 公開網址。 ");
  if (url.username || url.password) throw new Error("網址不可包含帳號或密碼。 ");
  if (isPrivateHost(url.hostname)) throw new Error("為了安全，不能解析內網或本機網址。 ");
  [...url.searchParams.keys()].forEach((key) => {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  });
  url.hash = "";
  return url.toString();
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  return false;
}

function detectPlatform(urlString) {
  const url = new URL(urlString);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname;
  if (/youtu\.be$|youtube\.com$|youtube-nocookie\.com$/.test(host)) return { key: "youtube", label: "YouTube", id: youtubeId(url) };
  if (host.endsWith("instagram.com")) return { key: "instagram", label: "Instagram" };
  if (host.endsWith("tiktok.com")) return { key: "tiktok", label: "TikTok" };
  if (host.endsWith("facebook.com") || host === "fb.watch") return { key: "facebook", label: "Facebook" };
  if (host === "x.com" || host.endsWith("twitter.com")) return { key: "x", label: "X" };
  if (host.endsWith("threads.net")) return { key: "threads", label: "Threads" };
  if (host.endsWith("vimeo.com")) return { key: "vimeo", label: "Vimeo" };
  if (/\.(vtt|srt|ttml|dfxp|xml|json)$/i.test(path)) return { key: "subtitle", label: "字幕檔" };
  return { key: "generic", label: "公開網頁" };
}

function youtubeId(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  if (url.searchParams.get("v")) return url.searchParams.get("v");
  const match = url.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
  return match?.[2] || "";
}

async function resolveUrl(url, platform, signal) {
  if (platform.key === "subtitle") return resolveDirectSubtitle(url, signal);
  if (platform.key === "youtube" && platform.id) return resolveYouTube(platform.id, url, signal);
  return resolveViaReader(url, platform, signal);
}

async function loadProviders() {
  if (!providersPromise) {
    providersPromise = fetch("./providers.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : FALLBACK_PROVIDERS)
      .catch(() => FALLBACK_PROVIDERS);
  }
  return providersPromise;
}

async function resolveYouTube(id, originalUrl, signal) {
  const providers = await loadProviders();
  const preferredLanguage = ui.language?.value || "auto";
  const piped = uniqueProviders(providers.piped || FALLBACK_PROVIDERS.piped).slice(0, 8);
  const invidious = uniqueProviders(providers.invidious || FALLBACK_PROVIDERS.invidious).slice(0, 6);
  const errors = [];

  setProviderDetails(`YouTube：準備 ${piped.length + invidious.length} 個免費公開節點，分批競速。`);

  for (let index = 0; index < piped.length; index += 3) {
    const batch = piped.slice(index, index + 3);
    const settled = await Promise.allSettled(batch.map((base) => fromPiped(base, id, preferredLanguage, signal)));
    const success = settled.find((item) => item.status === "fulfilled" && item.value?.text);
    if (success) return success.value;
    settled.forEach((item, offset) => {
      if (item.status === "rejected") errors.push(`${shortHost(batch[offset])}: ${shortError(item.reason)}`);
    });
    setResolveStatus("正在切換字幕節點", `已嘗試 ${Math.min(index + 3, piped.length)} 個 Piped 節點。`, 25 + Math.min(30, index * 4), "故障節點會自動跳過。", true);
  }

  for (let index = 0; index < invidious.length; index += 3) {
    const batch = invidious.slice(index, index + 3);
    const settled = await Promise.allSettled(batch.map((base) => fromInvidious(base, id, preferredLanguage, signal)));
    const success = settled.find((item) => item.status === "fulfilled" && item.value?.text);
    if (success) return success.value;
    settled.forEach((item, offset) => {
      if (item.status === "rejected") errors.push(`${shortHost(batch[offset])}: ${shortError(item.reason)}`);
    });
    setResolveStatus("正在使用第二組來源", `已嘗試 ${Math.min(index + 3, invidious.length)} 個 Invidious 節點。`, 60 + Math.min(20, index * 4), "不需要 YouTube API Key。", true);
  }

  try {
    return await resolveViaReader(originalUrl, { key: "youtube", label: "YouTube" }, signal);
  } catch (readerError) {
    errors.push(`Reader: ${shortError(readerError)}`);
  }

  setProviderDetails(errors.slice(-8).join(" · "));
  throw new Error("這支影片沒有公開字幕、字幕被關閉，或免費節點目前無法存取。 ");
}

async function fromPiped(base, id, language, signal) {
  const response = await fetchTimed(`${base.replace(/\/$/, "")}/streams/${encodeURIComponent(id)}`, signal, REQUEST_TIMEOUT_MS);
  const data = await response.json();
  const tracks = Array.isArray(data.subtitles) ? data.subtitles : Array.isArray(data.captions) ? data.captions : [];
  const track = chooseTrack(tracks, language);
  if (!track) throw new Error("沒有字幕軌");
  const trackUrl = absoluteTrackUrl(track.url || track.src, base);
  const subtitleResponse = await fetchTimed(trackUrl, signal, REQUEST_TIMEOUT_MS);
  const raw = await subtitleResponse.text();
  const parsed = parseSubtitle(raw, trackUrl);
  if (!parsed.text) throw new Error("字幕內容為空");
  return {
    ...parsed,
    source: "YouTube 公開字幕",
    platform: "YouTube",
    provider: `Piped · ${shortHost(base)}`,
    confidence: track.autoGenerated ? "medium" : "high",
    disclaimer: track.autoGenerated ? "此字幕由平台自動產生，專有名詞可能需要人工校正。" : "此字幕來自影片公開提供的字幕軌。"
  };
}

async function fromInvidious(base, id, language, signal) {
  const root = base.replace(/\/$/, "");
  const response = await fetchTimed(`${root}/api/v1/captions/${encodeURIComponent(id)}`, signal, REQUEST_TIMEOUT_MS);
  const data = await response.json();
  const tracks = Array.isArray(data) ? data : Array.isArray(data.captions) ? data.captions : [];
  const track = chooseTrack(tracks, language);
  if (!track) throw new Error("沒有字幕軌");
  let subtitleUrl = track.url || track.src;
  if (!subtitleUrl && (track.label || track.name)) {
    subtitleUrl = `${root}/api/v1/captions/${encodeURIComponent(id)}?label=${encodeURIComponent(track.label || track.name)}`;
  }
  if (!subtitleUrl) throw new Error("字幕網址缺失");
  const subtitleResponse = await fetchTimed(absoluteTrackUrl(subtitleUrl, root), signal, REQUEST_TIMEOUT_MS);
  const raw = await subtitleResponse.text();
  const parsed = parseSubtitle(raw, subtitleUrl);
  if (!parsed.text) throw new Error("字幕內容為空");
  return {
    ...parsed,
    source: "YouTube 公開字幕",
    platform: "YouTube",
    provider: `Invidious · ${shortHost(base)}`,
    confidence: String(track.kind || "").includes("asr") ? "medium" : "high",
    disclaimer: "字幕由公開替代前端讀取；節點故障時系統會自動切換。"
  };
}

function chooseTrack(tracks, language) {
  if (!tracks.length) return null;
  const wanted = language === "chinese" ? ["zh-tw", "zh-hant", "zh", "chinese"]
    : language === "english" ? ["en", "english"]
    : language === "japanese" ? ["ja", "japanese"]
    : language === "korean" ? ["ko", "korean"]
    : [];
  return [...tracks].sort((a, b) => trackScore(b, wanted) - trackScore(a, wanted))[0];
}

function trackScore(track, wanted) {
  const value = `${track.code || track.languageCode || track.lang || ""} ${track.name || track.label || track.language || ""}`.toLowerCase();
  let score = track.autoGenerated || String(track.kind || "").includes("asr") ? 1 : 4;
  if (wanted.some((item) => value.includes(item))) score += 20;
  if (/zh-tw|zh-hant|繁體|traditional/.test(value)) score += 5;
  return score;
}

async function resolveDirectSubtitle(url, signal) {
  let raw;
  try {
    raw = await (await fetchTimed(url, signal, REQUEST_TIMEOUT_MS)).text();
  } catch {
    const providers = await loadProviders();
    const reader = providers.reader || FALLBACK_PROVIDERS.reader;
    raw = await (await fetchTimed(`${reader.baseUrl}${url}`, signal, reader.timeoutMs || 12000)).text();
  }
  const parsed = parseSubtitle(raw, url);
  if (!parsed.text) throw new Error("無法辨識這個字幕檔。 ");
  return {
    ...parsed,
    source: "公開字幕檔",
    platform: "字幕檔",
    provider: shortHost(url),
    confidence: "high",
    disclaimer: "文字直接來自公開字幕檔，請確認內容授權與正確性。"
  };
}

async function resolveViaReader(url, platform, signal) {
  const providers = await loadProviders();
  const reader = providers.reader || FALLBACK_PROVIDERS.reader;
  if (!reader.enabled) throw new Error("頁面讀取服務目前停用。 ");
  setResolveStatus(`正在讀取 ${platform.label} 公開頁面`, "尋找頁面中已公開的字幕或逐字稿區塊。", 82, "不會登入帳號，也不會繞過私人內容。", true);
  const response = await fetchTimed(`${reader.baseUrl}${url}`, signal, reader.timeoutMs || 12000, {
    "X-Return-Format": "markdown",
    "X-Timeout": "10"
  });
  const markdown = (await response.text()).slice(0, MAX_TEXT_LENGTH);
  const extracted = extractTranscriptFromMarkdown(markdown);
  if (!extracted.text) {
    throw new Error(`${platform.label} 頁面目前沒有公開可讀的完整字幕。`);
  }
  return {
    ...extracted,
    source: `${platform.label} 公開頁面文字`,
    platform: platform.label,
    provider: `Jina Reader · ${shortHost(url)}`,
    confidence: extracted.hasTimestamps ? "medium" : "low",
    disclaimer: extracted.hasTimestamps
      ? "頁面包含時間軸文字，但仍建議抽查專有名詞。"
      : "這是頁面公開顯示的逐字稿或文字內容，不保證等同影片全部口語。"
  };
}

function extractTranscriptFromMarkdown(markdown) {
  const cleaned = markdown
    .replace(/^Title:.*$/gim, "")
    .replace(/^URL Source:.*$/gim, "")
    .replace(/^Published Time:.*$/gim, "")
    .replace(/^Markdown Content:.*$/gim, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .trim();
  const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const timestampPattern = /^(?:\[)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?(?:\])?[\s\-–—:]+(.+)$/;
  const timed = [];
  for (const line of lines) {
    const match = line.match(timestampPattern);
    if (!match) continue;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const start = hours * 3600 + minutes * 60 + seconds;
    timed.push({ start, end: start + 5, text: stripMarkdown(match[5]) });
  }
  timed.forEach((item, index) => {
    if (timed[index + 1]) item.end = Math.max(item.start + 0.5, timed[index + 1].start);
  });
  if (timed.length >= 2) {
    return { text: timed.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(), segments: timed, hasTimestamps: true };
  }

  const cue = /(?:^|\b)(transcript|captions?|subtitles?|closed captions?|逐字稿|文字稿|完整字幕|字幕內容|影片文字)(?:\b|$)/i;
  const cueIndex = lines.findIndex((line) => cue.test(stripMarkdown(line)));
  if (cueIndex < 0) return { text: "", segments: [], hasTimestamps: false };

  const collected = [];
  for (const line of lines.slice(cueIndex + 1)) {
    if (/^#{1,3}\s+/.test(line) && collected.length > 2) break;
    const text = stripMarkdown(line);
    if (!text || /^[-=*]{3,}$/.test(text)) continue;
    if (/^(share|like|follow|comments?|登入|註冊|更多資訊)$/i.test(text)) continue;
    collected.push(text);
    if (collected.join(" ").length > 30000) break;
  }
  const text = collected.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < 80) return { text: "", segments: [], hasTimestamps: false };
  return { text, segments: [{ start: 0, end: 0, text }], hasTimestamps: false };
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSubtitle(raw, url = "") {
  const text = String(raw || "").replace(/^\uFEFF/, "").trim();
  if (!text) return { text: "", segments: [] };
  if (/^\s*[<{[]/.test(text) && /"(?:events|transcript|body|text)"/.test(text.slice(0, 500))) {
    const jsonResult = parseJsonSubtitle(text);
    if (jsonResult.text) return jsonResult;
  }
  if (/WEBVTT/i.test(text.slice(0, 80)) || /-->/.test(text)) return parseVttOrSrt(text);
  if (/<(?:text|p|span)\b/i.test(text)) return parseXmlSubtitle(text);
  const plain = stripMarkdown(text);
  return { text: plain, segments: plain ? [{ start: 0, end: 0, text: plain }] : [] };
}

function parseVttOrSrt(raw) {
  const blocks = raw.replace(/^WEBVTT[^\n]*\n/i, "").split(/\n{2,}/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => /-->/.test(line));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex].match(/([^\s]+)\s*-->\s*([^\s]+)/);
    if (!timing) continue;
    const cueText = lines.slice(timingIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (cueText) segments.push({ start: parseTimestamp(timing[1]), end: parseTimestamp(timing[2]), text: cueText });
  }
  return { text: dedupeAdjacent(segments).map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim(), segments: dedupeAdjacent(segments) };
}

function parseXmlSubtitle(raw) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/xml");
  const nodes = [...doc.querySelectorAll("text, p")];
  const segments = nodes.map((node) => {
    const start = Number(node.getAttribute("start")) || parseTimestamp(node.getAttribute("begin") || "0");
    const duration = Number(node.getAttribute("dur")) || 0;
    const end = parseTimestamp(node.getAttribute("end") || "") || start + duration || start + 5;
    return { start, end, text: (node.textContent || "").replace(/\s+/g, " ").trim() };
  }).filter((item) => item.text);
  const clean = dedupeAdjacent(segments);
  return { text: clean.map((item) => item.text).join(" ").trim(), segments: clean };
}

function parseJsonSubtitle(raw) {
  try {
    const data = JSON.parse(raw);
    const source = data.events || data.transcript || data.body || data.captions || data;
    const list = Array.isArray(source) ? source : [];
    const segments = list.map((item) => {
      const text = item.text || item.utf8 || item.segs?.map((part) => part.utf8 || part.text || "").join("") || "";
      const start = Number(item.start ?? item.tStartMs / 1000 ?? item.offset ?? 0);
      const end = Number(item.end ?? ((item.tStartMs || 0) + (item.dDurationMs || 0)) / 1000 ?? start + Number(item.duration || 5));
      return { start: Number.isFinite(start) ? start : 0, end: Number.isFinite(end) ? end : 0, text: String(text).replace(/\s+/g, " ").trim() };
    }).filter((item) => item.text);
    const clean = dedupeAdjacent(segments);
    return { text: clean.map((item) => item.text).join(" ").trim(), segments: clean };
  } catch {
    return { text: "", segments: [] };
  }
}

function dedupeAdjacent(segments) {
  const output = [];
  for (const segment of segments) {
    const previous = output[output.length - 1];
    if (previous && previous.text === segment.text) {
      previous.end = Math.max(previous.end, segment.end);
    } else {
      output.push({ ...segment });
    }
  }
  return output;
}

function parseTimestamp(value) {
  const clean = String(value || "").replace(",", ".").trim();
  if (!clean) return 0;
  if (/^\d+(?:\.\d+)?s$/.test(clean)) return Number.parseFloat(clean);
  const parts = clean.replace(/[^0-9:.]/g, "").split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function showOnlineResult(result) {
  onlineResult = {
    ...result,
    text: result.text.trim(),
    segments: (result.segments?.length ? result.segments : [{ start: 0, end: 0, text: result.text.trim() }])
      .map((segment, index) => ({ id: index + 1, start: Number(segment.start) || 0, end: Number(segment.end) || 0, text: String(segment.text || "").trim() }))
      .filter((segment) => segment.text)
  };
  ui.transcript.value = onlineResult.text;
  ui.segments.innerHTML = "";
  onlineResult.segments.forEach((segment, index) => {
    const row = document.createElement("div");
    row.className = "segment";
    const time = document.createElement("button");
    time.type = "button";
    time.className = "segment-time";
    time.textContent = formatClock(segment.start);
    time.disabled = true;
    time.title = "線上字幕來源未包含可直接控制的影片播放器";
    const text = document.createElement("div");
    text.className = "segment-text";
    text.contentEditable = "true";
    text.spellcheck = true;
    text.textContent = segment.text;
    text.setAttribute("aria-label", `第 ${index + 1} 段字幕`);
    text.addEventListener("input", () => {
      segment.text = text.textContent.trim();
      onlineResult.text = onlineResult.segments.map((item) => item.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      ui.transcript.value = onlineResult.text;
      cacheResult(onlineResult.url, onlineResult);
    });
    row.append(time, text);
    ui.segments.appendChild(row);
  });
  ui.segmentCount.textContent = `${onlineResult.segments.length} 段`;
  ui.stats.textContent = `${onlineResult.platform} · ${onlineResult.segments.length} 段 · 約 ${onlineResult.text.replace(/\s/g, "").length} 字 · 線上公開字幕`;
  ui.results.hidden = false;
  resultMeta.hidden = false;
  resultMeta.querySelector("[data-online-source]").textContent = onlineResult.source || "公開字幕";
  resultMeta.querySelector("[data-online-source]").dataset.level = onlineResult.confidence || "medium";
  const confidence = resultMeta.querySelector("[data-online-confidence]");
  confidence.dataset.level = onlineResult.confidence || "medium";
  confidence.textContent = onlineResult.confidence === "high" ? "高可信度" : onlineResult.confidence === "medium" ? "中等可信度" : "需人工確認";
  resultMeta.querySelector("[data-online-provider]").textContent = onlineResult.provider || "公開來源";
  const disclaimer = document.querySelector("[data-online-disclaimer]");
  disclaimer.textContent = onlineResult.disclaimer || "請抽查人名、數字與專有名詞。";
  disclaimer.hidden = false;
  ui.transcript.addEventListener("input", syncOnlineTextarea, { once: false });
  ui.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncOnlineTextarea() {
  if (!onlineResult) return;
  onlineResult.text = ui.transcript.value.trim();
  cacheResult(onlineResult.url, onlineResult);
}

function setInlineStatus(message, type = "") {
  ui.status.textContent = message;
  ui.status.className = "inline-status";
  if (type) ui.status.classList.add(type);
}

function setResolveStatus(title, detail, progress, note = "", cancellable = false, showFallback = false) {
  if (!statusPanel) return;
  statusPanel.hidden = false;
  statusPanel.querySelector("[data-online-title]").textContent = title;
  statusPanel.querySelector("[data-online-detail]").textContent = detail;
  statusPanel.querySelector("[data-online-progress]").style.width = `${Math.max(0, Math.min(100, progress || 0))}%`;
  statusPanel.querySelector("[data-online-note]").textContent = note;
  statusPanel.querySelector("[data-online-cancel]").hidden = !cancellable;
  statusPanel.querySelector("[data-online-fallback]").hidden = !showFallback;
}

function setProviderDetails(text) {
  statusPanel?.querySelector("[data-online-providers]")?.replaceChildren(document.createTextNode(text || ""));
}

async function fetchTimed(url, signal, timeout = REQUEST_TIMEOUT_MS, headers = {}) {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeout);
  const relayAbort = () => timeoutController.abort();
  signal?.addEventListener("abort", relayAbort, { once: true });
  try {
    const response = await fetch(url, {
      signal: timeoutController.signal,
      headers: { Accept: "text/vtt,text/plain,application/json,application/xml,text/xml,*/*", ...headers },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}

function uniqueProviders(values) {
  return [...new Set(values.filter((value) => /^https:\/\//i.test(value)))];
}

function absoluteTrackUrl(value, base) {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return new URL(value, base).toString();
}

function shortHost(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return String(value); }
}

function shortError(error) {
  const value = error?.name === "AbortError" ? "逾時" : error?.message || String(error || "失敗");
  return value.slice(0, 55);
}

function formatClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function srtTime(seconds, separator = ",") {
  const ms = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}

async function copyOnlineText() {
  const text = ui.transcript.value.trim();
  if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch { ui.transcript.select(); document.execCommand("copy"); }
  setInlineStatus("完整字幕已複製。", "ok");
}

function downloadOnline(format) {
  if (!onlineResult) return;
  let content = ui.transcript.value.trim();
  let mime = "text/plain;charset=utf-8";
  if (format === "srt") {
    content = onlineResult.segments.map((segment, index) => `${index + 1}\n${srtTime(segment.start)} --> ${srtTime(segment.end || segment.start + 5)}\n${segment.text}\n`).join("\n");
    mime = "application/x-subrip;charset=utf-8";
  }
  if (format === "vtt") {
    content = `WEBVTT\n\n${onlineResult.segments.map((segment) => `${srtTime(segment.start, ".")} --> ${srtTime(segment.end || segment.start + 5, ".")}\n${segment.text}\n`).join("\n")}`;
    mime = "text/vtt;charset=utf-8";
  }
  const blob = new Blob([content], { type: mime });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `reelscribe-${onlineResult.platform?.toLowerCase() || "online"}.${format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function cacheKey(url) {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i += 1) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  return `reelscribe:online:${(hash >>> 0).toString(36)}`;
}

function cacheResult(url, result) {
  if (!url || !result?.text) return;
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify({ savedAt: Date.now(), url, result }));
  } catch {}
}

function getCachedResult(url) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(url)) || "null");
    if (!saved?.result?.text || saved.url !== url || Date.now() - saved.savedAt > CACHE_TTL_MS) return null;
    return saved.result;
  } catch { return null; }
}

init();
