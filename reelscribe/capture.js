const fileInput = document.querySelector("#media-file");
const uploadCard = document.querySelector(".upload-card");
const fallbackDetails = document.querySelector("#fallback-tools");

if (fileInput && uploadCard && navigator.mediaDevices) {
  const panel = document.createElement("section");
  panel.className = "capture-panel";
  panel.innerHTML = `
    <div class="capture-heading">
      <div>
        <strong>沒有影片檔？</strong>
        <span>桌機可錄製分頁音訊，手機可使用麥克風錄音。</span>
      </div>
      <span class="capture-free">免費備援</span>
    </div>
    <div class="capture-actions">
      <button id="capture-tab-audio" class="button ghost" type="button">錄製桌機分頁</button>
      <button id="capture-microphone" class="button ghost" type="button">麥克風錄音</button>
      <button id="stop-capture" class="button secondary" type="button" hidden>停止錄製</button>
    </div>
    <p id="capture-status" class="capture-status">桌機 Chrome／Edge：選擇播放影片的分頁，並勾選「分享分頁音訊」。</p>
  `;
  uploadCard.appendChild(panel);

  const style = document.createElement("style");
  style.textContent = `
    .capture-panel{margin-top:16px;padding-top:15px;border-top:1px solid var(--line)}
    .capture-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .capture-heading strong,.capture-heading span{display:block}
    .capture-heading>div>span{margin-top:4px;color:var(--muted);font-size:12px;line-height:1.5}
    .capture-free{padding:5px 8px;border-radius:999px;color:var(--success);background:var(--success-soft);font-size:10px;font-weight:800;white-space:nowrap}
    .capture-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .capture-actions .button{flex:1;min-width:132px}
    .capture-status{margin:10px 0 0;color:var(--muted);font-size:11px;line-height:1.55}
    .capture-status.recording{color:var(--danger);font-weight:750}
    @media(max-width:520px){.capture-actions{display:grid;grid-template-columns:1fr}.capture-actions .button{width:100%;min-width:0}}
  `;
  document.head.appendChild(style);

  const tabButton = document.querySelector("#capture-tab-audio");
  const micButton = document.querySelector("#capture-microphone");
  const stopButton = document.querySelector("#stop-capture");
  const status = document.querySelector("#capture-status");

  let recorder = null;
  let stream = null;
  let chunks = [];
  let timer = null;
  let startedAt = 0;
  let recordingKind = "capture";

  if (!navigator.mediaDevices.getDisplayMedia) tabButton.hidden = true;
  if (!navigator.mediaDevices.getUserMedia) micButton.hidden = true;

  function supportedMime(kind) {
    const candidates = kind === "tab"
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  function extensionFor(type) {
    if (type.includes("mp4")) return recordingKind === "mic" ? "m4a" : "mp4";
    return "webm";
  }

  function setRecordingUi(active, message = "") {
    tabButton.disabled = active;
    micButton.disabled = active;
    stopButton.hidden = !active;
    status.classList.toggle("recording", active);
    if (message) status.textContent = message;
  }

  function updateTimer() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    status.textContent = `錄製中 ${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")} · 播放完影片後按「停止錄製」`;
  }

  function stopTracks() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function deliverRecording(blob, mimeType) {
    if (!blob.size) {
      status.textContent = "沒有錄到內容，請重新嘗試。";
      return;
    }
    const file = new File(
      [blob],
      `reelscribe-${recordingKind}-${new Date().toISOString().replace(/[:.]/g, "-")}.${extensionFor(mimeType)}`,
      { type: mimeType || blob.type || "video/webm" },
    );
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    if (fallbackDetails) fallbackDetails.open = true;
    status.textContent = "錄製完成，內容已放入本機辨識工具。";
    uploadCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function startRecording(kind) {
    if (!window.MediaRecorder) {
      status.textContent = "這個瀏覽器不支援錄製，請改用最新版 Chrome、Edge 或 Safari。";
      return;
    }
    try {
      if (fallbackDetails) fallbackDetails.open = true;
      recordingKind = kind;
      chunks = [];
      const mimeType = supportedMime(kind);
      if (kind === "tab") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          surfaceSwitching: "include",
        });
        if (!stream.getAudioTracks().length) {
          stopTracks();
          throw new Error("沒有取得分頁音訊。請重新選擇分頁，並勾選「分享分頁音訊」。");
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }

      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        clearInterval(timer);
        const finalType = recorder.mimeType || mimeType || (kind === "tab" ? "video/webm" : "audio/webm");
        deliverRecording(new Blob(chunks, { type: finalType }), finalType);
        stopTracks();
        recorder = null;
        setRecordingUi(false);
      }, { once: true });

      stream.getTracks().forEach((track) => track.addEventListener("ended", () => {
        if (recorder?.state === "recording") recorder.stop();
      }, { once: true }));

      recorder.start(1000);
      startedAt = Date.now();
      updateTimer();
      timer = setInterval(updateTimer, 1000);
      setRecordingUi(true);

      setTimeout(() => {
        if (recorder?.state === "recording") recorder.stop();
      }, 10 * 60 * 1000);
    } catch (error) {
      stopTracks();
      clearInterval(timer);
      recorder = null;
      setRecordingUi(false, error?.message || "無法開始錄製。請確認瀏覽器權限。");
    }
  }

  tabButton.addEventListener("click", () => startRecording("tab"));
  micButton.addEventListener("click", () => startRecording("mic"));
  stopButton.addEventListener("click", () => {
    if (recorder?.state === "recording") recorder.stop();
  });
}