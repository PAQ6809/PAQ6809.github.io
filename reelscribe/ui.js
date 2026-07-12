(() => {
  "use strict";

  const polish = document.createElement("link");
  polish.rel = "stylesheet";
  polish.href = "./ui-polish.css";
  document.head.appendChild(polish);

  const fallback = document.querySelector("#fallback-tools");
  const focusUpload = document.querySelector("#focus-upload");
  const fileInput = document.querySelector("#media-file");
  const transcribe = document.querySelector("#transcribe");
  const resolveButton = document.querySelector("#check-url");
  const status = document.querySelector("#url-status");

  document.documentElement.classList.add("js");

  if (status) status.setAttribute("aria-atomic", "true");

  function openFallback() {
    if (!fallback) return;
    fallback.open = true;
  }

  focusUpload?.addEventListener("click", openFallback, true);
  fileInput?.addEventListener("change", () => {
    if (fileInput.files?.length) openFallback();
  }, true);
  transcribe?.addEventListener("click", openFallback, true);

  if (resolveButton) {
    const syncBusyState = () => {
      const busy = resolveButton.disabled && /搜尋|取得|處理|查詢/.test(resolveButton.textContent || "");
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

  const viewport = window.visualViewport;
  if (viewport) {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(viewport.height)}px`);
    };
    viewport.addEventListener("resize", setViewportHeight, { passive: true });
    setViewportHeight();
  }
})();