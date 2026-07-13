(() => {
  "use strict";

  const STABILITY_BUILD = "2026.07.13.8";
  const NativeWorker = window.Worker;
  const modelWorkers = new Set();

  function isMobile() {
    const ua = String(navigator.userAgent || "");
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
      || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints) > 1);
  }

  function isIOS() {
    const ua = String(navigator.userAgent || "");
    return /iPhone|iPad|iPod/i.test(ua)
      || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints) > 1);
  }

  function notify(message) {
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(notify.timer);
      notify.timer = setTimeout(() => { toast.hidden = true; }, 3200);
      return;
    }
    const status = document.querySelector("#url-status");
    if (status) status.textContent = message;
  }

  class ResilientModelWorker extends EventTarget {
    constructor(url, options) {
      super();
      this.url = url;
      this.options = options;
      this.native = null;
      this.backgroundActive = false;
      this.onmessage = null;
      this.onerror = null;
      this.spawn();
      modelWorkers.add(this);
    }

    spawn() {
      if (this.native) return this.native;
      const worker = new NativeWorker(this.url, this.options);
      this.native = worker;
      worker.addEventListener("message", (event) => {
        const data = event.data || {};
        if (["ready", "prepare-error", "error", "result"].includes(data.type)) {
          this.backgroundActive = false;
        }
        const forwarded = new MessageEvent("message", { data: event.data });
        this.dispatchEvent(forwarded);
        if (typeof this.onmessage === "function") this.onmessage(forwarded);
      });
      worker.addEventListener("error", (event) => {
        this.backgroundActive = false;
        const forwarded = new ErrorEvent("error", {
          message: event.message || "Worker error",
          filename: event.filename || "",
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          error: event.error,
        });
        this.dispatchEvent(forwarded);
        if (typeof this.onerror === "function") this.onerror(forwarded);
      });
      return worker;
    }

    reset(reason = "reset") {
      if (this.native) this.native.terminate();
      this.native = null;
      this.backgroundActive = false;
      window.dispatchEvent(new CustomEvent("reelscribe:model-reset", { detail: { reason } }));
    }

    postMessage(message, transfer = []) {
      const data = message || {};

      if (data.type === "prepare" && data.background) {
        this.backgroundActive = true;
      } else if (data.type === "prepare") {
        if (this.backgroundActive) this.reset("foreground-preempted-background");

        // On phones, decoding a selected video and loading an ONNX model at the
        // same time can exceed the Safari/Chromium renderer memory budget. The
        // following transcribe message can load the same model after decode.
        if (isMobile()) {
          window.dispatchEvent(new CustomEvent("reelscribe:model", {
            detail: { type: "deferred", reason: "mobile-serial-load" },
          }));
          return;
        }
      } else if (data.type === "transcribe") {
        if (this.backgroundActive) this.reset("transcription-preempted-background");
        this.backgroundActive = false;
      }

      const worker = this.spawn();
      if (Array.isArray(transfer) && transfer.length) worker.postMessage(message, transfer);
      else worker.postMessage(message);
    }

    terminate() {
      if (this.native) this.native.terminate();
      this.native = null;
      this.backgroundActive = false;
      modelWorkers.delete(this);
    }
  }

  const WorkerProxy = new Proxy(NativeWorker, {
    construct(target, args) {
      const [url, options] = args;
      let resolved = null;
      try {
        resolved = new URL(String(url), document.baseURI);
      } catch {
        return Reflect.construct(target, args);
      }
      if (resolved.origin === location.origin && resolved.pathname.endsWith("/worker.js")) {
        return new ResilientModelWorker(url, options);
      }
      return Reflect.construct(target, args);
    },
  });
  window.Worker = WorkerProxy;

  function cancelBackgroundWork(reason = "user-intent", options = {}) {
    const releaseLoadedOnMobile = options.releaseLoadedOnMobile !== false;
    let cancelled = 0;
    for (const worker of modelWorkers) {
      if (worker.backgroundActive || (releaseLoadedOnMobile && isMobile())) {
        worker.reset(reason);
        cancelled += 1;
      }
    }
    if (cancelled) {
      window.dispatchEvent(new CustomEvent("reelscribe:model", {
        detail: { type: "cancelled", reason, cancelled },
      }));
    }
    return cancelled;
  }

  // Strip one-off cache-buster parameters without navigation or reload.
  try {
    const current = new URL(location.href);
    if (current.searchParams.has("update")) {
      current.searchParams.delete("update");
      history.replaceState(history.state, "", `${current.pathname}${current.search}${current.hash}`);
    }
  } catch {
    // URL cleanup is optional.
  }

  let wrappedApp = null;
  try {
    Object.defineProperty(window, "ReelScribeApp", {
      configurable: true,
      enumerable: true,
      get() { return wrappedApp; },
      set(value) {
        if (!value || typeof value !== "object") {
          wrappedApp = value;
          return;
        }
        wrappedApp = Object.freeze({
          ...value,
          setFile(file) {
            cancelBackgroundWork("programmatic-file-selection", { releaseLoadedOnMobile: true });
            window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "file" } }));
            return value.setFile(file);
          },
          startTranscription(...args) {
            if (window.ReelScribeScreenOcr?.isRunning?.()) {
              notify("畫面 OCR 正在執行，請先停止後再開始語音辨識");
              return false;
            }
            cancelBackgroundWork("foreground-transcription", { releaseLoadedOnMobile: false });
            window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "transcription" } }));
            return value.startTranscription(...args);
          },
          prepareModel(options = {}) {
            if (options.background && (value.getFile?.() || value.isProcessing?.())) return false;
            return value.prepareModel(options);
          },
          cancelBackgroundPreparation(reason = "api-cancel") {
            return cancelBackgroundWork(reason, { releaseLoadedOnMobile: true });
          },
        });
      },
    });
  } catch {
    // The application remains usable if a browser blocks property wrapping.
  }

  document.addEventListener("change", (event) => {
    if (event.target?.id !== "media-file") return;
    cancelBackgroundWork("file-selection", { releaseLoadedOnMobile: true });
    window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "file" } }));
  }, true);

  document.addEventListener("drop", (event) => {
    if (!event.target?.closest?.("#drop-zone")) return;
    cancelBackgroundWork("file-drop", { releaseLoadedOnMobile: true });
    window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "file" } }));
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("button, a, label");
    if (!target) return;

    if (target.id === "start-screen-ocr") {
      if (window.ReelScribeApp?.isProcessing?.()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        notify("語音辨識正在執行，請完成後再讀取畫面字幕");
        return;
      }
      cancelBackgroundWork("ocr-start", { releaseLoadedOnMobile: true });
      window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "ocr" } }));
    }

    if (target.id === "transcribe") {
      if (window.ReelScribeScreenOcr?.isRunning?.()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        notify("畫面 OCR 正在執行，請先停止後再開始語音辨識");
        return;
      }
      cancelBackgroundWork("transcription-button", { releaseLoadedOnMobile: false });
      window.dispatchEvent(new CustomEvent("reelscribe:user-intent", { detail: { type: "transcription" } }));
    }
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !window.ReelScribeApp?.isProcessing?.()) {
      cancelBackgroundWork("page-hidden", { releaseLoadedOnMobile: false });
    }
  });

  window.ReelScribeStability = Object.freeze({
    build: STABILITY_BUILD,
    isMobile,
    isIOS,
    cancelBackgroundWork,
    hasBackgroundWork: () => Array.from(modelWorkers).some((worker) => worker.backgroundActive),
  });

  const input = document.querySelector("#media-file");
  if (!input) return;

  const extensionToMime = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mpg: "video/mpeg",
    mpeg: "video/mpeg",
    ts: "video/mp2t",
    mts: "video/mp2t",
    m2ts: "video/mp2t",
    "3gp": "video/3gpp",
    "3g2": "video/3gpp2",
    ogv: "video/ogg",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    flac: "audio/flac",
    opus: "audio/opus",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    weba: "audio/webm",
    mka: "audio/x-matroska",
    amr: "audio/amr",
    aiff: "audio/aiff",
    aif: "audio/aiff",
    caf: "audio/x-caf",
    wma: "audio/x-ms-wma",
  };

  const acceptedExtensions = Object.keys(extensionToMime).map((extension) => `.${extension}`);
  input.accept = ["video/*", "audio/*", ...acceptedExtensions].join(",");

  function extensionOf(name) {
    return String(name || "").split(".").pop()?.toLowerCase() || "";
  }

  function normalizeFileType(file) {
    if (!file || file.type) return file;
    const mime = extensionToMime[extensionOf(file.name)];
    if (!mime) return file;
    return new File([file], file.name, {
      type: mime,
      lastModified: file.lastModified,
    });
  }

  function replaceInputFile(file) {
    if (!file || typeof DataTransfer === "undefined") return false;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return true;
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file || file.type) return;
    const normalized = normalizeFileType(file);
    if (normalized === file) return;
    replaceInputFile(normalized);
  }, true);

  const dropZone = document.querySelector("#drop-zone");
  dropZone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file || file.type) return;
    const normalized = normalizeFileType(file);
    if (normalized === file || !replaceInputFile(normalized)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, true);

  if (dropZone && !dropZone.querySelector(".format-compat-note")) {
    const note = document.createElement("small");
    note.className = "format-compat-note";
    note.textContent = "支援常見影音格式；實際可解碼範圍依 Safari、Chrome、Edge 與裝置編解碼器而定。";
    dropZone.appendChild(note);
  }

  window.ReelScribeFormatSupport = Object.freeze({
    extensions: Object.freeze([...acceptedExtensions]),
    mimeTypes: Object.freeze({ ...extensionToMime }),
    normalizeFileType,
  });
})();