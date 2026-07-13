import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

function safeBaseName() {
  const original = window.ReelScribeApp?.getFile?.()?.name || "reelscribe-transcript";
  return original
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 80) || "reelscribe-transcript";
}

function formatTimestamp(seconds, separator) {
  const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const secs = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(millis).padStart(3, "0")}`;
}

function serializeResult(extension) {
  const result = window.ReelScribeApp?.getResult?.();
  const text = document.querySelector("#full-transcript")?.value?.trim() || result?.text || "";
  const segments = Array.isArray(result?.segments) ? result.segments : [];

  if (extension === "txt") return text;
  if (extension === "srt") {
    return segments.map((segment, index) => [
      String(index + 1),
      `${formatTimestamp(segment.start, ",")} --> ${formatTimestamp(segment.end, ",")}`,
      String(segment.text || "").trim(),
      ""
    ].join("\n")).join("\n");
  }
  if (extension === "vtt") {
    const body = segments.map((segment) => [
      `${formatTimestamp(segment.start, ".")} --> ${formatTimestamp(segment.end, ".")}`,
      String(segment.text || "").trim(),
      ""
    ].join("\n")).join("\n");
    return `WEBVTT\n\n${body}`;
  }
  throw new Error(`Unsupported export format: ${extension}`);
}

function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function saveAndShare(extension) {
  const content = serializeResult(extension);
  if (!content.trim()) throw new Error("目前沒有可匯出的字幕。");
  const path = `exports/${safeBaseName()}.${extension}`;
  await Filesystem.writeFile({
    path,
    data: textToBase64(content),
    directory: Directory.Cache,
    recursive: true
  });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  await Share.share({
    title: "ReelScribe 字幕",
    text: extension === "txt" ? content.slice(0, 5000) : undefined,
    files: [uri],
    dialogTitle: "儲存或分享字幕"
  });
}

function dispatchSharedUrl(raw) {
  if (!raw) return false;
  let candidate = String(raw).trim();
  try {
    const parsed = new URL(candidate);
    candidate = parsed.searchParams.get("url")
      || parsed.searchParams.get("text")
      || parsed.searchParams.get("link")
      || candidate;
  } catch {
    // A plain shared URL is accepted below.
  }
  const match = candidate.match(/https?:\/\/[^\s]+/i);
  if (!match) return false;
  const input = document.querySelector("#ig-url");
  if (!input) return false;
  input.value = match[0];
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector("#check-url")?.click();
  return true;
}

function installNativeExportInterceptors() {
  const formats = new Map([
    ["download-txt", "txt"],
    ["download-srt", "srt"],
    ["download-vtt", "vtt"]
  ]);
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    const extension = formats.get(button?.id);
    if (!extension) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveAndShare(extension).catch((error) => {
      console.error(error);
      const toast = document.querySelector("#toast");
      if (toast) {
        toast.textContent = error?.message || "無法儲存字幕檔。";
        toast.hidden = false;
      }
    });
  }, true);
}

if (isNative) {
  document.documentElement.classList.add("reelscribe-native", `reelscribe-${platform}`);
  installNativeExportInterceptors();
  App.addListener("appUrlOpen", ({ url }) => dispatchSharedUrl(url));
}

window.ReelScribeNative = Object.freeze({
  isNative,
  platform,
  saveAndShare,
  dispatchSharedUrl,
  getDeviceInfo: () => Device.getInfo()
});
