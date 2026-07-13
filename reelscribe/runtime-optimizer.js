(() => {
  "use strict";

  const BUILD = "2026.07.13.7";
  const MB = 1024 * 1024;
  const MOBILE_PREFETCH_MIN = 220 * MB;
  const DESKTOP_PREFETCH_MIN = 420 * MB;
  const HARD_PRESSURE_RATIO = 0.86;
  const PREPARE_TIMEOUT_MS = 5 * 60 * 1000;
  const status = document.querySelector("#model-cache-status");
  const statusCopy = document.querySelector("#model-cache-copy");
  const prepareButton = document.querySelector("#prepare-model");
  const clearButton = document.querySelector("#clear-model-cache");
  let preparing = false;
  let prepared = false;
  let prepareTimeout = null;

  function setStatus(message, state = "idle") {
    if (statusCopy) statusCopy.textContent = message;
    if (status) status.dataset.state = state;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "未知";
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${Math.round(bytes / MB)} MB`;
  }

  function isMobile() {
    const ua = String(navigator.userAgent || "");
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
      || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints) > 1);
  }

  function connectionProfile() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = String(connection?.effectiveType || "");
    return {
      saveData: Boolean(connection?.saveData),
      slow: effectiveType === "slow-2g" || /(^|-)2g$/.test(effectiveType),
      effectiveType,
    };
  }

  async function storageState() {
    let usage = 0;
    let quota = 0;
    let persisted = false;
    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        usage = Number(estimate.usage) || 0;
        quota = Number(estimate.quota) || 0;
      }
      if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
    } catch {
      // Storage estimates are optional and may be hidden by the browser.
    }
    const available = Math.max(0, quota - usage);
    const usageRatio = quota > 0 ? usage / quota : 0;
    const threshold = isMobile() ? MOBILE_PREFETCH_MIN : DESKTOP_PREFETCH_MIN;
    const constrained = quota > 0 && (available < threshold || usageRatio >= HARD_PRESSURE_RATIO);
    return { usage, quota, available, usageRatio, persisted, constrained, threshold };
  }

  async function requestPersistence() {
    try {
      if (!navigator.storage?.persist) return false;
      if (await navigator.storage.persisted?.()) return true;
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }

  async function batteryAllowsBackgroundWork() {
    try {
      if (!navigator.getBattery) return true;
      const battery = await navigator.getBattery();
      return battery.charging || battery.level >= 0.25;
    } catch {
      return true;
    }
  }

  function preferredModel() {
    if (isMobile()) return "onnx-community/whisper-tiny";
    if (navigator.gpu) return "onnx-community/whisper-base";
    return "onnx-community/whisper-tiny";
  }

  async function updateStoragePolicy() {
    const state = await storageState();
    const app = window.ReelScribeApp;
    app?.setStoragePolicy?.({
      constrained: state.constrained,
      cacheAllowed: !state.constrained,
      availableBytes: state.available,
      quotaBytes: state.quota,
    });
    return state;
  }

  function clearPrepareTimeout() {
    if (prepareTimeout) clearTimeout(prepareTimeout);
    prepareTimeout = null;
  }

  function startPrepareTimeout() {
    clearPrepareTimeout();
    prepareTimeout = setTimeout(() => {
      if (!preparing) return;
      preparing = false;
      document.documentElement.classList.remove("model-loading");
      setStatus("背景模型準備時間較長，已停止等待狀態；開始辨識時會接續使用或自動重試。", "warning");
    }, PREPARE_TIMEOUT_MS);
  }

  async function prepareModel({ force = false } = {}) {
    if (preparing || prepared) return false;
    const app = window.ReelScribeApp;
    if (!app?.prepareModel) return false;

    const network = connectionProfile();
    const storage = await updateStoragePolicy();
    if (!force && (network.saveData || network.slow)) {
      setStatus("已偵測到省流量或慢速網路，暫不在背景下載模型。開始辨識時才會按需載入。", "warning");
      return false;
    }
    if (!force && storage.constrained) {
      setStatus(`瀏覽器可用空間約 ${formatBytes(storage.available)}，已停止背景下載並切換節省空間模式，避免增加頁面被系統回收的風險。`, "warning");
      return false;
    }
    if (!force && !(await batteryAllowsBackgroundWork())) {
      setStatus("電量偏低且未充電，已延後背景下載；開始辨識時仍可正常載入。", "warning");
      return false;
    }
    if (!force && document.visibilityState !== "visible") return false;

    preparing = true;
    document.documentElement.classList.add("model-loading");
    const model = preferredModel();
    setStatus(`${model.endsWith("tiny") ? "極速" : "平衡"}模型正在背景準備；頁面可繼續操作。`, "idle");
    try {
      await requestPersistence();
      const started = app.prepareModel({
        model,
        duration: isMobile() ? 60 * 60 : 8 * 60,
        preferGpu: Boolean(navigator.gpu),
        background: true,
        cacheAllowed: !storage.constrained,
      });
      if (!started) throw new Error("背景準備尚未啟動");
      startPrepareTimeout();
      return true;
    } catch (error) {
      clearPrepareTimeout();
      preparing = false;
      document.documentElement.classList.remove("model-loading");
      setStatus(`背景模型準備已略過：${error instanceof Error ? error.message : String(error)}`, "warning");
      return false;
    }
  }

  function onModelEvent(event) {
    const detail = event.detail || {};
    if (detail.type === "download") {
      const progress = Number.isFinite(detail.progress) ? Math.round(detail.progress) : 0;
      setStatus(`背景模型下載中 ${progress}% · ${detail.file || "模型檔案"}`, "idle");
      return;
    }
    if (detail.type === "ready") {
      clearPrepareTimeout();
      preparing = false;
      prepared = true;
      document.documentElement.classList.remove("model-loading");
      setStatus(`${detail.modelLabel || "字幕模型"}已準備完成，之後開始辨識可直接使用。`, "ready");
      return;
    }
    if (detail.type === "error") {
      clearPrepareTimeout();
      preparing = false;
      document.documentElement.classList.remove("model-loading");
      setStatus("背景模型未能完成，開始辨識時會自動重試並降級。", "warning");
    }
  }

  async function clearModelCaches() {
    if (!confirm("要清除 ReelScribe 的 AI 模型與 OCR 快取嗎？網站介面與字幕文字不會被刪除。")) return;
    if (clearButton) clearButton.disabled = true;
    setStatus("正在清除 AI 模型快取…", "idle");
    let removed = 0;
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          if (/transformers|huggingface|onnx|tesseract|model/i.test(key)) {
            if (await caches.delete(key)) removed += 1;
          }
        }
      }
      if (window.indexedDB?.databases) {
        const databases = await window.indexedDB.databases();
        for (const database of databases) {
          const name = String(database.name || "");
          if (!/transformers|huggingface|onnx|tesseract|model/i.test(name)) continue;
          await new Promise((resolve) => {
            const request = window.indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          });
          removed += 1;
        }
      }
      prepared = false;
      const state = await updateStoragePolicy();
      setStatus(`已清除 ${removed} 個 AI 快取區。現在可用空間約 ${formatBytes(state.available)}。`, "ready");
    } catch (error) {
      setStatus(`無法完整清除快取：${error instanceof Error ? error.message : String(error)}`, "warning");
    } finally {
      if (clearButton) clearButton.disabled = false;
    }
  }

  function scheduleIdlePreparation() {
    const run = () => prepareModel().catch(() => {});
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 6000 });
    } else {
      setTimeout(run, 3500);
    }
  }

  async function showInitialStorage() {
    const state = await updateStoragePolicy();
    if (state.quota > 0) {
      setStatus(`瀏覽器可用空間約 ${formatBytes(state.available)}。空間足夠時會在背景準備較小的字幕模型。`, state.constrained ? "warning" : "idle");
    }
  }

  window.addEventListener("reelscribe:model", onModelEvent);
  prepareButton?.addEventListener("click", () => prepareModel({ force: true }));
  clearButton?.addEventListener("click", clearModelCaches);
  window.addEventListener("pageshow", () => {
    showInitialStorage().catch(() => {});
    scheduleIdlePreparation();
  }, { once: true });

  window.ReelScribeRuntime = Object.freeze({
    build: BUILD,
    storageState,
    updateStoragePolicy,
    prepareModel,
    clearModelCaches,
    isPreparing: () => preparing,
  });
})();