(() => {
  "use strict";

  const ORT_VERSION = "1.22.0";
  const VAD_VERSION = "0.0.30";
  const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  const VAD_BASE = `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`;
  const ORT_SCRIPT = `${ORT_BASE}ort.wasm.min.js`;
  const VAD_SCRIPT = `${VAD_BASE}bundle.min.js`;

  let runtimePromise = null;
  let detectorPromise = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadScript(src, id) {
    const existing = document.getElementById(id);
    if (existing?.dataset.loaded === "true") return Promise.resolve();
    if (existing?.dataset.loading === "true") {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.dataset.loading = "true";
      script.addEventListener("load", () => {
        script.dataset.loading = "false";
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        script.dataset.loading = "false";
        reject(new Error(`無法載入語音強化元件：${src}`));
      }, { once: true });
      if (!existing) document.head.appendChild(script);
    });
  }

  async function loadVadRuntime() {
    if (window.vad?.NonRealTimeVAD) return window.vad;
    if (!runtimePromise) {
      runtimePromise = (async () => {
        await loadScript(ORT_SCRIPT, "reelscribe-ort-runtime");
        await loadScript(VAD_SCRIPT, "reelscribe-vad-runtime");
        if (!window.vad?.NonRealTimeVAD) throw new Error("Silero VAD 未正確初始化。");
        return window.vad;
      })().catch((error) => {
        runtimePromise = null;
        throw error;
      });
    }
    return runtimePromise;
  }

  async function getDetector() {
    if (!detectorPromise) {
      detectorPromise = loadVadRuntime()
        .then((runtime) => runtime.NonRealTimeVAD.new({
          model: "v5",
          positiveSpeechThreshold: 0.62,
          negativeSpeechThreshold: 0.42,
          redemptionMs: 420,
          preSpeechPadMs: 180,
          minSpeechMs: 180,
          baseAssetPath: VAD_BASE,
          onnxWASMBasePath: ORT_BASE,
        }))
        .catch((error) => {
          detectorPromise = null;
          throw error;
        });
    }
    return detectorPromise;
  }

  function extractSpeechChannel(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    if (!channels || !length) return { audio: new Float32Array(), stereoCentered: false };

    if (channels === 1) {
      return {
        audio: new Float32Array(audioBuffer.getChannelData(0)),
        stereoCentered: false,
      };
    }

    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const output = new Float32Array(length);
    const frameSize = Math.max(256, Math.round(audioBuffer.sampleRate * 0.02));
    let sideEnergyTotal = 0;
    let midEnergyTotal = 0;

    for (let start = 0; start < length; start += frameSize) {
      const end = Math.min(length, start + frameSize);
      let midEnergy = 0;
      let sideEnergy = 0;
      for (let index = start; index < end; index += 1) {
        const mid = (left[index] + right[index]) * 0.5;
        const side = (left[index] - right[index]) * 0.5;
        midEnergy += mid * mid;
        sideEnergy += side * side;
      }

      midEnergyTotal += midEnergy;
      sideEnergyTotal += sideEnergy;
      const sideRatio = sideEnergy / Math.max(1e-9, midEnergy + sideEnergy);
      const centerGain = 1 + Math.min(0.28, sideRatio * 0.55);

      for (let index = start; index < end; index += 1) {
        output[index] = clamp(((left[index] + right[index]) * 0.5) * centerGain, -1, 1);
      }
    }

    return {
      audio: output,
      stereoCentered: sideEnergyTotal > midEnergyTotal * 0.04,
      sideEnergyRatio: sideEnergyTotal / Math.max(1e-9, midEnergyTotal + sideEnergyTotal),
    };
  }

  function biquadCoefficients(type, frequency, q, sampleRate, gainDb = 0) {
    const omega = (2 * Math.PI * frequency) / sampleRate;
    const cos = Math.cos(omega);
    const sin = Math.sin(omega);
    const alpha = sin / (2 * q);
    const a = 10 ** (gainDb / 40);
    let b0;
    let b1;
    let b2;
    let a0;
    let a1;
    let a2;

    if (type === "highpass") {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (type === "lowpass") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else {
      b0 = 1 + alpha * a;
      b1 = -2 * cos;
      b2 = 1 - alpha * a;
      a0 = 1 + alpha / a;
      a1 = -2 * cos;
      a2 = 1 - alpha / a;
    }

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0,
    };
  }

  function applyBiquad(audio, coefficients) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let index = 0; index < audio.length; index += 1) {
      const x0 = audio[index];
      const y0 = coefficients.b0 * x0
        + coefficients.b1 * x1
        + coefficients.b2 * x2
        - coefficients.a1 * y1
        - coefficients.a2 * y2;
      audio[index] = Number.isFinite(y0) ? y0 : 0;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
    return audio;
  }

  function applySpeechBand(audio, sampleRate) {
    const highpass = biquadCoefficients("highpass", 85, 0.707, sampleRate);
    const presence = biquadCoefficients("peaking", 2600, 0.9, sampleRate, 2.2);
    const lowpass = biquadCoefficients("lowpass", Math.min(7200, sampleRate * 0.45), 0.707, sampleRate);
    applyBiquad(audio, highpass);
    applyBiquad(audio, presence);
    applyBiquad(audio, lowpass);
    return audio;
  }

  function mergeRegions(regions, durationSeconds, paddingSeconds = 0.18, mergeGapSeconds = 0.28) {
    const normalized = regions
      .map((region) => ({
        start: clamp(Number(region.start) - paddingSeconds, 0, durationSeconds),
        end: clamp(Number(region.end) + paddingSeconds, 0, durationSeconds),
      }))
      .filter((region) => region.end > region.start)
      .sort((left, right) => left.start - right.start);

    const merged = [];
    for (const region of normalized) {
      const previous = merged[merged.length - 1];
      if (!previous || region.start > previous.end + mergeGapSeconds) {
        merged.push({ ...region });
      } else {
        previous.end = Math.max(previous.end, region.end);
      }
    }
    return merged;
  }

  function buildFrameMask(audioLength, sampleRate, regions) {
    const frameSize = Math.max(1, Math.round(sampleRate * 0.01));
    const frames = Math.max(1, Math.ceil(audioLength / frameSize));
    const mask = new Float32Array(frames);
    mask.fill(0.025);

    for (const region of regions) {
      const first = clamp(Math.floor((region.start * sampleRate) / frameSize), 0, frames - 1);
      const last = clamp(Math.ceil((region.end * sampleRate) / frameSize), first + 1, frames);
      for (let frame = first; frame < last; frame += 1) mask[frame] = 1;
    }

    const fadeFrames = Math.max(2, Math.round(0.08 / (frameSize / sampleRate)));
    for (let frame = 1; frame < frames; frame += 1) {
      if (mask[frame] > mask[frame - 1]) {
        for (let offset = 1; offset <= fadeFrames; offset += 1) {
          const target = frame - offset;
          if (target < 0) break;
          const gain = 0.025 + (1 - 0.025) * (1 - offset / (fadeFrames + 1));
          mask[target] = Math.max(mask[target], gain);
        }
      }
      if (mask[frame] < mask[frame - 1]) {
        for (let offset = 0; offset < fadeFrames; offset += 1) {
          const target = frame + offset;
          if (target >= frames) break;
          const gain = 0.025 + (1 - 0.025) * (1 - offset / fadeFrames);
          mask[target] = Math.max(mask[target], gain);
        }
      }
    }

    return { mask, frameSize };
  }

  function applyFrameMask(audio, frameMask) {
    const { mask, frameSize } = frameMask;
    let speechSamples = 0;
    let speechEnergy = 0;
    for (let index = 0; index < audio.length; index += 1) {
      const gain = mask[Math.min(mask.length - 1, Math.floor(index / frameSize))];
      if (gain > 0.5) {
        speechSamples += 1;
        speechEnergy += audio[index] * audio[index];
      }
      audio[index] *= gain;
    }

    const speechRms = speechSamples ? Math.sqrt(speechEnergy / speechSamples) : 0;
    const normalizationGain = speechRms > 0 ? clamp(0.075 / speechRms, 0.8, 2.8) : 1;
    if (normalizationGain !== 1) {
      for (let index = 0; index < audio.length; index += 1) {
        audio[index] = clamp(audio[index] * normalizationGain, -0.98, 0.98);
      }
    }

    return {
      speechRatio: speechSamples / Math.max(1, audio.length),
      speechRms,
      normalizationGain,
    };
  }

  async function detectSpeechRegions(audio, sampleRate, onProgress) {
    onProgress?.("正在載入人聲偵測", "首次約需下載 2 MB 語音模型", 8);
    const detector = await getDetector();
    onProgress?.("正在分析人聲", "排除純音樂與無人聲區段", 12);
    const regions = [];
    for await (const segment of detector.run(audio, sampleRate)) {
      regions.push({
        start: Number(segment.start) / 1000,
        end: Number(segment.end) / 1000,
      });
    }
    return mergeRegions(regions, audio.length / sampleRate);
  }

  function normalizeFallback(audio) {
    if (!audio.length) return { normalizationGain: 1 };
    const step = Math.max(1, Math.floor(audio.length / 100000));
    let energy = 0;
    let count = 0;
    for (let index = 0; index < audio.length; index += step) {
      energy += audio[index] * audio[index];
      count += 1;
    }
    const rms = Math.sqrt(energy / Math.max(1, count));
    const gain = rms > 0 ? clamp(0.055 / rms, 0.75, 2.2) : 1;
    for (let index = 0; index < audio.length; index += 1) {
      audio[index] = clamp(audio[index] * gain, -0.98, 0.98);
    }
    return { normalizationGain: gain };
  }

  async function enhance(audio, sampleRate, options = {}) {
    const startedAt = performance.now();
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
    applySpeechBand(audio, sampleRate);

    if (options.useVad === false) {
      const fallback = normalizeFallback(audio);
      return {
        audio,
        meta: {
          enabled: true,
          vadApplied: false,
          reason: "disabled",
          elapsedMs: performance.now() - startedAt,
          ...fallback,
        },
      };
    }

    try {
      const regions = await detectSpeechRegions(audio, sampleRate, onProgress);
      if (!regions.length) {
        const fallback = normalizeFallback(audio);
        return {
          audio,
          meta: {
            enabled: true,
            vadApplied: false,
            reason: "no-speech-regions",
            elapsedMs: performance.now() - startedAt,
            ...fallback,
          },
        };
      }

      onProgress?.("正在降低背景音樂", `保留 ${regions.length} 個人聲區段`, 16);
      const mask = buildFrameMask(audio.length, sampleRate, regions);
      const stats = applyFrameMask(audio, mask);
      return {
        audio,
        meta: {
          enabled: true,
          vadApplied: true,
          vadModel: "Silero VAD v5",
          regions: regions.length,
          elapsedMs: performance.now() - startedAt,
          ...stats,
        },
      };
    } catch (error) {
      console.warn("Silero VAD enhancement unavailable; using DSP fallback", error);
      const fallback = normalizeFallback(audio);
      return {
        audio,
        meta: {
          enabled: true,
          vadApplied: false,
          reason: "vad-unavailable",
          warning: error instanceof Error ? error.message : String(error),
          elapsedMs: performance.now() - startedAt,
          ...fallback,
        },
      };
    }
  }

  window.ReelScribeSpeechEnhancer = Object.freeze({
    extractSpeechChannel,
    biquadCoefficients,
    applyBiquad,
    applySpeechBand,
    mergeRegions,
    buildFrameMask,
    applyFrameMask,
    enhance,
    versions: Object.freeze({ onnxRuntime: ORT_VERSION, vadWeb: VAD_VERSION }),
  });
})();