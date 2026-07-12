const actionRow = document.querySelector(".action-row");

if (actionRow) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button ghost";
  button.textContent = "轉台灣繁體";
  button.title = "將簡體中文字詞轉換成台灣繁體用語";
  actionRow.insertBefore(button, actionRow.firstChild);

  let converter = null;

  button.addEventListener("click", async () => {
    const transcript = document.querySelector("#full-transcript");
    if (!transcript?.value.trim()) return;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "載入轉換字典…";

    try {
      if (!converter) {
        const module = await import("https://cdn.jsdelivr.net/npm/opencc-js@1.4.0/dist/esm/full.js");
        const OpenCC = module.default || module;
        converter = OpenCC.Converter({ from: "cn", to: "twp" });
      }

      const segmentNodes = [...document.querySelectorAll(".segment-text")];
      if (segmentNodes.length) {
        for (const node of segmentNodes) {
          node.textContent = converter(node.textContent || "");
          node.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } else {
        transcript.value = converter(transcript.value);
        transcript.dispatchEvent(new Event("input", { bubbles: true }));
      }

      button.textContent = "已轉成台灣繁體";
      setTimeout(() => {
        button.textContent = originalLabel;
      }, 1800);
    } catch (error) {
      console.error(error);
      button.textContent = "轉換失敗，請重試";
      setTimeout(() => {
        button.textContent = originalLabel;
      }, 2200);
    } finally {
      button.disabled = false;
    }
  });
}
