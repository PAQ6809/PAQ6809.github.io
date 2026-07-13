const $ = (selector) => document.querySelector(selector);

const elements = {
  igUrl: $("#ig-url"),
  pasteUrl: $("#paste-url"),
  checkUrl: $("#check-url"),
  urlStatus: $("#url-status"),
  verifiedActions: $("#verified-link-actions"),
  openInstagram: $("#open-instagram"),
  focusUpload: $("#focus-upload"),
  fileInput: $("#media-file"),
  dropZone: $("#drop-zone"),
  filePanel: $("#file-panel"),
  preview: $("#media-preview"),
  fileName: $("#file-name"),
  fileDetail: $("#file-detail"),
  removeFile: $("#remove-file"),
  model: $("#model-select"),
  language: $("#language-select"),
  preferGpu: $("#prefer-gpu"),
  transcribe: $("#transcribe"),
  progressPanel: $("#progress-panel"),
  progressTitle: $("#progress-title"),
  progressDetail: $("#progress-detail"),
  progressBar: $("#progress-bar"),
  progressNote: $("#progress-note"),
  results: $("#results"),
  resultStats: $("#result-stats"),
  transcript: $("#full-transcript"),
  segments: $("#segments"),
  segmentCount: $("#segment-count"),
  copyText: $("#copy-text"),
  downloadTxt: $("#download-txt"),
  downloadSrt: $("#download-srt"),
  downloadVtt: $("#download-vtt"),
  rebuildText: $("#rebuild-text"),
  toast: $("#toast"),
};

const state = {
  file: null,
  previewUrl: null,
  worker: null,
  result: null,
  startedAt: 0,
  sourceUrl: "",
};

const MAX_FILE_BYTES = 300 * 1024 * 1024;
const TARGET_SAMPLE_RATE = 16000;
const APP_BUILD = "2026.07.13.3";

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2400);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--:--";
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function normalizeInstagramUrl(raw) {
  const url = new URL(raw.trim());
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "instagram.com") throw new Error("這不是 Instagram 網址。 ");
  const match = url.pathname.match(/^\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (!match) throw new Error("請貼上 Reel、貼文影片或 IGTV 的完整連結。 ");
  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
}

function validateUrl() {
  elements.urlStatus.className = "inline-status";
  elements.verifiedActions.hidden = true;
  try {
    const normalized = normalizeInstagramUrl(elements.igUrl.value);
    state.sourceUrl = normalized;
    elements.igUrl.value = normalized;
    elements.urlStatus.textContent = "連結格式正確。接著請選擇你有權處理的影片檔。";
    elements.urlStatus.classList.add("ok");
    elements.openInstagram.href = normalized;
    elements.verifiedActions.hidden = false;
    return normalized;
  } catch (error) {
    elements.urlStatus.textContent = error.message || "無法辨識這個連結。";
    elements.urlStatus.classList.add("error");
    return null;
  }
}

async function pasteUrl() {
  try {
    elements.igUrl.value = await navigator.clipboard.readText();
    validateUrl();
  } catch {
    elements.igUrl.focus();
    showToast("瀏覽器無法讀取剪貼簿，請長按貼上");
  }
}

function clearFile() {
  state.file = null;
  state.result = null;
  elements.fileInput.value = "";
  elements.filePanel.hidden = true;
  elements.transcribe.disabled = true;
  elements.results.hidden = true;
  elements.progressPanel.hidden = true;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
  elements.preview.removeAttribute("src");
  elements.preview.load();
}

function setFile(file) {
  if (!file) return false;
  if (file.size > MAX_FILE_BYTES) {
    showToast("檔案超過 300 MB，請先壓縮或裁剪");
    return false;
  }
  const acceptable = file.type.startsWith("video/") || file.type.startsWith("audio/") || /\.(mp4|mov|m4v|webm|mkv|avi|wmv|flv|mpg|mpeg|ts|mts|m2ts|3gp|3g2|ogv|mp3|m4a|wav|aac|flac|opus|ogg|oga|weba|mka|amr|aiff|aif|caf|wma)$/i.test(file.name);
  if (!acceptable) {
    showToast("不支援這個檔案格式");
    return false;
  }
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.file = file;
  state.previewUrl = URL.createObjectURL(file);
  elements.preview.src = state.previewUrl;
  elements.fileName.textContent = file.name;
  elements.fileDetail.textContent = `${formatBytes(file.size)} · ${file.type || "媒體檔案"}`;
  elements.filePanel.hidden = false;
  elements.transcribe.disabled = false;
  elements.results.hidden = true;
  return true;
}

function downmixToMono(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const output = new Float32Array(audioBuffer.length);
  for (let channel = 0; channel < channels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) output[i] += data[i] / channels;
  }
  return output;
}

function resampleLinear(input, sourceRate, targetRate) {
  if (sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, input.length - 1);
    const weight = sourceIndex - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }
  return output;
}

async function decodeMedia(file) {
  setProgress("正在讀取影片", "解碼音訊中", 4, "大型影片在手機上可能需要一點時間，請保持頁面開啟。 ");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("這個瀏覽器不支援音訊解碼。請改用最新版 Safari、Chrome 或 Edge。 ");
  const context = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    const mono = downmixToMono(decoded);
    const resampled = resampleLinear(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
    return { audio: resampled, duration: decoded.duration };
  } catch (error) {
    throw new Error("無法讀取這個影片的音訊。請改用 MP4（H.264/AAC）、M4A、MP3 或 WAV。 ");
  } finally {
    await context.close().catch(() => {});
  }
}

function getWorker() {
  if (state.worker) return state.worker;
  state.worker = new Worker(`./worker.js?v=${APP_BUILD}`, { type: "module" });
  state.worker.addEventListener("message", handleWorkerMessage);
  state.worker.addEventListener("error", (event) => {
    failTranscription(event.message || "字幕模型啟動失敗。 ");
  });
  return state.worker;
}

function setProgress(title, detail, percent, note = "") {
  elements.progressPanel.hidden = false;
  elements.progressTitle.textContent = title;
  elements.progressDetail.textContent = detail;
  elements.progressBar.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
  elements.progressNote.textContent = note;
}

function handleWorkerMessage(event) {
  const message = event.data || {};
  if (message.type === "status") {
    setProgress(message.title || "處理中", message.detail || "", message.progress || 0, message.note || "");
    return;
  }
  if (message.type === "download") {
    const progress = Number.isFinite(message.progress) ? message.progress : 0;
    setProgress("正在準備 AI 模型", message.file || "下載模型中", Math.max(8, Math.round(progress)), "模型只需首次下載，瀏覽器之後會使用快取。 ");
    return;
  }
  if (message.type === "result") {
    finishTranscription(message.output, message.duration, message.device);
    return;
  }
  if (message.type === "error") failTranscription(message.message || "字幕辨識失敗。 ");
}

async function startTranscription() {
  if (!state.file || elements.transcribe.disabled) return false;
  elements.transcribe.disabled = true;
  elements.results.hidden = true;
  state.startedAt = performance.now();
  try {
    const decoded = await decodeMedia(state.file);
    setProgress("正在準備字幕模型", "第一次使用會下載模型", 7, "辨識過程完全在你的裝置上執行。 ");
    const worker = getWorker();
    worker.postMessage(
      {
        type: "transcribe",
        audioBuffer: decoded.audio.buffer,
        duration: decoded.duration,
        model: elements.model.value,
        language: elements.language.value,
        preferGpu: elements.preferGpu.checked,
      },
      [decoded.audio.buffer],
    );
    return true;
  } catch (error) {
    failTranscription(error.message || "無法處理這個檔案。 ");
    return false;
  }
}

function normalizeSegments(output, duration) {
  const chunks = Array.isArray(output?.chunks) ? output.chunks : [];
  if (!chunks.length) {
    return [{ start: 0, end: duration || 0, text: String(output?.text || "").trim() }];
  }
  return chunks
    .map((chunk, index) => {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [0, 0];
      const start = Number.isFinite(timestamp[0]) ? timestamp[0] : 0;
      const end = Number.isFinite(timestamp[1]) ? timestamp[1] : Math.min(duration || start + 5, start + 5);
      return { id: index + 1, start, end, text: String(chunk.text || "").trim() };
    })
    .filter((segment) => segment.text);
}

function finishTranscription(output, duration, device) {
  const segments = normalizeSegments(output, duration);
  const text = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim() || String(output?.text || "").trim();
  state.result = { text, segments, duration, device };
  elements.transcript.value = text;
  renderSegments();
  const elapsed = (performance.now() - state.startedAt) / 1000;
  const words = text.replace(/\s/g, "").length;
  elements.resultStats.textContent = `${formatDuration(duration)} · ${segments.length} 段 · 約 ${words} 字 · ${device === "webgpu" ? "WebGPU" : "WASM/CPU"} · ${formatDuration(elapsed)} 完成`;
  elements.results.hidden = false;
  elements.progressPanel.hidden = false;
  setProgress("字幕完成", "可以編輯、複製或下載", 100, "字幕只保存在目前頁面，不會上傳到伺服器。 ");
  elements.transcribe.disabled = false;
  saveLatest();
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function failTranscription(message) {
  setProgress("處理失敗", message, 0, "可嘗試切換快速模式、關閉 WebGPU，或改用 MP4／M4A 檔案。 ");
  elements.transcribe.disabled = false;
  showToast("字幕辨識失敗，請查看錯誤說明");
}

function renderSegments() {
  elements.segments.innerHTML = "";
  const segments = state.result?.segments || [];
  elements.segmentCount.textContent = `${segments.length} 段`;
  segments.forEach((segment, index) => {
    const row = document.createElement("div");
    row.className = "segment";

    const timeButton = document.createElement("button");
    timeButton.type = "button";
    timeButton.className = "segment-time";
    timeButton.textContent = formatDuration(segment.start);
    timeButton.title = "跳到影片此時間";
    timeButton.addEventListener("click", () => {
      elements.preview.currentTime = segment.start;
      elements.preview.play().catch(() => {});
    });

    const text = document.createElement("div");
    text.className = "segment-text";
    text.contentEditable = "true";
    text.spellcheck = true;
    text.textContent = segment.text;
    text.setAttribute("aria-label", `第 ${index + 1} 段字幕`);
    text.addEventListener("input", () => {
      segment.text = text.textContent.trim();
      rebuildTranscriptFromSegments(false);
    });

    row.append(timeButton, text);
    elements.segments.appendChild(row);
  });
}

function rebuildTranscriptFromSegments(showMessage = true) {
  if (!state.result) return;
  state.result.text = state.result.segments.map((segment) => segment.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  elements.transcript.value = state.result.text;
  saveLatest();
  if (showMessage) showToast("已依時間軸重建全文");
}

function syncTranscriptOnly() {
  if (!state.result) return;
  state.result.text = elements.transcript.value.trim();
  saveLatest();
}

function formatSrtTimestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
}

function formatVttTimestamp(seconds) {
  return formatSrtTimestamp(seconds).replace(",", ".");
}

function makeSrt() {
  return (state.result?.segments || []).map((segment, index) => `${index + 1}\n${formatSrtTimestamp(segment.start)} --> ${formatSrtTimestamp(segment.end)}\n${segment.text}\n`).join("\n");
}

function makeVtt() {
  const body = (state.result?.segments || []).map((segment) => `${formatVttTimestamp(segment.start)} --> ${formatVttTimestamp(segment.end)}\n${segment.text}\n`).join("\n");
  return `WEBVTT\n\n${body}`;
}

function safeBaseName() {
  const original = state.file?.name || "reelscribe-transcript";
  return original.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "reelscribe-transcript";
}

function downloadFile(content, extension, type) {
  if (!state.result) return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeBaseName()}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyTranscript() {
  const text = elements.transcript.value.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("完整字幕已複製");
  } catch {
    elements.transcript.select();
    document.execCommand("copy");
    showToast("完整字幕已複製");
  }
}

function saveLatest() {
  if (!state.result) return;
  try {
    localStorage.setItem("reelscribe:last", JSON.stringify({
      savedAt: Date.now(),
      fileName: state.file?.name || "",
      sourceUrl: state.sourceUrl,
      result: state.result,
    }));
  } catch {
    // Private mode or storage quota may prevent local persistence.
  }
}

function restoreLatest() {
  try {
    const raw = localStorage.getItem("reelscribe:last");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved?.result?.text || Date.now() - saved.savedAt > 7 * 24 * 60 * 60 * 1000) return;
    state.result = saved.result;
    state.sourceUrl = saved.sourceUrl || "";
    elements.transcript.value = saved.result.text;
    renderSegments();
    elements.resultStats.textContent = `已復原上次字幕 · ${saved.fileName || "未命名檔案"}`;
    elements.results.hidden = false;
  } catch {
    // Ignore invalid saved data.
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    const key = `reelscribe:sw-reload:${APP_BUILD}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_BUILD}`, {
        scope: "./",
        updateViaCache: "none",
      });
      await registration.update();
    } catch {
      // The website remains usable without offline caching.
    }
  });
}

window.ReelScribeApp = Object.freeze({
  build: APP_BUILD,
  setFile,
  clearFile,
  startTranscription,
  isReady: () => Boolean(state.file && !elements.transcribe.disabled),
});

elements.pasteUrl.addEventListener("click", pasteUrl);
elements.checkUrl.addEventListener("click", validateUrl);
elements.igUrl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") validateUrl();
});
elements.focusUpload.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", (event) => setFile(event.target.files?.[0]));
elements.removeFile.addEventListener("click", clearFile);
elements.transcribe.addEventListener("click", startTranscription);
elements.copyText.addEventListener("click", copyTranscript);
elements.downloadTxt.addEventListener("click", () => downloadFile(elements.transcript.value.trim(), "txt", "text/plain;charset=utf-8"));
elements.downloadSrt.addEventListener("click", () => downloadFile(makeSrt(), "srt", "application/x-subrip;charset=utf-8"));
elements.downloadVtt.addEventListener("click", () => downloadFile(makeVtt(), "vtt", "text/vtt;charset=utf-8"));
elements.rebuildText.addEventListener("click", () => rebuildTranscriptFromSegments(true));
elements.transcript.addEventListener("input", syncTranscriptOnly);

["dragenter", "dragover"].forEach((name) => elements.dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((name) => elements.dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("dragging");
}));
elements.dropZone.addEventListener("drop", (event) => setFile(event.dataTransfer?.files?.[0]));

registerServiceWorker();
restoreLatest();