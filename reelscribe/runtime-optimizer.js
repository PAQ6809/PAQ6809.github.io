(() => {
  "use strict";

  const BUILD = "2026.07.13.8";
  const MB = 1024 * 1024;
  const MOBILE_PREFETCH_MIN = 260 * MB;
  const DESKTOP_PREFETCH_MIN = 420 * MB;
  const HARD_PRESSURE_RATIO = 0.82;
  const PREPARE_TIMEOUT_MS = 3 * 60 * 1000;
  const status = document.querySelector("#model-cache-status");
  const statusCopy = document.querySelector("#model-cache-copy");
  const prepareButton = document.querySelector("#prepare-model");
  const clearButton = document.querySelector("#clear-model-cache");
  const fileInput = document.querySelector("#media-file");
  let preparing = false;
  let prepared = false;
  let prepareTimeout = null;
  let idleHandle = null;
  let fallbackTimer = null;

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
    return window.ReelScribeStability?.isMobile?.() ?? /Android|iPhone|iPad|iPod|Mobile/i.test(String(navigator.userAgent || ""));
  }

  function isIOS() {
    return window.ReelScribeStability?.isIOS?.() ?? /iPhone|iPad|iPod/i.test(String(navigator.userAgent || ""));
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
      if (!navigator.storage?.persist || isIOS()) return false;
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
      return battery.charging || battery.level >= 0.35;
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

  function cancelScheduledPreparation() {
    if (idleHandle !== null && "cancelIdleCallback" in window) cancelIdleCallback(idleHandle);
    if (fallbackTimer !== null) clearTimeout(fallbackTimer);
    idleHandle = null;
    fallbackTimer = null;
  }

  function clearPrepareTimeout() {
    if (prepareTimeout) clearTimeout(prepareTimeout);
    prepareTimeout = null;
  }

  function cancelPreparation(reason = "cancelled", message = "背景模型準備已停止，開始辨識時會按需載入。") {
    cancelScheduledPreparation();
    clearPrepareTimeout();
    const hadBackgroundWork = preparing || window.ReelScribeStability?.hasBackgroundWork?.();
    // Mark idle before terminating the Worker because reset events are synchronous.
    preparing = false;
    document.documentElement.classList.remove("model-loading");
    if (hadBackgroundWork) {
      window.ReelScribeApp?.cancelBackgroundPreparation?.(reason);
      window.ReelScribeStability?.cancelBackgroundWork?.(reason, { releaseLoadedOnMobile: false });
    }
    if (message) setStatus(message, "warning");
  }

  function startPrepareTimeout() {
    clearPrepareTimeout();
    prepareTimeout = setTimeout(() => {
      if (!preparing) return;
      cancelPreparation("prepare-timeout", "背景模型準備逾時，已立即停止下載，避免長時間占用記憶體。開始辨識時會重新載入較小模型。");
    }, PREPARE_TIMEOUT_MS);
  }

  async function prepareModel({ force = false } = {}) {
    if (preparing || prepared) return false;
    const app = window.ReelScribeApp;
    if (!app?.prepareModel) return false;
    if (app.getFile?.() || app.isProcessing?.()) {
      setStatus("已選擇影片或正在處理；不會再同時啟動背景模型下載。開始辨識時將依序載入。", "warning");
      return false;
    }

    const network = connectionProfile();
    const storage = await updateStoragePolicy();
    if (!force && isMobile()) {
      setStatus("行動裝置已停用自動背景下載，避免模型與影片解碼同時占用記憶體；開始辨識後會依序載入 Tiny 模型。", "ready");
      return false;
    }
    if (!force && (network.saveData || network.slow)) {
      setStatus("已偵測到省流量或慢速網路，暫不在背景下載模型。開始辨識時才會按需載入。", "warning");
      return false;
    }
    if (!force && storage.constrained) {
      setStatus(`瀏覽器可用空間約 ${formatBytes(storage.available)}，已停止背景下載並切換節省空間模式。`, "warning");
      return false;
    }
    if (!force && !(await batteryAllowsBackgroundWork())) {
      setStatus("電量偏低且未充電，已延後背景下載。", "warning");
      return false;
    }
    if (!force && document.visibilityState !== "visible") return false;

    preparing = true;
    document.documentElement.classList.add("model-loading");
    const model = preferredModel();
    setStatus(`${model.endsWith("tiny") ? "極速" : "平衡"}模型正在背景準備；選擇影片時會立即中止背景下載，避免資源衝突。`, "idle");
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
      if (!preparing) return;
      const progress = Number.isFinite(detail.progress) ? Math.round(detail.progress) : 0;
      setStatus(`背景模型下載中 ${progress}% · ${detail.file || "模型檔案"}`, "idle");
      return;
    }
    if (detail.type === "ready") {
      clearPrepareTimeout();
      preparing = false;
      prepared = true;
      document.documentElement.classList.remove("model-loading");
      setStatus(`${detail.modelLabel || "字幕模型"}已準備完成。`, "ready");
      return;
    }
    if (["error", "cancelled", "deferred"].includes(detail.type)) {
      clearPrepareTimeout();
      preparing = false;
      document.documentElement.classList.remove("model-loading");
      if (detail.type === "deferred") {
        setStatus("行動裝置採用穩定模式：先完成影片解碼，再載入字幕模型。", "ready");
      } else {
        setStatus("背景模型已停止；前景辨識會使用單一模型工作流程重新載入。", "warning");
      }
    }
  }

  async function clearModelCaches() {
    if (!confirm("要清除 ReelScribe 的 AI 模型與 OCR 快取嗎？網站介面與字幕文字不會被刪除。")) return;
    cancelPreparation("cache-clear", "正在清除 AI 模型快取…");
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
    cancelScheduledPreparation();
    if (isMobile()) {
      setStatus("手機穩定模式已啟用：不會在首頁自動下載模型，避免 Safari 因模型與影片同時載入而重新啟動頁面。", "ready");
      return;
    }
    const run = () => {
      idleHandle = null;
      fallbackTimer = null;
      if (window.ReelScribeApp?.getFile?.() || window.ReelScribeApp?.isProcessing?.()) return;
      prepareModel().catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      idleHandle = requestIdleCallback(run, { timeout: 12000 });
    } else {
      fallbackTimer = setTimeout(run, 8000);
    }
  }

  async function showInitialStorage() {
    const state = await updateStoragePolicy();
    if (isMobile()) {
      setStatus("手機將在影片解碼完成後才載入字幕模型，避免兩個大型工作同時進行。", "ready");
      return;
    }
    if (state.quota > 0) {
      setStatus(`瀏覽器可用空間約 ${formatBytes(state.available)}。桌機空間足夠時才會在背景準備較小模型。`, state.constrained ? "warning" : "idle");
    }
  }

  function onUserIntent() {
    cancelPreparation("user-intent", "已停止背景模型工作，避免與影片、OCR 或前景辨識衝突。");
  }

  window.addEventListener("reelscribe:model", onModelEvent);
  window.addEventListener("reelscribe:model-reset", () => {
    if (!preparing) return;
    clearPrepareTimeout();
    preparing = false;
    document.documentElement.classList.remove("model-loading");
    setStatus("背景模型 Worker 已釋放，前景處理將重新建立單一 Worker。", "warning");
  });
  window.addEventListener("reelscribe:user-intent", onUserIntent);
  fileInput?.addEventListener("change", onUserIntent, true);
  prepareButton?.addEventListener("click", () => prepareModel({ force: true }));
  clearButton?.addEventListener("click", clearModelCaches);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !window.ReelScribeApp?.isProcessing?.()) {
      cancelPreparation("page-hidden", "頁面已進入背景，已停止非必要模型下載以節省記憶體。");
    }
  });
  window.addEventListener("pagehide", () => {
    if (!window.ReelScribeApp?.isProcessing?.()) cancelPreparation("pagehide", "");
  });
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
    cancelPreparation,
    cancelScheduledPreparation,
    isPreparing: () => preparing,
  });
})();