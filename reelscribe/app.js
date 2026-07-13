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
  suppressMusic: $("#suppress-music"),
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
  mediaDuration: 0,
  enhancement: null,
  modelReadyLabel: "",
  processing: false,
  backgroundPreparing: false,
  storagePolicy: {
    constrained: false,
    cacheAllowed: true,
    availableBytes: 0,
    quotaBytes: 0,
  },
};

const MAX_FILE_BYTES = 300 * 1024 * 1024;
const TARGET_SAMPLE_RATE = 16000;
const APP_BUILD = "2026.07.13.7";
const TINY_MODEL = "onnx-community/whisper-tiny";

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
    elements.urlStatus.textContent = "連結格式正確。正在嘗試取得公開影片或字幕。";
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
  state.enhancement = null;
  state.mediaDuration = 0;
  state.processing = false;
  elements.fileInput.value = "";
  elements.filePanel.hidden = true;
  elements.transcribe.disabled = true;
  elements.results.hidden = true;
  elements.progressPanel.hidden = true;
  document.documentElement.classList.remove("model-loading");
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
  elements.preview.removeAttribute("src");
  elements.preview.load();
}

function updatePreviewDuration() {
  const duration = Number(elements.preview.duration);
  state.mediaDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (state.mediaDuration && state.file) {
    elements.fileDetail.textContent = `${formatBytes(state.file.size)} · ${state.file.type || "媒體檔案"} · ${formatDuration(state.mediaDuration)}`;
  }
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
  state.result = null;
  state.enhancement = null;
  state.mediaDuration = 0;
  state.previewUrl = URL.createObjectURL(file);
  elements.preview.src = state.previewUrl;
  elements.preview.onloadedmetadata = updatePreviewDuration;
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
    for (let index = 0; index < data.length; index += 1) output[index] += data[index] / channels;
  }
  return { audio: output, stereoCentered: false };
}

function resampleLinear(input, sourceRate, targetRate) {
  if (sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, input.length - 1);
    const weight = sourceIndex - left;
    output[index] = input[left] * (1 - weight) + input[right] * weight;
  }
  return output;
}

async function decodeMedia(file) {
  setProgress("正在讀取影片", "解碼音訊中", 4, "模型會同時在背景準備，縮短整體等待時間。 ");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("這個瀏覽器不支援音訊解碼。請改用最新版 Safari、Chrome 或 Edge。 ");
  const context = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    state.mediaDuration = decoded.duration;

    const enhancer = window.ReelScribeSpeechEnhancer;
    const channel = enhancer?.extractSpeechChannel
      ? enhancer.extractSpeechChannel(decoded)
      : downmixToMono(decoded);
    const resampled = resampleLinear(channel.audio, decoded.sampleRate, TARGET_SAMPLE_RATE);

    if (!elements.suppressMusic?.checked || !enhancer?.enhance) {
      state.enhancement = {
        enabled: false,
        stereoCentered: Boolean(channel.stereoCentered),
      };
      return { audio: resampled, duration: decoded.duration, enhancement: state.enhancement };
    }

    setProgress("正在強化人聲", "分析語音與背景音樂", 7, "Silero VAD 只在需要時載入，並與 Whisper 模型同時準備。 ");
    const enhanced = await enhancer.enhance(resampled, TARGET_SAMPLE_RATE, {
      useVad: true,
      onProgress(title, detail, progress) {
        setProgress(title, detail, Math.max(7, Math.min(18, progress)), "保留人聲並衰減純音樂區段。歌曲辨識可關閉此功能。 ");
      },
    });
    state.enhancement = {
      ...enhanced.meta,
      stereoCentered: Boolean(channel.stereoCentered),
      sideEnergyRatio: Number(channel.sideEnergyRatio) || 0,
    };
    return { audio: enhanced.audio, duration: decoded.duration, enhancement: state.enhancement };
  } catch (error) {
    if (error instanceof Error && /語音|人聲|Silero|VAD/.test(error.message)) throw error;
    throw new Error("無法讀取這個影片的音訊。請改用 MP4（H.264/AAC）、M4A、MP3 或 WAV。 ");
  } finally {
    await context.close().catch(() => {});
  }
}

function dispatchModelEvent(detail) {
  window.dispatchEvent(new CustomEvent("reelscribe:model", { detail }));
}

function getWorker() {
  if (state.worker) return state.worker;
  state.worker = new Worker(`./worker.js?v=${APP_BUILD}`, { type: "module" });
  state.worker.addEventListener("message", handleWorkerMessage);
  state.worker.addEventListener("error", (event) => {
    if (state.backgroundPreparing && !state.processing) {
      state.backgroundPreparing = false;
      dispatchModelEvent({ type: "error", message: event.message || "背景模型啟動失敗" });
      return;
    }
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
  const background = state.backgroundPreparing && !state.processing;

  if (message.type === "status") {
    if (background) dispatchModelEvent({ ...message, type: "status" });
    else setProgress(message.title || "處理中", message.detail || "", message.progress || 0, message.note || "");
    return;
  }
  if (message.type === "download") {
    if (background) dispatchModelEvent({ ...message, type: "download" });
    else {
      const progress = Number.isFinite(message.progress) ? message.progress : 0;
      setProgress("正在準備 AI 模型", message.file || "下載模型中", Math.max(8, Math.round(progress)), "模型快取會依瀏覽器可用空間決定；空間不足時不會強制寫入。 ");
    }
    return;
  }
  if (message.type === "ready") {
    state.modelReadyLabel = message.modelLabel || "字幕模型";
    if (background) {
      state.backgroundPreparing = false;
      dispatchModelEvent({ ...message, type: "ready" });
    }
    return;
  }
  if (message.type === "prepare-error") {
    state.backgroundPreparing = false;
    dispatchModelEvent({ ...message, type: "error" });
    return;
  }
  if (message.type === "result") {
    finishTranscription(message.output, message.duration, message.device, message.model, message.modelLabel, message.enhancementMeta);
    return;
  }
  if (message.type === "error") failTranscription(message.message || "字幕辨識失敗。 ");
}

function estimateDuration() {
  const previewDuration = Number(elements.preview.duration);
  if (Number.isFinite(previewDuration) && previewDuration > 0) return previewDuration;
  if (state.mediaDuration > 0) return state.mediaDuration;
  return 60;
}

async function requestPersistentStorage() {
  try {
    if (state.storagePolicy.constrained || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return navigator.storage.persist();
  } catch {
    return false;
  }
}

function setStoragePolicy(policy = {}) {
  state.storagePolicy = {
    ...state.storagePolicy,
    constrained: Boolean(policy.constrained),
    cacheAllowed: policy.cacheAllowed !== false,
    availableBytes: Number(policy.availableBytes) || 0,
    quotaBytes: Number(policy.quotaBytes) || 0,
  };
  return { ...state.storagePolicy };
}

function resolveRequestedModel(requested) {
  if (!state.storagePolicy.constrained) return requested;
  if (requested !== TINY_MODEL) showToast("瀏覽器空間偏低，這次改用 Whisper Tiny 並停止寫入大型模型快取");
  return TINY_MODEL;
}

function prepareModel(options = {}) {
  const worker = getWorker();
  const background = Boolean(options.background);
  if (background) state.backgroundPreparing = true;
  worker.postMessage({
    type: "prepare",
    duration: Number(options.duration) || estimateDuration(),
    model: resolveRequestedModel(options.model || elements.model.value),
    preferGpu: options.preferGpu ?? elements.preferGpu.checked,
    cacheAllowed: options.cacheAllowed ?? state.storagePolicy.cacheAllowed,
    background,
  });
  return true;
}

async function startTranscription() {
  if (!state.file || elements.transcribe.disabled) return false;
  elements.transcribe.disabled = true;
  elements.results.hidden = true;
  state.startedAt = performance.now();
  state.modelReadyLabel = "";
  state.processing = true;
  state.backgroundPreparing = false;
  document.documentElement.classList.add("model-loading");

  try {
    requestPersistentStorage();
    const requestedModel = resolveRequestedModel(elements.model.value);
    const worker = getWorker();
    worker.postMessage({
      type: "prepare",
      duration: estimateDuration(),
      model: requestedModel,
      preferGpu: elements.preferGpu.checked,
      cacheAllowed: state.storagePolicy.cacheAllowed,
      background: false,
    });

    const decoded = await decodeMedia(state.file);
    setProgress(
      "正在準備字幕模型",
      state.modelReadyLabel || "等待模型與音訊完成準備",
      18,
      "音訊強化與模型載入已平行執行。 ",
    );

    worker.postMessage(
      {
        type: "transcribe",
        audioBuffer: decoded.audio.buffer,
        duration: decoded.duration,
        model: requestedModel,
        language: elements.language.value,
        preferGpu: elements.preferGpu.checked,
        enhancementMeta: decoded.enhancement,
        cacheAllowed: state.storagePolicy.cacheAllowed,
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

function finishTranscription(output, duration, device, model, modelLabel, enhancementMeta) {
  const segments = normalizeSegments(output, duration);
  const text = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim() || String(output?.text || "").trim();
  const enhancement = enhancementMeta || state.enhancement || null;
  state.result = { text, segments, duration, device, model, modelLabel, enhancement };
  elements.transcript.value = text;
  renderSegments();
  const elapsed = (performance.now() - state.startedAt) / 1000;
  const words = text.replace(/\s/g, "").length;
  const engine = modelLabel || (device === "webgpu" ? "WebGPU Whisper" : "WASM／CPU Whisper");
  const enhanced = enhancement?.enabled
    ? (enhancement.vadApplied ? "語音強化" : "語音濾波")
    : "原始音訊";
  elements.resultStats.textContent = `${formatDuration(duration)} · ${segments.length} 段 · 約 ${words} 字 · ${engine} · ${enhanced} · ${formatDuration(elapsed)} 完成`;
  elements.results.hidden = false;
  elements.progressPanel.hidden = false;
  setProgress("字幕完成", "可以編輯、複製或下載", 100, "字幕只保存在目前頁面，不會上傳到伺服器。 ");
  elements.transcribe.disabled = false;
  state.processing = false;
  document.documentElement.classList.remove("model-loading");
  saveLatest();
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function failTranscription(message) {
  setProgress("處理失敗", message, 0, "可指定正確語言、切換智慧／平衡模式；歌曲或唱歌內容可關閉語音強化再試。 ");
  elements.transcribe.disabled = false;
  state.processing = false;
  document.documentElement.classList.remove("model-loading");
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

function normalizedComparable(value) {
  return String(value || "").normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
}

function textSimilarity(left, right) {
  const a = normalizedComparable(left);
  const b = normalizedComparable(right);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 1;
  const first = new Set(Array.from(a));
  const second = new Set(Array.from(b));
  let common = 0;
  for (const value of first) if (second.has(value)) common += 1;
  return common / Math.max(1, first.size + second.size - common);
}

function overlapSeconds(left, right) {
  return Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start));
}

function mergeExternalSegments(incoming, options = {}) {
  const additions = (Array.isArray(incoming) ? incoming : [])
    .map((segment) => ({
      start: Math.max(0, Number(segment.start) || 0),
      end: Math.max(Number(segment.start) || 0, Number(segment.end) || Number(segment.start) + 1),
      text: String(segment.text || "").trim(),
      source: segment.source || "external",
      confidence: Number(segment.confidence) || 0,
    }))
    .filter((segment) => segment.text);
  if (!additions.length) return false;

  const existing = (state.result?.segments || []).map((segment) => ({ ...segment }));
  const replaceOverlapping = options.replaceOverlapping !== false;
  for (const addition of additions) {
    let bestIndex = -1;
    let bestOverlap = 0;
    existing.forEach((segment, index) => {
      const overlap = overlapSeconds(segment, addition);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = index;
      }
    });

    if (replaceOverlapping && bestIndex >= 0 && bestOverlap > 0.15) {
      const target = existing[bestIndex];
      if (textSimilarity(target.text, addition.text) < 0.96 || addition.confidence >= 55) {
        target.text = addition.text;
        target.start = Math.min(target.start, addition.start);
        target.end = Math.max(target.end, addition.end);
        target.source = addition.source;
      }
    } else {
      existing.push(addition);
    }
  }

  existing.sort((left, right) => left.start - right.start || left.end - right.end);
  const deduped = [];
  for (const segment of existing) {
    const previous = deduped[deduped.length - 1];
    if (previous && overlapSeconds(previous, segment) > 0 && textSimilarity(previous.text, segment.text) >= 0.92) {
      previous.end = Math.max(previous.end, segment.end);
      continue;
    }
    deduped.push({ ...segment, id: deduped.length + 1 });
  }

  const duration = Math.max(
    state.result?.duration || 0,
    state.mediaDuration || 0,
    ...deduped.map((segment) => segment.end),
  );
  const text = deduped.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
  state.result = {
    ...(state.result || {}),
    text,
    segments: deduped,
    duration,
    device: state.result?.device || "local-ocr",
    modelLabel: state.result?.modelLabel || options.sourceLabel || "畫面 OCR",
    externalSource: options.sourceLabel || "畫面 OCR",
  };
  elements.transcript.value = text;
  renderSegments();
  const words = text.replace(/\s/g, "").length;
  elements.resultStats.textContent = `${formatDuration(duration)} · ${deduped.length} 段 · 約 ${words} 字 · ${options.sourceLabel || "畫面 OCR"} 輔助`;
  elements.results.hidden = false;
  elements.progressPanel.hidden = false;
  setProgress("畫面字幕已套用", "可繼續編輯、複製或下載", 100, "OCR 只在目前裝置讀取影片畫面，不會上傳截圖。 ");
  saveLatest();
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function formatSrtTimestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
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
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_BUILD}`, {
        scope: "./",
        updateViaCache: "none",
      });
      await registration.update();
      if (registration.waiting) showToast("新版已準備完成，關閉後下次開啟會自動套用");
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showToast("新版已下載，不會中斷目前工作；下次開啟自動套用");
          }
        });
      });
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
  prepareModel,
  setStoragePolicy,
  mergeExternalSegments,
  getStoragePolicy: () => ({ ...state.storagePolicy }),
  getFile: () => state.file,
  getDuration: () => state.mediaDuration || estimateDuration(),
  isReady: () => Boolean(state.file && !elements.transcribe.disabled),
  isProcessing: () => state.processing,
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