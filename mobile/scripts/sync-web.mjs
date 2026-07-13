import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const mobileRoot = resolve(repoRoot, "mobile");
const sourceRoot = resolve(repoRoot, "reelscribe");
const webRoot = resolve(mobileRoot, "www");

const runtimeFiles = [
  "index.html",
  "supported-platforms.html",
  "styles.css",
  "ui-polish.css",
  "runtime.css",
  "format-compat.js",
  "speech-enhancer.js",
  "app.js",
  "runtime-optimizer.js",
  "screen-ocr.js",
  "capture.js",
  "traditional.js",
  "instagram-direct.js",
  "universal-link.js",
  "ui.js",
  "share.js",
  "worker.js",
  "manifest.webmanifest",
  "icon.svg",
  "social-card.svg"
];

await rm(webRoot, { recursive: true, force: true });
await mkdir(webRoot, { recursive: true });

for (const file of runtimeFiles) {
  await cp(resolve(sourceRoot, file), resolve(webRoot, file));
}

let index = await readFile(resolve(webRoot, "index.html"), "utf8");
const marker = "<script>window.__REELSCRIBE_NATIVE__ = true;</script>";
index = index.replace(
  '<script src="./format-compat.js"></script>',
  `${marker}\n  <script src="./format-compat.js"></script>`
);
index = index.replace(
  "</body>",
  '  <script type="module" src="./native-bridge.js"></script>\n</body>'
);
await writeFile(resolve(webRoot, "index.html"), index);

let app = await readFile(resolve(webRoot, "app.js"), "utf8");
app = app.replace(
  'function registerServiceWorker() {\n  if (!("serviceWorker" in navigator)) return;',
  'function registerServiceWorker() {\n  if (window.__REELSCRIBE_NATIVE__) return;\n  if (!("serviceWorker" in navigator)) return;'
);
app = app.replace(
  "  getDuration: () => state.mediaDuration || estimateDuration(),",
  "  getDuration: () => state.mediaDuration || estimateDuration(),\n  getResult: () => state.result ? structuredClone(state.result) : null,"
);
await writeFile(resolve(webRoot, "app.js"), app);

await build({
  entryPoints: [resolve(mobileRoot, "src/native-entry.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["ios16", "android110", "safari16"],
  minify: true,
  sourcemap: false,
  outfile: resolve(webRoot, "native-bridge.js")
});

console.log(`Synced ${runtimeFiles.length} ReelScribe assets into ${webRoot}`);
