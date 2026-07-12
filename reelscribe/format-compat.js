(() => {
  "use strict";

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