(() => {
  "use strict";

  const API_BASE = "https://vite-xi-one-59.vercel.app";
  const MAX_MEDIA_BYTES = 300 * 1024 * 1024;
  const input = document.querySelector("#ig-url");
  const resolveButton = document.querySelector("#check-url");
  const status = document.querySelector("#url-status");
  const fallback = document.querySelector("#fallback-tools");
  const fileInput = document.querySelector("#media-file");
  const transcribeButton = document.querySelector("#transcribe");
  const openSource = document.querySelector("#open-instagram");
  const verifiedActions = document.querySelector("#verified-link-actions");

  if (!input || !resolveButton || !status || !fileInput || !transcribeButton) return;

  let running = false;

  function parseInstagram(raw) {
    try {
      const url = new URL(String(raw || "").trim());
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const match = url.pathname.match(/^\/(?:[^/]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
      if (url.protocol !== "https:" || (host !== "instagram.com" && host !== "m.instagram.com") || !match) return null;
      const kind = match[1].toLowerCase() === "reels" ? "reel" : match[1].toLowerCase();
      return {
        shortcode: match[2],
        canonicalUrl: `https://www.instagram.com/${kind}/${match[2]}/`,
      };
    } catch {
      return null;
    }
  }

  function setStatus(message, type = "") {
    status.className = "inline-status";
    if (type) status.classList.add(type);
    status.textContent = message;
  }

  function updateProvider(state, detail) {
    const log = document.querySelector("#provider-log");
    if (!log) return;
    log.hidden = false;
    let chip = [...log.children].find((node) => node.dataset.name === "Instagram 公開影片");
    if (!chip) {
      chip = document.createElement("span");
      chip.dataset.name = "Instagram 公開影片";
      log.appendChild(chip);
    }
    chip.className = `provider-chip ${state}`;
    chip.textContent = `Instagram 公開影片 · ${detail}`;
  }

  async function readJson(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || `HTTP ${response.status}`);
    }
  }

  async function callResolver(path, canonicalUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), path.includes("instagram-yt") ? 45_000 : 15_000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ url: canonicalUrl }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);
      if (!response.ok || !data?.ok || !Array.isArray(data.media) || !data.media.length) {
        const error = new Error(data?.message || "Instagram 沒有提供可匿名讀取的公開影片。");
        error.code = data?.error || `HTTP_${response.status}`;
        throw error;
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Instagram 解析逾時，請再試一次。");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function resolveMedia(canonicalUrl) {
    const errors = [];
    updateProvider("running", "快速解析");
    try {
      return await callResolver("/api/instagram-resolve", canonicalUrl);
    } catch (error) {
      errors.push(error);
    }

    updateProvider("running", "相容解析");
    setStatus("正在切換 Instagram 相容解析器…", "ok");
    try {
      return await callResolver("/api/instagram-yt", canonicalUrl);
    } catch (error) {
      errors.push(error);
    }

    const useful = errors.map((error) => error?.message).filter(Boolean).at(-1);
    throw new Error(useful || "Instagram 沒有向匿名服務提供可讀取的公開影片。");
  }

  async function fetchMediaFile(media, shortcode) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3 * 60 * 1000);
    try {
      const response = await fetch(media.proxyUrl, {
        method: "GET",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Instagram 影片串流失敗（HTTP ${response.status}）。`);

      const total = Number(response.headers.get("content-length"));
      if (Number.isFinite(total) && total > MAX_MEDIA_BYTES) throw new Error("Instagram 影片超過 300 MB 安全上限。");
      const type = response.headers.get("content-type") || "video/mp4";

      if (!response.body?.getReader) {
        const blob = await response.blob();
        if (blob.size > MAX_MEDIA_BYTES) throw new Error("Instagram 影片超過 300 MB 安全上限。");
        return new File([blob], `instagram-${shortcode}.mp4`, { type, lastModified: Date.now() });
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_MEDIA_BYTES) {
          await reader.cancel();
          throw new Error("Instagram 影片超過 300 MB 安全上限。");
        }
        chunks.push(value);
        const progress = Number.isFinite(total) && total > 0 ? Math.min(99, Math.round((received / total) * 100)) : null;
        setStatus(progress ? `正在讀取公開影片… ${progress}%` : `正在讀取公開影片… ${(received / 1024 / 1024).toFixed(1)} MB`, "ok");
      }
      return new File(chunks, `instagram-${shortcode}.mp4`, { type, lastModified: Date.now() });
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Instagram 影片讀取逾時，請再試一次。");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function assignFile(file) {
    const app = window.ReelScribeApp;
    if (app?.setFile) {
      if (!app.setFile(file)) throw new Error("影片已取得，但目前裝置無法載入這個媒體格式。");
      return;
    }

    if (typeof DataTransfer === "undefined") throw new Error("目前瀏覽器無法把 Instagram 影片交給本機字幕引擎。");
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function waitUntilReady(timeout = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.ReelScribeApp?.isReady?.() || !transcribeButton.disabled) return;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    throw new Error("影片已取得，但本機字幕引擎尚未就緒。");
  }

  async function beginTranscription() {
    if (window.ReelScribeApp?.startTranscription) {
      const started = await window.ReelScribeApp.startTranscription();
      if (!started) throw new Error("本機字幕引擎目前無法啟動。");
      return;
    }
    transcribeButton.click();
  }

  async function runInstagramDirect(rawUrl = input.value) {
    if (running) return true;
    const parsed = parseInstagram(rawUrl);
    if (!parsed) return false;

    running = true;
    input.value = parsed.canonicalUrl;
    if (openSource) openSource.href = parsed.canonicalUrl;
    if (verifiedActions) verifiedActions.hidden = false;
    resolveButton.disabled = true;
    resolveButton.textContent = "解析 Instagram…";
    setStatus("正在解析公開 Instagram 影片…", "ok");
    updateProvider("running", "解析中");

    try {
      const data = await resolveMedia(parsed.canonicalUrl);
      const media = data.media[0];
      if (fallback) fallback.open = true;
      setStatus(data.media.length > 1 ? `找到 ${data.media.length} 段影片，先處理第一段…` : "已找到公開影片，正在準備本機字幕…", "ok");
      updateProvider("ok", data.provider?.includes("yt-dlp") ? "相容解析成功" : "快速解析成功");

      const file = await fetchMediaFile(media, parsed.shortcode);
      assignFile(file);
      await waitUntilReady();
      setStatus("影片只暫存在目前裝置，已開始產生字幕。", "ok");
      await beginTranscription();
      return true;
    } catch (error) {
      console.warn("Instagram direct transcription failed", error);
      const message = error instanceof Error ? error.message : "Instagram 直接解析失敗。";
      setStatus(`${message} 請改用下方本機備援。`, "error");
      updateProvider("fail", "暫時無法解析");
      if (fallback) fallback.open = true;
      return true;
    } finally {
      running = false;
      resolveButton.disabled = false;
      resolveButton.textContent = "取得字幕";
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("#check-url");
    if (!target || !parseInstagram(input.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runInstagramDirect();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.target !== input || event.key !== "Enter" || !parseInstagram(input.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runInstagramDirect();
  }, true);

  window.ReelScribeInstagramDirect = Object.freeze({ resolve: runInstagramDirect, parse: parseInstagram });

  const params = new URLSearchParams(location.search);
  if (params.has("url") || params.has("text")) {
    setTimeout(() => {
      if (parseInstagram(input.value)) runInstagramDirect(input.value);
    }, 700);
  }
})();