(() => {
  "use strict";

  const input = document.querySelector("#ig-url");
  const actionButton = document.querySelector("#check-url");
  const statusNode = document.querySelector("#url-status");
  const actionLinks = document.querySelector("#verified-link-actions");
  const openSourceLink = document.querySelector("#open-instagram");
  const results = document.querySelector("#results");
  const transcript = document.querySelector("#full-transcript");
  const resultStats = document.querySelector("#result-stats");
  const segmentsNode = document.querySelector("#segments");
  const segmentCount = document.querySelector("#segment-count");
  const linkCard = document.querySelector(".link-card");
  const fileInput = document.querySelector("#media-file");

  if (!input || !actionButton || !statusNode || !results || !transcript || !linkCard) return;

  const CACHE_PREFIX = "reelscribe:link:v3:";
  const INSTANCE_CACHE = "reelscribe:instances:v2";
  const MAX_TEXT_BYTES = 6 * 1024 * 1024;
  const DEFAULT_TIMEOUT = 7000;
  const PIPED_FALLBACKS = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.reallyaweso.me",
    "https://pipedapi.privacy.com.de",
    "https://pipedapi.ducks.party",
  ];
  const INVIDIOUS_FALLBACKS = [
    "https://yewtu.be",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://inv.us.projectsegfau.lt",
  ];

  let activeResult = null;
  let currentRun = 0;
  let providerLog = null;
  let metadataNode = null;
  let communityToggle = null;

  installInterface();
  installEventInterceptors();
  restoreSharedUrl();

  function installInterface() {
    const heading = linkCard.querySelector("h2");
    const muted = linkCard.querySelector(".muted");
    const optional = linkCard.querySelector(".optional");
    const inputLabel = linkCard.querySelector("label[for='ig-url']");
    if (heading) heading.textContent = "貼上社群影片連結";
    if (muted) muted.textContent = "先查平台既有字幕與公開文字軌，不下載原影片。支援來源會並行比對，第一個有效字幕會立即顯示。";
    if (optional) optional.textContent = "主要方式";
    if (inputLabel) inputLabel.textContent = "社群影片連結";
    input.placeholder = "YouTube、Instagram、TikTok、Vimeo、Bilibili…";
    actionButton.textContent = "自動取得字幕";
    if (openSourceLink) openSourceLink.textContent = "開啟原始頁面";

    const panel = document.createElement("div");
    panel.className = "resolver-panel";
    panel.innerHTML = `
      <div class="resolver-options">
        <label class="resolver-switch">
          <input id="community-provider-toggle" type="checkbox" checked />
          <span>使用免費開源字幕節點提升成功率</span>
        </label>
        <span class="resolver-privacy">不傳送 Cookie、帳號或私人檔案</span>
      </div>
      <div class="platform-row" aria-label="支援來源">
        <span>YouTube</span><span>Vimeo</span><span>Bilibili</span><span>Dailymotion</span><span>PeerTube</span><span>公開字幕檔</span><span>其他社群中繼資料</span>
      </div>
      <div id="link-metadata" class="link-metadata" hidden></div>
      <div id="provider-log" class="provider-log" aria-live="polite" hidden></div>
    `;
    linkCard.insertBefore(panel, linkCard.querySelector(".capture-panel"));
    providerLog = panel.querySelector("#provider-log");
    metadataNode = panel.querySelector("#link-metadata");
    communityToggle = panel.querySelector("#community-provider-toggle");

    const style = document.createElement("style");
    style.textContent = `
      .resolver-panel{margin-top:16px;padding-top:15px;border-top:1px solid var(--line)}
      .resolver-options{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .resolver-switch{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:750;cursor:pointer}
      .resolver-switch input{width:17px;height:17px;accent-color:var(--accent,#111827)}
      .resolver-privacy{font-size:11px;color:var(--muted)}
      .platform-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .platform-row span{padding:5px 8px;border:1px solid var(--line);border-radius:999px;font-size:10px;color:var(--muted);background:var(--surface,#fff)}
      .link-metadata{margin-top:12px;padding:11px 12px;border-radius:12px;background:rgba(17,24,39,.045);font-size:12px;line-height:1.55}
      .link-metadata strong,.link-metadata span{display:block}
      .link-metadata span{margin-top:3px;color:var(--muted)}
      .provider-log{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
      .provider-chip{padding:5px 8px;border-radius:999px;font-size:10px;font-weight:750;background:#f2f4f7;color:#475467}
      .provider-chip.running{background:#eff8ff;color:#175cd3}
      .provider-chip.ok{background:#ecfdf3;color:#067647}
      .provider-chip.fail{background:#fef3f2;color:#b42318}
      .provider-chip.skip{background:#fffaeb;color:#b54708}
      @media(max-width:640px){.resolver-options{align-items:flex-start;flex-direction:column}.platform-row{overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px;scrollbar-width:none}.platform-row::-webkit-scrollbar{display:none}.platform-row span{white-space:nowrap}}
      @media(prefers-color-scheme:dark){.link-metadata{background:rgba(255,255,255,.055)}.provider-chip{background:rgba(255,255,255,.08);color:#d0d5dd}.provider-chip.running{background:rgba(23,92,211,.2);color:#84caff}.provider-chip.ok{background:rgba(6,118,71,.2);color:#75e0a7}.provider-chip.fail{background:rgba(180,35,24,.2);color:#fda29b}.provider-chip.skip{background:rgba(181,71,8,.2);color:#fec84b}}
    `;
    document.head.appendChild(style);
  }

  function installEventInterceptors() {
    document.addEventListener("click", async (event) => {
      const target = event.target.closest?.("button, a");
      if (!target) return;

      if (target.id === "check-url") {
        event.preventDefault();
        event.stopImmediatePropagation();
        await resolveInputUrl();
        return;
      }

      if (target.id === "paste-url") {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          input.value = await navigator.clipboard.readText();
          await resolveInputUrl();
        } catch {
          input.focus();
          setStatus("瀏覽器不能直接讀取剪貼簿，請長按貼上後再按取得字幕。", "error");
        }
        return;
      }

      if (!activeResult || results.dataset.source !== "link") return;
      if (["copy-text", "download-txt", "download-srt", "download-vtt", "rebuild-text"].includes(target.id)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (target.id === "copy-text") await copyText(transcript.value.trim());
      if (target.id === "download-txt") downloadText(transcript.value.trim(), "txt", "text/plain;charset=utf-8");
      if (target.id === "download-srt") downloadText(makeSrt(activeResult.segments), "srt", "application/x-subrip;charset=utf-8");
      if (target.id === "download-vtt") downloadText(makeVtt(activeResult.segments), "vtt", "text/vtt;charset=utf-8");
      if (target.id === "rebuild-text") {
        activeResult.text = activeResult.segments.map((item) => item.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        transcript.value = activeResult.text;
        saveCachedResult(activeResult.canonicalUrl, activeResult);
        toast("已依時間軸重建全文");
      }
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.target === input && event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        resolveInputUrl();
      }
    }, true);

    transcript.addEventListener("input", () => {
      if (!activeResult || results.dataset.source !== "link") return;
      activeResult.text = transcript.value.trim();
      saveCachedResult(activeResult.canonicalUrl, activeResult);
    });

    segmentsNode?.addEventListener("input", (event) => {
      if (!activeResult || results.dataset.source !== "link") return;
      const node = event.target.closest?.(".segment-text");
      if (!node) return;
      const index = Number(node.dataset.index);
      if (!Number.isInteger(index) || !activeResult.segments[index]) return;
      activeResult.segments[index].text = node.textContent.trim();
      activeResult.text = activeResult.segments.map((item) => item.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      transcript.value = activeResult.text;
      saveCachedResult(activeResult.canonicalUrl, activeResult);
    });

    fileInput?.addEventListener("change", () => {
      if (!fileInput.files?.length) return;
      activeResult = null;
      delete results.dataset.source;
    }, true);
  }

  function restoreSharedUrl() {
    const params = new URLSearchParams(location.search);
    const shared = params.get("url") || params.get("text") || params.get("title") || "";
    const match = shared.match(/https?:\/\/[^\s]+/i);
    if (!match) return;
    input.value = match[0].replace(/[)>\],.!]+$/, "");
    setTimeout(() => resolveInputUrl(), 80);
  }

  async function resolveInputUrl() {
    const runId = ++currentRun;
    resetProviderLog();
    const parsed = parseSourceUrl(input.value);
    if (!parsed) {
      setStatus("請貼上有效的公開影片、短影片或字幕連結。", "error");
      return;
    }

    input.value = parsed.canonicalUrl;
    if (openSourceLink) {
      openSourceLink.href = parsed.canonicalUrl;
      openSourceLink.textContent = "開啟原始頁面";
    }
    if (actionLinks) actionLinks.hidden = false;

    const cached = readCachedResult(parsed.canonicalUrl);
    if (cached?.text) {
      updateChip("本機快取", "ok", "已命中");
      renderLinkResult({ ...cached, cached: true });
      setStatus("已從本機快取立即載入字幕。", "ok");
      fetchMetadata(parsed).then((meta) => renderMetadata(meta, parsed)).catch(() => {});
      return;
    }

    setStatus(`已辨識為 ${parsed.label}，正在並行查詢免費字幕來源…`, "ok");
    actionButton.disabled = true;
    actionButton.textContent = "搜尋字幕中…";
    metadataNode.hidden = true;

    const metadataPromise = fetchMetadata(parsed)
      .then((meta) => {
        if (runId === currentRun) renderMetadata(meta, parsed);
        return meta;
      })
      .catch(() => null);

    try {
      let resolved;
      if (parsed.kind === "subtitle") resolved = await resolveDirectSubtitle(parsed);
      else if (parsed.platform === "youtube") resolved = await resolveYouTube(parsed);
      else if (parsed.platform === "vimeo") resolved = await resolveVimeo(parsed);
      else if (parsed.platform === "bilibili") resolved = await resolveBilibili(parsed);
      else if (parsed.platform === "dailymotion") resolved = await resolveDailymotion(parsed);
      else if (parsed.platform === "peertube") resolved = await resolvePeerTube(parsed);
      else resolved = await resolveGeneric(parsed);

      if (runId !== currentRun) return;
      const metadata = await metadataPromise;
      const result = {
        ...resolved,
        title: resolved.title || metadata?.title || "社群影片字幕",
        author: resolved.author || metadata?.author_name || "",
        canonicalUrl: parsed.canonicalUrl,
        platform: parsed.label,
        fetchedAt: Date.now(),
      };
      if (!result.text?.trim()) throw new Error("字幕內容是空的");
      saveCachedResult(parsed.canonicalUrl, result);
      renderLinkResult(result);
      setStatus(`字幕已取得：${result.provider || result.source || "公開字幕來源"}。`, "ok");
    } catch (error) {
      if (runId !== currentRun) return;
      console.warn("link resolver failed", error);
      const detail = ["instagram", "tiktok", "facebook", "threads", "x"].includes(parsed.platform)
        ? "此平台目前沒有向匿名網頁提供可直接讀取的公開語音字幕軌。已保留來源資訊，可使用下方分頁音訊擷取或本機檔案備援。"
        : "沒有找到可匿名讀取的公開字幕軌。可使用下方分頁音訊擷取或本機檔案備援。";
      setStatus(detail, "error");
      updateChip("解析結果", "skip", "無公開字幕");
      document.querySelector(".capture-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      if (runId === currentRun) {
        actionButton.disabled = false;
        actionButton.textContent = "自動取得字幕";
      }
    }
  }

  function parseSourceUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || "").trim());
    } catch {
      return null;
    }
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "igshid", "si", "feature"].forEach((key) => url.searchParams.delete(key));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname;

    const subtitleExt = path.match(/\.(vtt|srt|ttml|xml|json)$/i);
    if (subtitleExt) return { kind: "subtitle", platform: "subtitle", label: "公開字幕檔", canonicalUrl: url.href, extension: subtitleExt[1].toLowerCase() };

    const youtubeId = extractYouTubeId(url, host);
    if (youtubeId) return { platform: "youtube", label: "YouTube", canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`, videoId: youtubeId };

    const vimeoId = host.endsWith("vimeo.com") ? path.match(/(?:video\/)?(\d{6,12})/)?.[1] : null;
    if (vimeoId) return { platform: "vimeo", label: "Vimeo", canonicalUrl: `https://vimeo.com/${vimeoId}`, videoId: vimeoId };

    const biliId = host.endsWith("bilibili.com") || host === "b23.tv" ? path.match(/(BV[0-9A-Za-z]{10})/i)?.[1] : null;
    if (biliId) return { platform: "bilibili", label: "Bilibili", canonicalUrl: `https://www.bilibili.com/video/${biliId}`, videoId: biliId };

    const dailyId = host.includes("dailymotion.com") || host === "dai.ly" ? (path.match(/video\/([A-Za-z0-9]+)/)?.[1] || path.split("/").filter(Boolean)[0]) : null;
    if (dailyId) return { platform: "dailymotion", label: "Dailymotion", canonicalUrl: `https://www.dailymotion.com/video/${dailyId}`, videoId: dailyId };

    const peerId = path.match(/\/(?:w|videos\/watch)\/([0-9a-f-]{20,})/i)?.[1];
    if (peerId) return { platform: "peertube", label: "PeerTube", canonicalUrl: `${url.origin}/w/${peerId}`, videoId: peerId, origin: url.origin };

    const platform = host.includes("instagram.com") ? "instagram"
      : host.includes("tiktok.com") ? "tiktok"
      : host.includes("facebook.com") || host === "fb.watch" ? "facebook"
      : host.includes("threads.net") ? "threads"
      : host === "x.com" || host.includes("twitter.com") ? "x"
      : host.includes("reddit.com") || host === "redd.it" ? "reddit"
      : host.includes("twitch.tv") ? "twitch"
      : "generic";
    const labels = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", threads: "Threads", x: "X", reddit: "Reddit", twitch: "Twitch", generic: "網路影片" };
    return { platform, label: labels[platform], canonicalUrl: url.href };
  }

  function extractYouTubeId(url, host) {
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) return null;
    return url.searchParams.get("v") || url.pathname.match(/\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[1] || null;
  }

  async function resolveYouTube(parsed) {
    const tasks = [
      () => resolveYouTubeTimedText(parsed),
      () => resolveYouTubePiped(parsed),
      () => resolveYouTubeInvidious(parsed),
    ];
    if (!communityToggle?.checked) return resolveYouTubeTimedText(parsed);
    return firstSuccessful(tasks, "YouTube 沒有公開字幕，或免費字幕節點暫時不可用");
  }

  async function resolveYouTubeTimedText(parsed) {
    updateChip("YouTube 公開文字軌", "running", "查詢中");
    try {
      const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(parsed.videoId)}`;
      const xml = await fetchText(listUrl, 5000);
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const tracks = [...doc.querySelectorAll("track")].map((node) => ({
        code: node.getAttribute("lang_code") || "",
        name: node.getAttribute("name") || "",
        autoGenerated: node.getAttribute("kind") === "asr",
      }));
      const track = chooseTrack(tracks);
      if (!track) throw new Error("沒有字幕軌");
      const params = new URLSearchParams({ v: parsed.videoId, lang: track.code, fmt: "vtt" });
      if (track.name) params.set("name", track.name);
      const vtt = await fetchText(`https://www.youtube.com/api/timedtext?${params}`, 6000);
      const result = parseSubtitleText(vtt, "vtt");
      updateChip("YouTube 公開文字軌", "ok", track.autoGenerated ? "自動字幕" : "人工字幕");
      return { ...result, provider: "YouTube 公開字幕", language: track.code, accuracy: track.autoGenerated ? "auto" : "manual" };
    } catch (error) {
      updateChip("YouTube 公開文字軌", "fail", "無法讀取");
      throw error;
    }
  }

  async function resolveYouTubePiped(parsed) {
    updateChip("Piped 開源節點", "running", "競速中");
    try {
      const instances = await getPipedInstances();
      const data = await raceInstances(instances, async (base) => {
        const response = await fetchJson(`${base.replace(/\/$/, "")}/streams/${encodeURIComponent(parsed.videoId)}`, 6000);
        if (!Array.isArray(response?.subtitles) || !response.subtitles.length) throw new Error("no subtitles");
        return { response, base };
      }, 7);
      const track = chooseTrack(data.response.subtitles.map((item) => ({
        ...item,
        code: item.code || item.languageCode || "",
        autoGenerated: Boolean(item.autoGenerated),
      })));
      if (!track?.url) throw new Error("沒有字幕軌");
      const body = await fetchText(normalizeRemoteUrl(track.url, data.base), 7000);
      const result = parseSubtitleText(body, track.mimeType || extensionFromUrl(track.url));
      updateChip("Piped 開源節點", "ok", track.autoGenerated ? "自動字幕" : "人工字幕");
      return {
        ...result,
        provider: "Piped 開源字幕節點",
        title: data.response.title,
        author: data.response.uploader,
        duration: Number(data.response.duration) || result.duration,
        language: track.code,
        accuracy: track.autoGenerated ? "auto" : "manual",
      };
    } catch (error) {
      updateChip("Piped 開源節點", "fail", "節點失敗");
      throw error;
    }
  }

  async function resolveYouTubeInvidious(parsed) {
    updateChip("Invidious 開源節點", "running", "競速中");
    try {
      const instances = await getInvidiousInstances();
      const data = await raceInstances(instances, async (base) => {
        const response = await fetchJson(`${base.replace(/\/$/, "")}/api/v1/captions/${encodeURIComponent(parsed.videoId)}`, 6000);
        const captions = response?.captions;
        if (!Array.isArray(captions) || !captions.length) throw new Error("no captions");
        return { captions, base };
      }, 7);
      const track = chooseTrack(data.captions.map((item) => ({ ...item, code: item.languageCode || item.code || "" })));
      if (!track) throw new Error("沒有字幕軌");
      const query = new URLSearchParams({ lang: track.code || track.languageCode || "en" });
      const vtt = await fetchText(`${data.base.replace(/\/$/, "")}/api/v1/captions/${encodeURIComponent(parsed.videoId)}?${query}`, 7000);
      const result = parseSubtitleText(vtt, "vtt");
      updateChip("Invidious 開源節點", "ok", track.label || track.code || "字幕");
      return { ...result, provider: "Invidious 開源字幕節點", language: track.code || track.languageCode || "" };
    } catch (error) {
      updateChip("Invidious 開源節點", "fail", "節點失敗");
      throw error;
    }
  }

  async function resolveVimeo(parsed) {
    updateChip("Vimeo 公開文字軌", "running", "查詢中");
    try {
      const config = await fetchJson(`https://player.vimeo.com/video/${encodeURIComponent(parsed.videoId)}/config`, 6500);
      const tracks = config?.request?.text_tracks || config?.request?.files?.text_tracks || config?.text_tracks || [];
      const normalized = tracks.map((item) => ({ ...item, code: item.lang || item.language || item.code || "" }));
      const track = chooseTrack(normalized);
      if (!track?.url) throw new Error("沒有公開字幕軌");
      const body = await fetchText(normalizeRemoteUrl(track.url, "https://player.vimeo.com"), 7000);
      const result = parseSubtitleText(body, track.mime || extensionFromUrl(track.url));
      updateChip("Vimeo 公開文字軌", "ok", track.label || track.code || "字幕");
      return {
        ...result,
        provider: "Vimeo 公開字幕",
        title: config?.video?.title,
        author: config?.video?.owner?.name,
        duration: Number(config?.video?.duration) || result.duration,
        language: track.code,
      };
    } catch (error) {
      updateChip("Vimeo 公開文字軌", "fail", "沒有字幕");
      throw error;
    }
  }

  async function resolveBilibili(parsed) {
    updateChip("Bilibili 公開字幕", "running", "查詢中");
    try {
      const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(parsed.videoId)}`, 6500);
      if (view?.code !== 0 || !view?.data) throw new Error("無法取得影片資訊");
      const page = view.data.pages?.[0];
      const cid = page?.cid || view.data.cid;
      if (!cid) throw new Error("找不到 cid");
      const player = await fetchJson(`https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(parsed.videoId)}&cid=${encodeURIComponent(cid)}`, 6500);
      const tracks = player?.data?.subtitle?.subtitles || [];
      const track = chooseTrack(tracks.map((item) => ({ ...item, code: item.lan || item.lan_doc || "" })));
      if (!track?.subtitle_url) throw new Error("沒有公開字幕軌");
      const subtitleUrl = track.subtitle_url.startsWith("//") ? `https:${track.subtitle_url}` : track.subtitle_url;
      const body = await fetchJson(subtitleUrl, 7000);
      const segments = (body?.body || []).map((item) => ({
        start: Number(item.from) || 0,
        end: Number(item.to) || Number(item.from) + 4 || 4,
        text: cleanText(item.content || ""),
      })).filter((item) => item.text);
      if (!segments.length) throw new Error("字幕內容為空");
      updateChip("Bilibili 公開字幕", "ok", track.lan_doc || track.lan || "字幕");
      return {
        text: joinSegments(segments),
        segments,
        duration: segments.at(-1)?.end || Number(view.data.duration) || 0,
        provider: "Bilibili 公開字幕",
        title: view.data.title,
        author: view.data.owner?.name,
        language: track.lan || "",
      };
    } catch (error) {
      updateChip("Bilibili 公開字幕", "fail", "沒有字幕");
      throw error;
    }
  }

  async function resolveDailymotion(parsed) {
    updateChip("Dailymotion 字幕", "running", "查詢中");
    try {
      const data = await fetchJson(`https://www.dailymotion.com/player/metadata/video/${encodeURIComponent(parsed.videoId)}`, 6500);
      const rawTracks = data?.subtitles?.data || data?.subtitles || [];
      const tracks = Array.isArray(rawTracks) ? rawTracks : Object.values(rawTracks || {}).flat();
      const track = chooseTrack(tracks.map((item) => ({ ...item, code: item.language || item.code || "", url: item.url || item.urls?.[0] })));
      if (!track?.url) throw new Error("沒有字幕軌");
      const body = await fetchText(track.url, 7000);
      const result = parseSubtitleText(body, extensionFromUrl(track.url));
      updateChip("Dailymotion 字幕", "ok", track.label || track.code || "字幕");
      return { ...result, provider: "Dailymotion 公開字幕", title: data?.title, author: data?.owner?.screenname, duration: Number(data?.duration) || result.duration, language: track.code };
    } catch (error) {
      updateChip("Dailymotion 字幕", "fail", "沒有字幕");
      throw error;
    }
  }

  async function resolvePeerTube(parsed) {
    updateChip("PeerTube 字幕", "running", "查詢中");
    try {
      const data = await fetchJson(`${parsed.origin}/api/v1/videos/${encodeURIComponent(parsed.videoId)}/captions`, 6500);
      const tracks = data?.data || data || [];
      const track = chooseTrack(tracks.map((item) => ({
        ...item,
        code: item.language?.id || item.language || item.code || "",
        label: item.language?.label || item.label || "",
        url: item.captionPath || item.url,
      })));
      if (!track?.url) throw new Error("沒有字幕軌");
      const body = await fetchText(normalizeRemoteUrl(track.url, parsed.origin), 7000);
      const result = parseSubtitleText(body, extensionFromUrl(track.url));
      updateChip("PeerTube 字幕", "ok", track.label || track.code || "字幕");
      return { ...result, provider: "PeerTube 公開字幕", language: track.code };
    } catch (error) {
      updateChip("PeerTube 字幕", "fail", "沒有字幕");
      throw error;
    }
  }

  async function resolveDirectSubtitle(parsed) {
    updateChip("公開字幕檔", "running", "讀取中");
    try {
      const body = parsed.extension === "json" ? await fetchJson(parsed.canonicalUrl, 7000) : await fetchText(parsed.canonicalUrl, 7000);
      let result;
      if (typeof body === "string") result = parseSubtitleText(body, parsed.extension);
      else {
        const rows = body?.body || body?.segments || body?.captions || [];
        const segments = rows.map((item) => ({
          start: Number(item.start ?? item.from ?? item.begin ?? 0),
          end: Number(item.end ?? item.to ?? item.start ?? 0) || Number(item.start ?? item.from ?? 0) + 4,
          text: cleanText(item.text ?? item.content ?? item.caption ?? ""),
        })).filter((item) => item.text);
        result = { text: joinSegments(segments), segments, duration: segments.at(-1)?.end || 0 };
      }
      if (!result.text) throw new Error("字幕內容為空");
      updateChip("公開字幕檔", "ok", parsed.extension.toUpperCase());
      return { ...result, provider: "公開字幕檔" };
    } catch (error) {
      updateChip("公開字幕檔", "fail", "讀取失敗");
      throw error;
    }
  }

  async function resolveGeneric(parsed) {
    updateChip("平台公開字幕", "running", "查詢中");
    try {
      const metadata = await fetchMetadata(parsed);
      const candidates = collectSubtitleUrls(metadata);
      for (const candidate of candidates) {
        try {
          const body = await fetchText(candidate, 6000);
          const result = parseSubtitleText(body, extensionFromUrl(candidate));
          if (result.text) {
            updateChip("平台公開字幕", "ok", "已找到");
            return { ...result, provider: `${metadata.provider_name || parsed.label} 公開字幕`, title: metadata.title, author: metadata.author_name };
          }
        } catch {
          // Try the next declared subtitle URL.
        }
      }
      throw new Error("平台沒有公開字幕軌");
    } catch (error) {
      updateChip("平台公開字幕", "fail", "未提供字幕");
      throw error;
    }
  }

  async function fetchMetadata(parsed) {
    updateChip("公開中繼資料", "running", "查詢中");
    const endpoints = [];
    const encoded = encodeURIComponent(parsed.canonicalUrl);
    if (parsed.platform === "youtube") endpoints.push(`https://www.youtube.com/oembed?url=${encoded}&format=json`);
    if (parsed.platform === "vimeo") endpoints.push(`https://vimeo.com/api/oembed.json?url=${encoded}`);
    if (parsed.platform === "tiktok") endpoints.push(`https://www.tiktok.com/oembed?url=${encoded}`);
    if (parsed.platform === "x") endpoints.push(`https://publish.twitter.com/oembed?url=${encoded}&omit_script=true`);
    endpoints.push(`https://noembed.com/embed?url=${encoded}`);

    try {
      const metadata = await firstSuccessful(endpoints.map((endpoint) => () => fetchJson(endpoint, 5000)), "無中繼資料");
      updateChip("公開中繼資料", "ok", metadata.provider_name || parsed.label);
      return metadata;
    } catch (error) {
      updateChip("公開中繼資料", "skip", "不可用");
      throw error;
    }
  }

  function renderMetadata(metadata, parsed) {
    if (!metadataNode || !metadata) return;
    const title = cleanText(metadata.title || "");
    const author = cleanText(metadata.author_name || metadata.uploader_name || "");
    const provider = cleanText(metadata.provider_name || parsed.label || "");
    if (!title && !author && !provider) return;
    metadataNode.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = title || `${parsed.label} 公開影片`;
    const span = document.createElement("span");
    span.textContent = [provider, author].filter(Boolean).join(" · ");
    metadataNode.append(strong, span);
    metadataNode.hidden = false;
  }

  function collectSubtitleUrls(metadata) {
    if (!metadata || typeof metadata !== "object") return [];
    const values = [];
    const walk = (value, depth = 0) => {
      if (depth > 4 || value == null) return;
      if (typeof value === "string" && /^https?:\/\//i.test(value) && /\.(vtt|srt|ttml|xml)(?:\?|$)/i.test(value)) values.push(value);
      else if (Array.isArray(value)) value.forEach((item) => walk(item, depth + 1));
      else if (typeof value === "object") Object.values(value).forEach((item) => walk(item, depth + 1));
    };
    walk(metadata);
    return [...new Set(values)];
  }

  async function getPipedInstances() {
    const cached = readInstanceCache()?.piped;
    if (cached?.length) return [...new Set([...cached, ...PIPED_FALLBACKS])];
    try {
      const markdown = await fetchText("https://raw.githubusercontent.com/wiki/TeamPiped/Piped/Instances.md", 5000);
      const urls = [...markdown.matchAll(/https:\/\/[A-Za-z0-9.-]+/g)].map((match) => match[0]);
      const candidates = urls.filter((url) => /pipedapi|api\./i.test(url)).slice(0, 20);
      writeInstanceCache({ piped: candidates });
      return [...new Set([...candidates, ...PIPED_FALLBACKS])];
    } catch {
      return PIPED_FALLBACKS;
    }
  }

  async function getInvidiousInstances() {
    const cached = readInstanceCache()?.invidious;
    if (cached?.length) return [...new Set([...cached, ...INVIDIOUS_FALLBACKS])];
    try {
      const list = await fetchJson("https://api.invidious.io/instances.json?sort_by=health", 5000);
      const candidates = (Array.isArray(list) ? list : [])
        .filter((entry) => Array.isArray(entry) && entry[1]?.api && entry[1]?.type === "https")
        .map((entry) => entry[1]?.uri || `https://${entry[0]}`)
        .filter(Boolean)
        .slice(0, 15);
      writeInstanceCache({ invidious: candidates });
      return [...new Set([...candidates, ...INVIDIOUS_FALLBACKS])];
    } catch {
      return INVIDIOUS_FALLBACKS;
    }
  }

  function readInstanceCache() {
    try {
      const data = JSON.parse(localStorage.getItem(INSTANCE_CACHE) || "null");
      if (!data || Date.now() - data.savedAt > 24 * 60 * 60 * 1000) return null;
      return data;
    } catch {
      return null;
    }
  }

  function writeInstanceCache(partial) {
    try {
      const current = readInstanceCache() || {};
      localStorage.setItem(INSTANCE_CACHE, JSON.stringify({ ...current, ...partial, savedAt: Date.now() }));
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }

  async function raceInstances(instances, resolver, limit = 6) {
    const unique = [...new Set(instances)].filter((item) => /^https:\/\//.test(item)).slice(0, limit);
    if (!unique.length) throw new Error("沒有可用節點");
    return firstSuccessful(unique.map((base, index) => async () => {
      if (index) await delay(index * 180);
      return resolver(base);
    }), "所有免費節點都不可用");
  }

  async function firstSuccessful(taskFactories, errorMessage) {
    return new Promise((resolve, reject) => {
      let pending = taskFactories.length;
      const errors = [];
      if (!pending) return reject(new Error(errorMessage));
      let settled = false;
      taskFactories.forEach((factory, index) => {
        Promise.resolve().then(factory).then((value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        }).catch((error) => {
          errors[index] = error;
          pending -= 1;
          if (!pending && !settled) reject(new AggregateError(errors, errorMessage));
        });
      });
    });
  }

  function chooseTrack(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return null;
    const requested = document.querySelector("#language-select")?.value || "auto";
    const preferences = {
      chinese: ["zh-TW", "zh-Hant", "zh", "zh-CN", "yue"],
      english: ["en", "en-US", "en-GB"],
      japanese: ["ja", "jp"],
      korean: ["ko", "kr"],
      auto: ["zh-TW", "zh-Hant", "zh", "en", "ja", "ko"],
    }[requested] || [];
    const normalized = tracks.map((track, index) => ({
      ...track,
      _index: index,
      _code: String(track.code || track.languageCode || track.lang || track.language || "").replace("_", "-"),
      _manual: track.autoGenerated === false || track.kind !== "asr",
    }));
    normalized.sort((a, b) => {
      const aPref = preferenceIndex(a._code, preferences);
      const bPref = preferenceIndex(b._code, preferences);
      if (aPref !== bPref) return aPref - bPref;
      if (a._manual !== b._manual) return a._manual ? -1 : 1;
      return a._index - b._index;
    });
    return normalized[0];
  }

  function preferenceIndex(code, preferences) {
    const lower = code.toLowerCase();
    const exact = preferences.findIndex((item) => item.toLowerCase() === lower);
    if (exact >= 0) return exact;
    const base = lower.split("-")[0];
    const partial = preferences.findIndex((item) => item.toLowerCase().split("-")[0] === base);
    return partial >= 0 ? partial + 10 : 100;
  }

  function parseSubtitleText(body, hint = "") {
    const text = String(body || "").replace(/^\uFEFF/, "");
    const lowerHint = String(hint || "").toLowerCase();
    if (/webvtt/i.test(text.slice(0, 80)) || lowerHint.includes("vtt")) return parseVtt(text);
    if (/^\s*\d+\s*\r?\n\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(text) || lowerHint.includes("srt")) return parseSrt(text);
    if (/<(?:tt|transcript|timedtext|body|p|text)[\s>]/i.test(text) || /xml|ttml/.test(lowerHint)) return parseXmlSubtitle(text);
    throw new Error("不支援的字幕格式");
  }

  function parseVtt(text) {
    const blocks = text.replace(/^WEBVTT[^\n]*\n/i, "").split(/\r?\n\r?\n+/);
    const segments = [];
    for (const block of blocks) {
      const lines = block.trim().split(/\r?\n/);
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) continue;
      const [startRaw, endRaw] = lines[timeIndex].split("-->").map((item) => item.trim().split(/\s+/)[0]);
      const cueText = cleanText(lines.slice(timeIndex + 1).join(" "));
      if (!cueText) continue;
      segments.push({ start: parseClock(startRaw), end: parseClock(endRaw), text: cueText });
    }
    return finalizeSegments(segments);
  }

  function parseSrt(text) {
    const blocks = text.split(/\r?\n\r?\n+/);
    const segments = [];
    for (const block of blocks) {
      const lines = block.trim().split(/\r?\n/);
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) continue;
      const [startRaw, endRaw] = lines[timeIndex].split("-->").map((item) => item.trim());
      const cueText = cleanText(lines.slice(timeIndex + 1).join(" "));
      if (!cueText) continue;
      segments.push({ start: parseClock(startRaw), end: parseClock(endRaw), text: cueText });
    }
    return finalizeSegments(segments);
  }

  function parseXmlSubtitle(text) {
    const doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("字幕 XML 格式錯誤");
    const nodes = [...doc.querySelectorAll("p, text")];
    const segments = nodes.map((node) => {
      const startRaw = node.getAttribute("begin") ?? node.getAttribute("start") ?? "0";
      const endRaw = node.getAttribute("end");
      const durationRaw = node.getAttribute("dur");
      const start = parseClock(startRaw);
      const end = endRaw ? parseClock(endRaw) : start + (durationRaw ? parseClock(durationRaw) : 4);
      return { start, end, text: cleanText(node.textContent || "") };
    }).filter((item) => item.text);
    return finalizeSegments(segments);
  }

  function parseClock(value) {
    const raw = String(value || "0").trim().replace(",", ".");
    if (/^\d+(?:\.\d+)?s$/i.test(raw)) return Number.parseFloat(raw);
    if (/^\d+(?:\.\d+)?ms$/i.test(raw)) return Number.parseFloat(raw) / 1000;
    if (/^\d+(?:\.\d+)?$/.test(raw)) return Number.parseFloat(raw);
    const parts = raw.split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function finalizeSegments(segments) {
    const normalized = segments
      .map((item, index) => ({
        id: index + 1,
        start: Math.max(0, Number(item.start) || 0),
        end: Math.max(Number(item.start) || 0, Number(item.end) || Number(item.start) + 4 || 4),
        text: cleanText(item.text || ""),
      }))
      .filter((item) => item.text);
    if (!normalized.length) throw new Error("字幕內容為空");
    return { text: joinSegments(normalized), segments: normalized, duration: normalized.at(-1)?.end || 0 };
  }

  function cleanText(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value || "").replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ");
    return textarea.value.replace(/\s+/g, " ").trim();
  }

  function joinSegments(segments) {
    return segments.map((item) => item.text).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function renderLinkResult(result) {
    activeResult = {
      ...result,
      segments: (result.segments || []).map((item, index) => ({ ...item, id: index + 1 })),
    };
    results.dataset.source = "link";
    transcript.value = activeResult.text;
    resultStats.textContent = `${activeResult.platform || "線上影片"} · ${activeResult.segments.length} 段 · 約 ${activeResult.text.replace(/\s/g, "").length} 字 · ${activeResult.provider || "公開字幕"}${activeResult.cached ? " · 本機快取" : ""}`;
    renderLinkSegments();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLinkSegments() {
    segmentsNode.innerHTML = "";
    segmentCount.textContent = `${activeResult.segments.length} 段`;
    activeResult.segments.forEach((segment, index) => {
      const row = document.createElement("div");
      row.className = "segment";
      const time = document.createElement("a");
      time.className = "segment-time";
      time.textContent = formatDuration(segment.start);
      time.href = sourceUrlAtTime(activeResult.canonicalUrl, segment.start);
      time.target = "_blank";
      time.rel = "noopener noreferrer";
      time.title = "在原始影片開啟此時間";
      const text = document.createElement("div");
      text.className = "segment-text";
      text.contentEditable = "true";
      text.spellcheck = true;
      text.dataset.index = String(index);
      text.textContent = segment.text;
      text.setAttribute("aria-label", `第 ${index + 1} 段字幕`);
      row.append(time, text);
      segmentsNode.appendChild(row);
    });
  }

  function sourceUrlAtTime(url, seconds) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") parsed.searchParams.set("t", `${Math.floor(seconds)}s`);
      return parsed.href;
    } catch {
      return url;
    }
  }

  function setStatus(message, type = "") {
    statusNode.className = "inline-status";
    if (type) statusNode.classList.add(type);
    statusNode.textContent = message;
  }

  function resetProviderLog() {
    if (!providerLog) return;
    providerLog.innerHTML = "";
    providerLog.hidden = false;
  }

  function updateChip(name, state, detail = "") {
    if (!providerLog) return;
    providerLog.hidden = false;
    let chip = [...providerLog.children].find((node) => node.dataset.name === name);
    if (!chip) {
      chip = document.createElement("span");
      chip.className = "provider-chip";
      chip.dataset.name = name;
      providerLog.appendChild(chip);
    }
    chip.className = `provider-chip ${state}`;
    chip.textContent = detail ? `${name} · ${detail}` : name;
  }

  function cacheKey(url) {
    let hash = 2166136261;
    for (let index = 0; index < url.length; index += 1) {
      hash ^= url.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${CACHE_PREFIX}${(hash >>> 0).toString(36)}`;
  }

  function readCachedResult(url) {
    try {
      const value = JSON.parse(localStorage.getItem(cacheKey(url)) || "null");
      if (!value || Date.now() - value.savedAt > 30 * 24 * 60 * 60 * 1000) return null;
      return value.result;
    } catch {
      return null;
    }
  }

  function saveCachedResult(url, result) {
    if (!url || !result?.text) return;
    try {
      localStorage.setItem(cacheKey(url), JSON.stringify({ savedAt: Date.now(), result }));
    } catch {
      // Ignore private-mode and quota errors.
    }
  }

  async function fetchText(url, timeout = DEFAULT_TIMEOUT) {
    const response = await safeFetch(url, timeout);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) throw new Error("字幕回應過大");
    return text;
  }

  async function fetchJson(url, timeout = DEFAULT_TIMEOUT) {
    const text = await fetchText(url, timeout);
    return JSON.parse(text);
  }

  async function safeFetch(url, timeout) {
    const target = new URL(url);
    if (target.protocol !== "https:") throw new Error("僅允許 HTTPS 公開來源");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(target.href, {
        method: "GET",
        credentials: "omit",
        mode: "cors",
        redirect: "follow",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        headers: { Accept: "application/json,text/vtt,application/xml,text/xml,text/plain,*/*;q=0.5" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > MAX_TEXT_BYTES) throw new Error("回應內容過大");
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeRemoteUrl(value, base) {
    if (!value) return "";
    if (value.startsWith("//")) return `https:${value}`;
    return new URL(value, base).href;
  }

  function extensionFromUrl(url) {
    try {
      return new URL(url, location.href).pathname.split(".").pop()?.toLowerCase() || "";
    } catch {
      return "";
    }
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatSrt(seconds, separator = ",") {
    const ms = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const milli = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${separator}${String(milli).padStart(3, "0")}`;
  }

  function makeSrt(items) {
    return items.map((item, index) => `${index + 1}\n${formatSrt(item.start)} --> ${formatSrt(item.end)}\n${item.text}\n`).join("\n");
  }

  function makeVtt(items) {
    return `WEBVTT\n\n${items.map((item) => `${formatSrt(item.start, ".")} --> ${formatSrt(item.end, ".")}\n${item.text}\n`).join("\n")}`;
  }

  function downloadText(content, extension, type) {
    if (!content) return;
    const base = (activeResult?.title || "reelscribe-transcript").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${base || "reelscribe-transcript"}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      transcript.select();
      document.execCommand("copy");
    }
    toast("完整字幕已複製");
  }

  function toast(message) {
    const node = document.querySelector("#toast");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 2200);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();