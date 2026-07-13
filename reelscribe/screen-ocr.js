(() => {
  "use strict";

  const TESSERACT_VERSION = "7.0.0";
  const TESSERACT_SCRIPT = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
  const MAX_MOBILE_FRAMES = 60;
  const MAX_DESKTOP_FRAMES = 120;

  const video = document.querySelector("#media-preview");
  const fileInput = document.querySelector("#media-file");
  const startButton = document.querySelector("#start-screen-ocr");
  const stopButton = document.querySelector("#stop-screen-ocr");
  const status = document.querySelector("#ocr-status");
  const statusCopy = document.querySelector("#ocr-status-copy");
  const intervalSelect = document.querySelector("#ocr-interval");
  const cropSelect = document.querySelector("#ocr-crop");
  const mergeToggle = document.querySelector("#ocr-merge");
  const languageSelect = document.querySelector("#language-select");

  let scriptPromise = null;
  let activeWorker = null;
  let stopRequested = false;
  let running = false;

  function setStatus(message, progress = null) {
    if (statusCopy) statusCopy.textContent = message;
    if (status && Number.isFinite(progress)) status.style.setProperty("--ocr-progress", `${Math.max(0, Math.min(100, progress))}%`);
  }

  function isMobile() {
    const ua = String(navigator.userAgent || "");
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
      || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints) > 1);
  }

  function loadTesseractScript() {
    if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_SCRIPT;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.addEventListener("load", () => {
        if (window.Tesseract?.createWorker) resolve(window.Tesseract);
        else reject(new Error("OCR 元件載入後沒有正確初始化。"));
      }, { once: true });
      script.addEventListener("error", () => reject(new Error("無法下載 OCR 元件。")), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      throw error;
    });
    return scriptPromise;
  }

  function ocrLanguages() {
    const selected = languageSelect?.value || "auto";
    if (selected === "english") return ["eng"];
    if (selected === "japanese") return ["jpn", "eng"];
    if (selected === "korean") return ["kor", "eng"];
    return ["chi_tra", "eng"];
  }

  async function createOcrWorker() {
    const Tesseract = await loadTesseractScript();
    const storage = await window.ReelScribeRuntime?.storageState?.();
    const cacheMethod = storage?.constrained ? "none" : "write";
    setStatus("正在載入本機 OCR；首次使用需下載文字模型。", 4);
    const worker = await Tesseract.createWorker(ocrLanguages(), Tesseract.OEM?.LSTM ?? 1, {
      cacheMethod,
      logger(message) {
        if (!message || !Number.isFinite(message.progress)) return;
        const progress = Math.round(message.progress * 100);
        setStatus(`OCR 準備中 · ${message.status || "處理模型"} ${progress}%`, Math.min(24, Math.max(4, progress * 0.24)));
      },
      errorHandler(error) {
        console.warn("Tesseract OCR error", error);
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      user_defined_dpi: "180",
    });
    return worker;
  }

  function waitForEvent(target, name, timeout = 8000) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const cleanup = () => {
        target.removeEventListener(name, onEvent);
        if (timer) clearTimeout(timer);
      };
      const onEvent = () => {
        cleanup();
        resolve();
      };
      target.addEventListener(name, onEvent, { once: true });
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`等待 ${name} 逾時`));
      }, timeout);
    });
  }

  async function ensureMetadata() {
    if (Number.isFinite(video?.duration) && video.duration > 0 && video.videoWidth > 0) return;
    if (!video?.src) throw new Error("請先選擇或解析一個可播放的影片。 ");
    video.load();
    await waitForEvent(video, "loadedmetadata", 12000);
  }

  async function seekVideo(time) {
    const bounded = Math.max(0, Math.min(Math.max(0, video.duration - 0.05), time));
    if (Math.abs(video.currentTime - bounded) < 0.04 && video.readyState >= 2) return;
    const promise = waitForEvent(video, "seeked", 8000);
    video.currentTime = bounded;
    await promise;
  }

  function captureFrame(cropFraction) {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("影片畫面尚未準備完成。 ");

    const cropHeight = Math.max(80, Math.round(sourceHeight * cropFraction));
    const cropTop = Math.max(0, sourceHeight - cropHeight);
    const targetWidth = Math.min(1440, Math.max(720, sourceWidth * (sourceWidth < 900 ? 1.6 : 1)));
    const scale = targetWidth / sourceWidth;
    const targetHeight = Math.max(120, Math.round(cropHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(targetWidth);
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!context) throw new Error("瀏覽器無法建立畫面讀取區。 ");

    context.drawImage(video, 0, cropTop, sourceWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    let sum = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const gray = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
      sum += gray;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = gray;
    }
    const mean = sum / Math.max(1, pixels.length / 4);
    const contrast = mean > 150 ? 1.55 : 1.8;
    for (let index = 0; index < pixels.length; index += 4) {
      const adjusted = Math.max(0, Math.min(255, (pixels[index] - 128) * contrast + 128));
      pixels[index] = pixels[index + 1] = pixels[index + 2] = adjusted;
      pixels[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[|｜_~—–\-]+|[|｜_~—–\-]+$/g, "")
      .trim();
  }

  function compact(value) {
    return normalizeText(value).replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
  }

  function similarity(left, right) {
    const a = compact(left);
    const b = compact(right);
    if (!a || !b) return 0;
    if (a === b || a.includes(b) || b.includes(a)) return 1;
    const grams = (text) => {
      const set = new Set();
      const size = text.length < 4 ? 1 : 2;
      for (let index = 0; index <= text.length - size; index += 1) set.add(text.slice(index, index + size));
      return set;
    };
    const first = grams(a);
    const second = grams(b);
    let intersection = 0;
    for (const value of first) if (second.has(value)) intersection += 1;
    return intersection / Math.max(1, first.size + second.size - intersection);
  }

  function acceptableText(text, confidence) {
    const cleaned = normalizeText(text);
    const meaningful = compact(cleaned);
    if (meaningful.length < 2) return false;
    if (Number.isFinite(confidence) && confidence < 42) return false;
    if (/^(?:[>_<|｜.·•\-—–]+)$/u.test(cleaned)) return false;
    if (window.ReelScribeQualityGuard?.isHallucinatedText?.(cleaned)) return false;
    return true;
  }

  function appendSegment(segments, segment) {
    const previous = segments[segments.length - 1];
    if (previous && similarity(previous.text, segment.text) >= 0.72) {
      previous.end = segment.end;
      if (segment.confidence > previous.confidence) {
        previous.text = segment.text;
        previous.confidence = segment.confidence;
      }
      return;
    }
    segments.push(segment);
  }

  async function startOcr() {
    if (running) return;
    await ensureMetadata();
    const app = window.ReelScribeApp;
    if (!app?.mergeExternalSegments) throw new Error("字幕編輯器尚未準備完成。 ");

    running = true;
    stopRequested = false;
    startButton.disabled = true;
    stopButton.hidden = false;
    stopButton.disabled = false;
    const savedTime = video.currentTime;
    const wasPaused = video.paused;
    video.pause();

    try {
      activeWorker = await createOcrWorker();
      const worker = activeWorker;
      const duration = Number(video.duration) || 0;
      const requestedInterval = Math.max(0.75, Number(intervalSelect?.value) || 1.5);
      const maxFrames = isMobile() ? MAX_MOBILE_FRAMES : MAX_DESKTOP_FRAMES;
      const interval = Math.max(requestedInterval, duration / maxFrames);
      const cropFraction = Math.max(0.25, Math.min(0.7, Number(cropSelect?.value) || 0.45));
      const totalFrames = Math.max(1, Math.min(maxFrames, Math.ceil(duration / interval)));
      const segments = [];

      for (let index = 0; index < totalFrames; index += 1) {
        if (stopRequested) break;
        const time = Math.min(Math.max(0, duration - 0.05), index * interval + Math.min(0.25, interval / 3));
        await seekVideo(time);
        const canvas = captureFrame(cropFraction);
        const baseProgress = 24 + Math.round((index / totalFrames) * 72);
        setStatus(`正在讀取畫面字幕 ${index + 1} / ${totalFrames}`, baseProgress);
        const result = await worker.recognize(canvas);
        const text = normalizeText(result?.data?.text);
        const confidence = Number(result?.data?.confidence) || 0;
        if (acceptableText(text, confidence)) {
          appendSegment(segments, {
            start: time,
            end: Math.min(duration, time + interval),
            text,
            confidence,
            source: "ocr",
          });
        }
        canvas.width = 1;
        canvas.height = 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (stopRequested) {
        setStatus(`已停止畫面讀取，目前取得 ${segments.length} 段。`, 0);
        return;
      }
      if (!segments.length) {
        throw new Error("畫面下方沒有辨識到足夠清楚的文字。可調整讀取範圍或確認影片確實有燒錄字幕。 ");
      }

      app.mergeExternalSegments(segments, {
        sourceLabel: "畫面 OCR",
        replaceOverlapping: Boolean(mergeToggle?.checked),
      });
      setStatus(`畫面讀取完成，共取得 ${segments.length} 段本機 OCR 字幕。`, 100);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), 0);
    } finally {
      try {
        const worker = activeWorker;
        if (worker) await worker.terminate();
      } catch {
        // Worker cleanup is best-effort.
      }
      activeWorker = null;
      try {
        await seekVideo(savedTime);
        if (!wasPaused) await video.play();
      } catch {
        // Restoring playback is optional.
      }
      running = false;
      startButton.disabled = !video?.src;
      stopButton.hidden = true;
      stopButton.disabled = false;
    }
  }

  function updateAvailability() {
    if (startButton) startButton.disabled = !video?.src || running;
  }

  startButton?.addEventListener("click", () => startOcr().catch((error) => setStatus(error.message || "畫面讀取失敗。", 0)));
  stopButton?.addEventListener("click", () => {
    stopRequested = true;
    stopButton.disabled = true;
    setStatus("正在停止畫面讀取…", 0);
  });
  fileInput?.addEventListener("change", () => setTimeout(updateAvailability, 0));
  video?.addEventListener("loadedmetadata", updateAvailability);
  new MutationObserver(updateAvailability).observe(video || document.body, { attributes: true, attributeFilter: ["src"] });
  updateAvailability();

  window.ReelScribeScreenOcr = Object.freeze({
    version: TESSERACT_VERSION,
    start: startOcr,
    stop: () => { stopRequested = true; },
    isRunning: () => running,
    similarity,
    normalizeText,
  });
})();