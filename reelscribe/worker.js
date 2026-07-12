import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;
let loadedKey = "";
let activeDevice = "wasm";

function postStatus(title, detail, progress, note = "") {
  self.postMessage({ type: "status", title, detail, progress, note });
}

function progressCallback(info) {
  if (!info || typeof info !== "object") return;
  const raw = Number(info.progress);
  const progress = Number.isFinite(raw) ? Math.min(90, Math.max(8, raw)) : 12;
  self.postMessage({
    type: "download",
    progress,
    file: info.file || info.name || info.status || "模型檔案",
  });
}

async function loadPipeline(model, preferGpu) {
  const canUseGpu = Boolean(preferGpu && self.navigator?.gpu);
  const requestedDevice = canUseGpu ? "webgpu" : "wasm";
  const key = `${model}:${requestedDevice}`;
  if (transcriber && loadedKey === key) return transcriber;

  transcriber = null;
  loadedKey = "";
  postStatus("正在載入 AI 模型", canUseGpu ? "嘗試使用 WebGPU" : "使用 WASM／CPU", 10, "第一次使用需下載模型，之後會由瀏覽器快取。 ");

  if (canUseGpu) {
    try {
      transcriber = await pipeline("automatic-speech-recognition", model, {
        device: "webgpu",
        dtype: "fp16",
        progress_callback: progressCallback,
      });
      activeDevice = "webgpu";
      loadedKey = key;
      return transcriber;
    } catch (error) {
      console.warn("WebGPU pipeline failed; falling back to WASM", error);
      postStatus("WebGPU 無法啟動", "自動切換到 CPU 模式", 14, "速度可能較慢，但不影響字幕功能。 ");
    }
  }

  transcriber = await pipeline("automatic-speech-recognition", model, {
    device: "wasm",
    dtype: "q8",
    progress_callback: progressCallback,
  });
  activeDevice = "wasm";
  loadedKey = `${model}:wasm`;
  return transcriber;
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  if (message.type !== "transcribe") return;

  try {
    const audio = new Float32Array(message.audioBuffer);
    if (!audio.length) throw new Error("音訊內容是空的。 ");

    const pipe = await loadPipeline(message.model, message.preferGpu);
    postStatus("正在辨識字幕", "模型正在分析語音", 92, "影片越長，處理時間越久；請保持頁面開啟。 ");

    const options = {
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    };
    if (message.language && message.language !== "auto") options.language = message.language;

    const output = await pipe(audio, options);
    self.postMessage({
      type: "result",
      output,
      duration: Number(message.duration) || audio.length / 16000,
      device: activeDevice,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: "error",
      message: message || "字幕模型處理失敗。 ",
    });
  }
});
