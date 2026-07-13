(() => {
  "use strict";

  const QUALITY_BUILD = "2026.07.13.6";

  const fallback = document.querySelector("#fallback-tools");
  const focusUpload = document.querySelector("#focus-upload");
  const fileInput = document.querySelector("#media-file");
  const transcribe = document.querySelector("#transcribe");
  const resolveButton = document.querySelector("#check-url");
  const status = document.querySelector("#url-status");
  const results = document.querySelector("#results");
  const transcript = document.querySelector("#full-transcript");
  const segments = document.querySelector("#segments");
  const segmentCount = document.querySelector("#segment-count");
  const progressPanel = document.querySelector("#progress-panel");
  const progressTitle = document.querySelector("#progress-title");
  const progressDetail = document.querySelector("#progress-detail");
  const progressBar = document.querySelector("#progress-bar");
  const progressNote = document.querySelector("#progress-note");
  const modelSelect = document.querySelector("#model-select");
  const suppressMusic = document.querySelector("#suppress-music");

  document.documentElement.classList.add("js");
  if (status) status.setAttribute("aria-atomic", "true");

  function refreshServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      const key = `reelscribe:quality-reload:${QUALITY_BUILD}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    });

    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register(`./sw.js?v=${QUALITY_BUILD}`, {
          scope: "./",
          updateViaCache: "none",
        });
        await registration.update();
      } catch {
        // Quality checks still work without offline caching.
      }
    });
  }

  function browserProfile() {
    const userAgent = String(navigator.userAgent || "");
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
      || (/Macintosh/i.test(userAgent) && Number(navigator.maxTouchPoints) > 1);
    const memory = Number(navigator.deviceMemory) || 0;
    const cores = Number(navigator.hardwareConcurrency) || 2;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      mobile,
      memory,
      cores,
      gpuAvailable: Boolean(navigator.gpu),
      saveData: Boolean(connection?.saveData),
      effectiveType: String(connection?.effectiveType || ""),
    };
  }

  function installModelChoices() {
    if (!modelSelect) return;
    const profile = browserProfile();
    const smart = modelSelect.querySelector('option[value="smart"]');
    const tiny = modelSelect.querySelector('option[value="onnx-community/whisper-tiny"]');
    const base = modelSelect.querySelector('option[value="onnx-community/whisper-base"]');
    if (smart) smart.textContent = "智慧模式（自動選 Turbo／Small／Base／Tiny）";
    if (tiny) tiny.textContent = "極速模式 · Whisper Tiny（長影片／手機）";
    if (base) base.textContent = "平衡模式 · Whisper Base（一般短片）";

    if (!modelSelect.querySelector('option[value="onnx-community/whisper-small"]')) {
      const accurate = document.createElement("option");
      accurate.value = "onnx-community/whisper-small";
      accurate.textContent = "精準模式 · Whisper Small（桌機 WebGPU）";
      accurate.disabled = profile.mobile || !profile.gpuAvailable;
      if (accurate.disabled) accurate.textContent += " · 此裝置改用智慧模式";
      modelSelect.appendChild(accurate);
    }

    if (!modelSelect.querySelector('option[value="onnx-community/whisper-large-v3-turbo"]')) {
      const turbo = document.createElement("option");
      turbo.value = "onnx-community/whisper-large-v3-turbo";
      turbo.textContent = "旗艦模式 · Large-v3-turbo（桌機 WebGPU，首次下載較大）";
      const slowNetwork = /(^|-)2g$/.test(profile.effectiveType) || profile.effectiveType === "slow-2g";
      const capable = !profile.mobile
        && profile.gpuAvailable
        && !profile.saveData
        && !slowNetwork
        && (profile.memory >= 8 || profile.cores >= 8);
      turbo.disabled = !capable;
      if (turbo.disabled) turbo.textContent += " · 此裝置不建議";
      modelSelect.appendChild(turbo);
    }
  }

  function openFallback() {
    if (fallback) fallback.open = true;
  }

  function compactCharacters(value) {
    return Array.from(String(value || "").normalize("NFKC").replace(/\s/gu, ""));
  }

  function meaningfulCharacters(value) {
    return Array.from(String(value || "").normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, ""));
  }

  function smallestRepeatingUnit(value, maxUnit = 12) {
    const compact = compactCharacters(value).join("");
    if (compact.length < 12) return "";
    const limit = Math.min(maxUnit, Math.floor(compact.length / 3));
    for (let size = 1; size <= limit; size += 1) {
      const unit = compact.slice(0, size);
      let matched = 0;
      for (let index = 0; index < compact.length; index += 1) {
        if (compact[index] === unit[index % size]) matched += 1;
      }
      if (matched / compact.length >= 0.9) return unit;
    }
    return "";
  }

  function isHallucinatedText(value) {
    const compact = compactCharacters(value);
    const meaningful = meaningfulCharacters(value);
    const length = compact.length;
    if (!length) return false;

    const frequency = new Map();
    let longestRun = 0;
    let currentRun = 0;
    let previous = "";
    for (const character of compact) {
      frequency.set(character, (frequency.get(character) || 0) + 1);
      if (character === previous) currentRun += 1;
      else {
        previous = character;
        currentRun = 1;
      }
      longestRun = Math.max(longestRun, currentRun);
    }

    const dominantRatio = Math.max(...frequency.values()) / length;
    const uniqueRatio = frequency.size / length;
    const symbolRatio = (length - meaningful.length) / length;
    const bigrams = [];
    for (let index = 0; index < length - 1; index += 1) bigrams.push(`${compact[index]}${compact[index + 1]}`);
    const bigramDiversity = bigrams.length ? new Set(bigrams).size / bigrams.length : 1;

    if (length >= 12 && meaningful.length === 0) return true;
    if (longestRun >= 8) return true;
    if (length >= 16 && uniqueRatio <= 0.08) return true;
    if (length >= 20 && dominantRatio >= 0.55) return true;
    if (length >= 24 && smallestRepeatingUnit(value)) return true;
    if (length >= 30 && bigramDiversity <= 0.1) return true;
    return length >= 30 && symbolRatio >= 0.8 && uniqueRatio <= 0.15;
  }

  function clearBadSavedResult() {
    try {
      const raw = localStorage.getItem("reelscribe:last");
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!isHallucinatedText(saved?.result?.text)) return false;
      localStorage.removeItem("reelscribe:last");
      return true;
    } catch {
      return false;
    }
  }

  function suppressHallucinatedResult() {
    const value = transcript?.value || "";
    if (!isHallucinatedText(value)) return false;

    try {
      localStorage.removeItem("reelscribe:last");
    } catch {
      // Private mode may disable storage.
    }

    if (transcript) transcript.value = "";
    if (segments) segments.innerHTML = "";
    if (segmentCount) segmentCount.textContent = "0 段";
    if (results) results.hidden = true;
    if (status) {
      status.className = "inline-status error";
      status.textContent = "偵測到大量重複符號或文字，已自動清除低可信字幕。請開啟語音強化並指定正確語言後重試。";
    }
    if (progressPanel) progressPanel.hidden = false;
    if (progressTitle) progressTitle.textContent = "已攔截低可信字幕";
    if (progressDetail) progressDetail.textContent = "偵測到模型重複符號或文字";
    if (progressBar) progressBar.style.width = "0%";
    if (progressNote) progressNote.textContent = "網站不會再把 >>、單一字元或重複片語當成完成字幕。";
    if (suppressMusic) suppressMusic.checked = true;
    openFallback();
    return true;
  }

  focusUpload?.addEventListener("click", openFallback, true);
  fileInput?.addEventListener("change", () => {
    if (fileInput.files?.length) openFallback();
  }, true);
  transcribe?.addEventListener("click", openFallback, true);

  if (resolveButton) {
    const syncBusyState = () => {
      const busy = resolveButton.disabled && /搜尋|取得|處理|查詢|解析/.test(resolveButton.textContent || "");
      resolveButton.setAttribute("aria-busy", String(busy));
    };
    new MutationObserver(syncBusyState).observe(resolveButton, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["disabled"],
    });
    syncBusyState();
  }

  if (results) {
    new MutationObserver(() => {
      if (!results.hidden) queueMicrotask(suppressHallucinatedResult);
    }).observe(results, { attributes: true, attributeFilter: ["hidden"] });
  }

  installModelChoices();
  clearBadSavedResult();
  queueMicrotask(suppressHallucinatedResult);
  refreshServiceWorker();

  const viewport = window.visualViewport;
  if (viewport) {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(viewport.height)}px`);
    };
    viewport.addEventListener("resize", setViewportHeight, { passive: true });
    setViewportHeight();
  }

  window.ReelScribeQualityGuard = Object.freeze({ isHallucinatedText, browserProfile });
})();