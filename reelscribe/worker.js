import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const SAMPLE_RATE = 16000;
const FAST_MODEL = "onnx-community/whisper-tiny";
const BALANCED_MODEL = "onnx-community/whisper-base";
const ACCURATE_MODEL = "onnx-community/whisper-small";

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

function modelLabel(model) {
  if (model === ACCURATE_MODEL) return "Whisper Small 精準模型";
  if (model === BALANCED_MODEL) return "Whisper Base 平衡模型";
  return "Whisper Tiny 極速模型";
}

function deviceProfile(preferGpu) {
  const userAgent = String(self.navigator?.userAgent || "");
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const memory = Number(self.navigator?.deviceMemory) || 0;
  const cores = Number(self.navigator?.hardwareConcurrency) || 2;
  const gpuAvailable = Boolean(preferGpu && self.navigator?.gpu);
  return { mobile, memory, cores, gpuAvailable };
}

function selectModel(requested, duration, preferGpu) {
  if (requested && requested !== "smart") return requested;
  const profile = deviceProfile(preferGpu);

  // Whisper Small is reserved for capable desktop-class WebGPU devices because
  // its multilingual accuracy is better but its browser download and memory use are much larger.
  if (
    profile.gpuAvailable
    && !profile.mobile
    && duration <= 20 * 60
    && (profile.memory >= 8 || profile.cores >= 8)
  ) {
    return ACCURATE_MODEL;
  }

  if (profile.gpuAvailable && duration <= 15 * 60) return BALANCED_MODEL;
  if (!profile.mobile && profile.memory >= 8 && duration <= 5 * 60) return BALANCED_MODEL;
  return FAST_MODEL;
}

function modelFallbacks(model) {
  if (model === ACCURATE_MODEL) return [ACCURATE_MODEL, BALANCED_MODEL, FAST_MODEL];
  if (model === BALANCED_MODEL) return [BALANCED_MODEL, FAST_MODEL];
  return [FAST_MODEL];
}

function loadPlans(model, preferGpu) {
  const profile = deviceProfile(preferGpu);
  const plans = [];

  if (profile.gpuAvailable) {
    for (const candidate of modelFallbacks(model)) {
      plans.push({ model: candidate, device: "webgpu", dtype: "fp16" });
    }
  }

  // Running Whisper Small in WASM is generally too slow and memory-heavy for a browser.
  const wasmModels = model === FAST_MODEL ? [FAST_MODEL] : [BALANCED_MODEL, FAST_MODEL];
  for (const candidate of wasmModels) {
    plans.push({ model: candidate, device: "wasm", dtype: "q8" });
  }

  return plans;
}

async function loadPipeline(model, preferGpu) {
  const plans = loadPlans(model, preferGpu);
  let lastError = null;

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const key = `${plan.model}:${plan.device}:${plan.dtype}`;
    if (transcriber && loadedKey === key) return transcriber;

    const fallback = index > 0;
    postStatus(
      fallback ? "正在切換相容模型" : "正在載入 AI 模型",
      `${modelLabel(plan.model)} · ${plan.device === "webgpu" ? "WebGPU" : "WASM／CPU"}`,
      fallback ? 14 : 10,
      fallback
        ? "較大型模型無法穩定啟動，系統正自動降級，不需要重新操作。"
        : "第一次使用需下載模型；之後會由瀏覽器快取。",
    );

    try {
      transcriber = await pipeline("automatic-speech-recognition", plan.model, {
        device: plan.device,
        dtype: plan.dtype,
        progress_callback: progressCallback,
      });
      activeDevice = plan.device;
      activeModel = plan.model;
      loadedKey = key;
      return transcriber;
    } catch (error) {
      console.warn(`Whisper load failed: ${key}`, error);
      lastError = error;
      transcriber = null;
      loadedKey = "";
    }
  }

  throw lastError || new Error("所有本機字幕模型都無法啟動。");
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

function meaningfulCharacters(value) {
  return Array.from(normalizeText(value).replace(/[\s\p{P}\p{S}]/gu, ""));
}

function longestCharacterRun(characters) {
  let longest = 0;
  let current = 0;
  let previous = "";
  for (const character of characters) {
    if (character === previous) current += 1;
    else {
      previous = character;
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}

function textRepetitionMetrics(value) {
  const characters = meaningfulCharacters(value);
  const length = characters.length;
  if (!length) {
    return { length: 0, dominantRatio: 0, longestRun: 0, bigramDiversity: 1 };
  }

  const frequency = new Map();
  for (const character of characters) {
    frequency.set(character, (frequency.get(character) || 0) + 1);
  }
  const dominant = Math.max(...frequency.values());

  const bigrams = [];
  for (let index = 0; index < characters.length - 1; index += 1) {
    bigrams.push(`${characters[index]}${characters[index + 1]}`);
  }
  const bigramDiversity = bigrams.length ? new Set(bigrams).size / bigrams.length : 1;

  return {
    length,
    dominantRatio: dominant / length,
    longestRun: longestCharacterRun(characters),
    bigramDiversity,
  };
}

function isHallucinatedText(value) {
  const metrics = textRepetitionMetrics(value);
  if (metrics.length < 12) return metrics.longestRun >= 10;
  if (metrics.longestRun >= 8) return true;
  if (metrics.length >= 20 && metrics.dominantRatio >= 0.55) return true;
  if (metrics.length >= 30 && metrics.bigramDiversity <= 0.1) return true;
  return false;
}

function outputText(output) {
  const chunks = Array.isArray(output?.chunks) ? output.chunks : [];
  const fromChunks = chunks.map((chunk) => normalizeText(chunk?.text)).filter(Boolean).join(" ");
  return normalizeText(fromChunks || output?.text);
}

function isHallucinatedOutput(output) {
  return isHallucinatedText(outputText(output));
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
  const accurateMode = activeModel === ACCURATE_MODEL;
  const options = {
    task: "transcribe",
    chunk_length_s: fastMode ? 20 : 30,
    stride_length_s: fastMode ? 3 : 5,
    return_timestamps: true,
    do_sample: false,
    num_beams: accurateMode ? 2 : 1,
    max_new_tokens: accurateMode ? 320 : 256,
  };
  if (language && language !== "auto") options.language = language;
  return options;
}

function guardedPipelineOptions(language, fastMode, duration) {
  return {
    ...pipelineOptions(language, fastMode),
    chunk_length_s: fastMode ? 15 : 20,
    stride_length_s: fastMode ? 2 : 3,
    repetition_penalty: 1.18,
    no_repeat_ngram_size: 3,
    max_new_tokens: Math.min(256, Math.max(32, Math.ceil(Math.max(1, duration) * 6))),
  };
}

async function transcribeWithHallucinationGuard(pipe, audio, duration, language, fastMode, progress = 94) {
  const first = await pipe(audio, pipelineOptions(language, fastMode));
  if (!isHallucinatedOutput(first)) return first;

  postStatus(
    "偵測到重複字幕",
    "正在自動重新辨識",
    progress,
    "系統已攔截低可信度的重複文字，不會直接輸出錯誤字幕。",
  );

  const retry = await pipe(audio, guardedPipelineOptions(language, fastMode, duration));
  if (!isHallucinatedOutput(retry)) return retry;

  throw new Error("偵測到模型持續產生大量重複文字，已停止輸出低可信度字幕。請確認影片內有清楚人聲，並指定正確語言後重試。");
}

async function transcribeAdaptive(pipe, audio, duration, language) {
  const fastMode = activeModel === FAST_MODEL;

  if (duration <= 4 * 60) {
    postStatus(
      "正在辨識字幕",
      `${modelLabel(activeModel)}分析中`,
      90,
      "處理會完全在目前裝置上完成。",
    );
    return transcribeWithHallucinationGuard(pipe, audio, duration, language, fastMode);
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
  let rejectedWindows = 0;

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
      `${modelLabel(activeModel)} · 區段 ${index + 1} / ${totalWindows}`,
      percent,
      activeDevice === "webgpu" ? "使用 GPU 分段處理。" : "使用 CPU 分段處理，請保持頁面開啟。",
    );

    try {
      const output = await transcribeWithHallucinationGuard(
        pipe,
        window,
        windowDuration,
        language,
        fastMode,
        percent,
      );
      mergeSegments(merged, chunksFromOutput(output, offset, windowDuration));
    } catch (error) {
      rejectedWindows += 1;
      console.warn(`Rejected low-confidence window ${index + 1}`, error);
      postStatus(
        "正在處理長影片",
        `已略過低可信度區段 ${index + 1} / ${totalWindows}`,
        percent,
        "重複或無清楚人聲的區段不會被寫入字幕。",
      );
    }
  }

  if (!merged.length) {
    throw new Error("沒有取得可信的語音字幕。請確認音量、人聲與語言設定，或改用較清楚的音訊檔。");
  }

  const text = merged.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
  if (isHallucinatedText(text)) {
    throw new Error("合併後字幕仍出現大量重複文字，已停止輸出低可信度結果。");
  }

  return {
    text,
    chunks: merged.map((item) => ({
      text: item.text,
      timestamp: [item.start, item.end],
    })),
    rejectedWindows,
  };
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  if (message.type !== "transcribe") return;

  try {
    const audio = new Float32Array(message.audioBuffer);
    if (!audio.length) throw new Error("音訊內容是空的。");
    if (isMostlySilent(audio)) throw new Error("沒有偵測到足夠清楚的人聲，請確認影片音量或改用其他音訊來源。");

    const duration = Number(message.duration) || audio.length / SAMPLE_RATE;
    const model = selectModel(message.model, duration, message.preferGpu);
    const pipe = await loadPipeline(model, message.preferGpu);
    const output = await transcribeAdaptive(pipe, audio, duration, message.language);

    if (isHallucinatedOutput(output)) {
      throw new Error("偵測到大量重複文字，已阻止低可信度字幕輸出。");
    }

    self.postMessage({
      type: "result",
      output,
      duration,
      device: activeDevice,
      model: activeModel,
      modelLabel: modelLabel(activeModel),
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