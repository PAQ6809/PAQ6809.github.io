(() => {
  "use strict";

  const button = document.querySelector("#share-site");
  const toast = document.querySelector("#toast");
  if (!button) return;

  const campaignUrl = new URL("https://paq6809.github.io/reelscribe/");
  campaignUrl.searchParams.set("utm_source", "share");
  campaignUrl.searchParams.set("utm_medium", "organic");
  campaignUrl.searchParams.set("utm_campaign", "reelscribe_launch");

  const payload = {
    title: "ReelScribe｜免費社群影片字幕工具",
    text: "貼上公開影片連結，快速取得可複製字幕；沒有公開字幕時可用本機 AI 備援。",
    url: campaignUrl.href,
  };

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  async function copyShareText() {
    const value = `${payload.text}\n${payload.url}`;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    notify("分享文字與連結已複製");
  }

  button.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share(payload);
        notify("分享完成");
        return;
      }
      await copyShareText();
    } catch (error) {
      if (error?.name !== "AbortError") await copyShareText();
    }
  });
})();