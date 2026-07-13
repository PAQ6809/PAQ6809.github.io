(() => {
  "use strict";

  const QUALITY_BUILD = "2026.07.13.9";

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
  const resultStats = document.querySelector("#result-stats");
  const progressPanel = document.querySelector("#progress-panel");
  const progressTitle = document.querySelector("#progress-title");
  const progressDetail = document.querySelector("#progress-detail");
  const progressBar = document.querySelector("#progress-bar");
  const progressNote = document.querySelector("#progress-note");
  const modelSelect = document.querySelector("#model-select");
  const suppressMusic = document.querySelector("#suppress-music");

  document.documentElement.classList.add("js");
  if (status) status.setAttribute("aria-atomic", "true");

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
    const small = modelSelect.querySelector('option[value="onnx-community/whisper-small"]');
    const turbo = modelSelect.querySelector('option[value="onnx-community/whisper-large-v3-turbo"]');

    if (smart) smart.textContent = "智慧模式（自動選 Turbo／Small／Base／Tiny）";
    if (tiny) tiny.textContent = "極速模式 · Whisper Tiny（長影片／手機）";
    if (base) base.textContent = "平衡模式 · Whisper Base（一般短片）";

    if (small) {
      small.textContent = "精準模式 · Whisper Small（桌機 WebGPU）";
      small.disabled = profile.mobile || !profile.gpuAvailable;
      if (small.disabled) small.textContent += " · 此裝置改用智慧模式";
    }

    if (turbo) {
      const slowNetwork = /(^|-)2g$/.test(profile.effectiveType) || profile.effectiveType === "slow-2g";
      const capable = !profile.mobile
        && profile.gpuAvailable
        && !profile.saveData
        && !slowNetwork
        && (profile.memory >= 8 || profile.cores >= 8);
      turbo.textContent = "旗艦模式 · Large-v3-turbo（桌機 WebGPU，首次下載較大）";
      turbo.disabled = !capable;
      if (turbo.disabled) turbo.textContent += " · 此裝置不建議";
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

  function wordTokens(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
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

  function tokenRepetitionMetrics(value) {
    const tokens = wordTokens(value);
    const count = tokens.length;
    if (!count) {
      return {
        count: 0,
        dominantRatio: 0,
        uniqueRatio: 1,
        longestRun: 0,
        repeatedNgramCount: 0,
        repeatedNgramCoverage: 0,
      };
    }

    const frequency = new Map();
    let longestRun = 0;
    let currentRun = 0;
    let previous = "";
    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) || 0) + 1);
      if (token === previous) currentRun += 1;
      else {
        previous = token;
        currentRun = 1;
      }
      longestRun = Math.max(longestRun, currentRun);
    }

    let repeatedNgramCount = 0;
    let repeatedNgramCoverage = 0;
    const maxSize = Math.min(4, Math.floor(count / 3));
    for (let size = 1; size <= maxSize; size += 1) {
      const grams = new Map();
      for (let index = 0; index <= count - size; index += 1) {
        const key = tokens.slice(index, index + size).join("\u0001");
        grams.set(key, (grams.get(key) || 0) + 1);
      }
      const best = grams.size ? Math.max(...grams.values()) : 0;
      const coverage = Math.min(1, (best * size) / count);
      if (coverage > repeatedNgramCoverage) {
        repeatedNgramCoverage = coverage;
        repeatedNgramCount = best;
      }
    }

    return {
      count,
      dominantRatio: Math.max(...frequency.values()) / count,
      uniqueRatio: frequency.size / count,
      longestRun,
      repeatedNgramCount,
      repeatedNgramCoverage,
    };
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
    const tokenMetrics = tokenRepetitionMetrics(value);

    if (length >= 12 && meaningful.length === 0) return true;
    if (longestRun >= 8) return true;
    if (length >= 16 && uniqueRatio <= 0.08) return true;
    if (length >= 20 && dominantRatio >= 0.55) return true;
    if (length >= 24 && smallestRepeatingUnit(value)) return true;
    if (length >= 30 && bigramDiversity <= 0.1) return true;
    if (length >= 30 && symbolRatio >= 0.8 && uniqueRatio <= 0.15) return true;
    if (tokenMetrics.count >= 8 && tokenMetrics.dominantRatio >= 0.5) return true;
    if (tokenMetrics.count >= 10 && tokenMetrics.uniqueRatio <= 0.28) return true;
    if (tokenMetrics.longestRun >= 5) return true;
    if (
      tokenMetrics.count >= 12
      && tokenMetrics.repeatedNgramCount >= 3
      && tokenMetrics.repeatedNgramCoverage >= 0.72
    ) return true;
    return false;
  }

  function fallbackOcrGarbageCheck(value) {
    const text = String(value || "").normalize("NFKC").trim();
    const characters = Array.from(text.replace(/\s/gu, ""));
    if (characters.length < 2) return true;
    let letters = 0;
    let digits = 0;
    let symbols = 0;
    let oneLetterWords = 0;
    for (const character of characters) {
      if (/\p{Letter}/u.test(character)) letters += 1;
      else if (/\p{Number}/u.test(character)) digits += 1;
      else symbols += 1;
    }
    const latinWords = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
    oneLetterWords = latinWords.filter((word) => word.replace(/['’]/g, "").length <= 1).length;
    const noiseRatio = (digits + symbols) / Math.max(1, characters.length);
    const shortLatinRatio = latinWords.length ? oneLetterWords / latinWords.length : 0;
    return letters < 2 || noiseRatio > 0.45 || (latinWords.length >= 4 && shortLatinRatio > 0.45);
  }

  function isBadOcrText(value, confidence = 100) {
    const guard = window.ReelScribeScreenOcr;
    if (guard?.isAcceptableText) return !guard.isAcceptableText(value, confidence, "auto");
    return fallbackOcrGarbageCheck(value);
  }

  function resultContainsOcr(result) {
    return /OCR/i.test(String(result?.externalSource || result?.modelLabel || ""))
      || (Array.isArray(result?.segments) && result.segments.some((segment) => segment?.source === "ocr"));
  }

  function isBadSavedResult(saved) {
    const result = saved?.result;
    if (!result) return false;
    if (isHallucinatedText(result.text)) return true;
    if (!resultContainsOcr(result)) return false;
    const ocrSegments = Array.isArray(result.segments) ? result.segments.filter((segment) => segment?.source === "ocr") : [];
    if (ocrSegments.length) {
      const valid = ocrSegments.filter((segment) => !isBadOcrText(segment.text, Number(segment.confidence) || 100));
      if (!valid.length || valid.length / ocrSegments.length < 0.5) return true;
    }
    return isBadOcrText(result.text, 100);
  }

  function clearBadSavedResult() {
    try {
      const raw = localStorage.getItem("reelscribe:last");
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!isBadSavedResult(saved)) return false;
      localStorage.removeItem("reelscribe:last");
      return true;
    } catch {
      return false;
    }
  }

  function suppressLowConfidenceResult() {
    const value = transcript?.value || "";
    const ocrResult = /OCR/i.test(resultStats?.textContent || "");
    const badOcr = ocrResult && isBadOcrText(value, 100);
    if (!isHallucinatedText(value) && !badOcr) return false;

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
      status.textContent = badOcr
        ? "畫面 OCR 只取得混合符號、數字或不符合語言的低可信文字，已自動清除。請縮小讀取範圍或提高影片畫質。"
        : "偵測到重複單字、短句、符號或字元，已自動清除低可信字幕。請指定正確語言、開啟語音強化，或改用畫面 OCR。";
    }
    if (progressPanel) progressPanel.hidden = false;
    if (progressTitle) progressTitle.textContent = "已攔截低可信字幕";
    if (progressDetail) progressDetail.textContent = badOcr ? "OCR 輸出不符合所選語言" : "偵測到模型反覆輸出相同單字或短句";
    if (progressBar) progressBar.style.width = "0%";
    if (progressNote) {
      progressNote.textContent = badOcr
        ? "網站不會把 x、數字、百分比與隨機符號混合內容當成畫面字幕。"
        : "網站不會把 I'm、>>、單一中文字或重複片語當成完成字幕。";
    }
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
      if (!results.hidden) queueMicrotask(suppressLowConfidenceResult);
    }).observe(results, { attributes: true, attributeFilter: ["hidden"] });
  }

  installModelChoices();
  clearBadSavedResult();
  queueMicrotask(suppressLowConfidenceResult);

  const viewport = window.visualViewport;
  if (viewport) {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(viewport.height)}px`);
    };
    viewport.addEventListener("resize", setViewportHeight, { passive: true });
    setViewportHeight();
  }

  window.ReelScribeQualityGuard = Object.freeze({
    isHallucinatedText,
    isBadOcrText,
    tokenRepetitionMetrics,
    browserProfile,
    build: QUALITY_BUILD,
  });
})();