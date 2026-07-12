import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const SAMPLE_RATE = 16000;
const FAST_MODEL = "onnx-community/whisper-tiny";
const QUALITY_MODEL = "onnx-community/whisper-base";

let transcriber = null;
let loadedKey = "";
let activeDevice = "wasm";
let activeModel = FAST_MODEL;

function postStatus(title, detail, progress, note = "") {
  self.postMessage({ type: "status", title, detail, progress, note });
}

function progressCallback(info) {
  if (!info || typeof info !== "object") return;
  const raw = Number(info.progress);
  const progress = Number.isFinite(raw) ? Math.min(88, Math.max(8, raw)) : 12;
  self.postMessage({
    type: "download",
    progress,
    file: info.file || info.name || info.status || "模型檔案",
  });
}

function selectModel(requested, duration, preferGpu) {
  if (requested && requested !== "smart") return requested;
  const memory = Number(self.navigator?.deviceMemory) || 0;
  const gpuAvailable = Boolean(preferGpu && self.navigator?.gpu);
  const shortEnoughForQuality = duration <= 12 * 60;
  const capableDevice = gpuAvailable || memory >= 6;
  return shortEnoughForQuality && capableDevice ? QUALITY_MODEL : FAST_MODEL;
}

async function loadPipeline(model, preferGpu) {
  const canUseGpu = Boolean(preferGpu && self.navigator?.gpu);
  const requestedDevice = canUseGpu ? "webgpu" : "wasm";
  const key = `${model}:${requestedDevice}`;
  if (transcriber && loadedKey === key) return transcriber;

  transcriber = null;
  loadedKey = "";
  postStatus(
    "正在載入 AI 模型",
    canUseGpu ? "嘗試使用 WebGPU" : "使用 WASM／CPU",
    10,
    "第一次使用需下載模型；之後會由瀏覽器快取。",
  );

  if (canUseGpu) {
    try {
      transcriber = await pipeline("automatic-speech-recognition", model, {
        device: "webgpu",
        dtype: "fp16",
        progress_callback: progressCallback,
      });
      activeDevice = "webgpu";
      activeModel = model;
      loadedKey = key;
      return transcriber;
    } catch (error) {
      console.warn("WebGPU pipeline failed; falling back to WASM", error);
      postStatus(
        "WebGPU 無法啟動",
        "自動切換到 CPU 模式",
        14,
        "速度可能較慢，但字幕功能仍可使用。",
      );
    }
  }

  transcriber = await pipeline("automatic-speech-recognition", model, {
    device: "wasm",
    dtype: "q8",
    progress_callback: progressCallback,
  });
  activeDevice = "wasm";
  activeModel = model;
  loadedKey = `${model}:wasm`;
  return transcriber;
}

function isMostlySilent(audio) {
  if (!audio.length) return true;
  const step = Math.max(1, Math.floor(audio.length / 5000));
  let energy = 0;
  let peak = 0;
  let count = 0;
  for (let index = 0; index < audio.length; index += step) {
    const value = Math.abs(audio[index]);
    energy += value * value;
    peak = Math.max(peak, value);
    count += 1;
  }
  const rms = Math.sqrt(energy / Math.max(1, count));
  return peak < 0.012 || rms < 0.0018;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/([。！？!?])\1+/g, "$1")
    .trim();
}

function chunksFromOutput(output, offset, fallbackDuration) {
  const chunks = Array.isArray(output?.chunks) ? output.chunks : [];
  if (!chunks.length) {
    const text = normalizeText(output?.text);
    return text ? [{ start: offset, end: offset + fallbackDuration, text }] : [];
  }
  return chunks
    .map((chunk) => {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [0, fallbackDuration];
      const start = Number.isFinite(timestamp[0]) ? timestamp[0] : 0;
      const end = Number.isFinite(timestamp[1]) ? timestamp[1] : Math.min(fallbackDuration, start + 5);
      return {
        start: Math.max(0, offset + start),
        end: Math.max(offset + start, offset + end),
        text: normalizeText(chunk.text),
      };
    })
    .filter((item) => item.text);
}

function overlapLength(left, right, maxLength = 80) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  const limit = Math.min(maxLength, a.length, b.length);
  for (let size = limit; size >= 6; size -= 1) {
    if (a.slice(-size) === b.slice(0, size)) return size;
  }
  return 0;
}

function mergeSegments(existing, incoming) {
  for (const segment of incoming) {
    const previous = existing[existing.length - 1];
    if (!previous) {
      existing.push(segment);
      continue;
    }

    const previousText = normalizeText(previous.text);
    let currentText = normalizeText(segment.text);
    if (!currentText) continue;

    if (currentText === previousText && segment.start <= previous.end + 1.5) {
      previous.end = Math.max(previous.end, segment.end);
      continue;
    }

    const duplicatePrefix = overlapLength(previousText, currentText);
    if (duplicatePrefix && segment.start <= previous.end + 10) {
      currentText = currentText.slice(duplicatePrefix).trim();
      if (!currentText) {
        previous.end = Math.max(previous.end, segment.end);
        continue;
      }
    }

    existing.push({ ...segment, text: currentText });
  }
  return existing;
}

function pipelineOptions(language, fastMode) {
  const options = {
    task: "transcribe",
    chunk_length_s: fastMode ? 20 : 30,
    stride_length_s: fastMode ? 3 : 5,
    return_timestamps: true,
  };
  if (language && language !== "auto") options.language = language;
  return options;
}

async function transcribeAdaptive(pipe, audio, duration, language) {
  const fastMode = activeModel === FAST_MODEL;
  const options = pipelineOptions(language, fastMode);

  if (duration <= 4 * 60) {
    postStatus(
      "正在辨識字幕",
      fastMode ? "極速模式分析中" : "高品質模式分析中",
      90,
      "處理會完全在目前裝置上完成。",
    );
    return pipe(audio, options);
  }

  const windowSeconds = activeDevice === "webgpu"
    ? (fastMode ? 6 * 60 : 4 * 60)
    : (fastMode ? 2 * 60 : 90);
  const overlapSeconds = fastMode ? 6 : 8;
  const windowSamples = Math.max(SAMPLE_RATE * 30, Math.floor(windowSeconds * SAMPLE_RATE));
  const overlapSamples = Math.floor(overlapSeconds * SAMPLE_RATE);
  const stepSamples = Math.max(SAMPLE_RATE, windowSamples - overlapSamples);
  const totalWindows = Math.max(1, Math.ceil(Math.max(1, audio.length - overlapSamples) / stepSamples));
  const merged = [];

  for (let index = 0; index < totalWindows; index += 1) {
    const startSample = index * stepSamples;
    const endSample = Math.min(audio.length, startSample + windowSamples);
    if (startSample >= endSample) break;

    const window = audio.slice(startSample, endSample);
    const offset = startSample / SAMPLE_RATE;
    const windowDuration = window.length / SAMPLE_RATE;
    const percent = 18 + Math.round(((index + 1) / totalWindows) * 77);

    if (isMostlySilent(window)) {
      postStatus(
        "正在處理長影片",
        `已跳過靜音區段 ${index + 1} / ${totalWindows}`,
        percent,
        "系統會略過大段靜音以縮短等待時間。",
      );
      continue;
    }

    postStatus(
      "正在處理長影片",
      `辨識區段 ${index + 1} / ${totalWindows}`,
      percent,
      activeDevice === "webgpu" ? "使用 GPU 分段處理。" : "使用 CPU 分段處理，請保持頁面開啟。",
    );

    const output = await pipe(window, options);
    mergeSegments(merged, chunksFromOutput(output, offset, windowDuration));
  }

  if (!merged.length) throw new Error("沒有辨識到清楚語音，請確認音量或改用其他檔案格式。");
  return {
    text: merged.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(),
    chunks: merged.map((item) => ({
      text: item.text,
      timestamp: [item.start, item.end],
    })),
  };
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  if (message.type !== "transcribe") return;

  try {
    const audio = new Float32Array(message.audioBuffer);
    if (!audio.length) throw new Error("音訊內容是空的。");

    const duration = Number(message.duration) || audio.length / SAMPLE_RATE;
    const model = selectModel(message.model, duration, message.preferGpu);
    const pipe = await loadPipeline(model, message.preferGpu);
    const output = await transcribeAdaptive(pipe, audio, duration, message.language);

    self.postMessage({
      type: "result",
      output,
      duration,
      device: activeDevice,
      model: activeModel,
    });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: "error",
      message: detail || "字幕模型處理失敗。",
    });
  }
});