# ReelScribe Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accurate, secure, and usable without paid core dependencies.

## Interface rules

1. The first screen focuses on one task: paste a link and get subtitles.
2. The input and primary action remain visible on common phone screens without horizontal scrolling.
3. Upload, local Whisper, tab capture, microphone, model and enhancement controls stay in the collapsed fallback section.
4. Light theme remains the default; avoid decorative gradients, excessive badges, repeated feature lists and unnecessary animation.
5. Touch targets are at least 44 CSS pixels high.
6. Widths 320, 375, 390, 430, 768 and 1280 pixels remain usable.
7. Copy remains the primary result action; TXT, SRT and VTT are secondary.
8. On phone widths the header is not sticky, and provider chips wrap inside their card.
9. The music-suppression control is enabled by default and clearly notes that song/lyric transcription may require disabling it.

## Instagram direct-link rules

- `instagram-direct.js` loads before `universal-link.js`.
- `/api/instagram-resolve` runs first; `/api/instagram-yt` is the compatibility fallback.
- Backends never accept passwords, cookies, sessions, private tokens or login bypass instructions.
- Media URLs are short-lived, HMAC-signed, HTTPS-only, limited to Instagram/Facebook CDN hosts and capped at 300 MB.
- Backend responses are `no-store`; media and captions are not persisted.
- The frontend uses `credentials: omit`, `no-referrer`, timeouts and streaming size checks.
- iPhone Safari uses `window.ReelScribeApp.setFile()` and `startTranscription()`; `DataTransfer` is legacy fallback only.
- Private, login-only, age/region restricted, removed, DRM or platform-blocked content is not bypassed.

## Speech enhancement rules

- `speech-enhancer.js` loads before `app.js` and remains dependency-free at build time.
- ONNX Runtime Web and `@ricky0123/vad-web` are lazy-loaded only when local speech enhancement is used.
- External runtime versions remain pinned and are checked by scheduled CI.
- Silero VAD v5 uses `NonRealTimeVAD` on the already-decoded 16 kHz Float32Array.
- Stereo input may use Mid/Side analysis to emphasize center-panned speech; mono input remains unchanged before filtering.
- The lightweight speech band uses a low-frequency high-pass, a restrained presence boost and a high-frequency low-pass.
- VAD speech regions receive short pre/post padding and are merged across small gaps to prevent clipped words.
- Non-speech regions are strongly attenuated with fades, not abruptly deleted, so timestamps remain aligned to the source video.
- Speech gain normalization is bounded to prevent clipping and pumping.
- When VAD finds no speech, the worker rejects transcription instead of asking Whisper to guess from music.
- If VAD assets fail to load, use DSP fallback and keep the app usable; do not silently upload audio to a cloud service.
- Song and lyric recognition may bypass VAD/music suppression because singing is not equivalent to ordinary speech.

## Model architecture rules

- The local stack contains four multilingual tiers:
  - Tiny: phone, long video, low resources and WASM.
  - Base: normal clips and mobile WebGPU.
  - Small: desktop WebGPU precision.
  - Large-v3-turbo: capable desktop WebGPU flagship mode.
- Smart mode considers duration, WebGPU, mobile detection, memory, CPU cores, Data Saver and network type.
- Large-v3-turbo is never forced on a phone and is not used on slow/data-saving connections.
- Large-v3-turbo WebGPU uses per-module q4f16 for encoder and merged decoder to reduce first load and memory.
- Small/Base/Tiny WebGPU prefer encoder fp16 and merged decoder q4f16, then fall back to full fp16 if required by the browser/driver.
- WASM uses q8 and never loads Large-v3-turbo or Small.
- The fallback chain is `Turbo → Small → Base → Tiny → WASM Base/Tiny`.
- Model switching disposes the previous pipeline when practical to reduce GPU/CPU memory pressure.
- A `prepare` message starts model loading while media decode and VAD run; the actual transcription reuses the same in-flight or cached pipeline.
- Models remain lazy-loaded; page load must not download Whisper or VAD weights.
- Browser cache and persistent-storage requests are used, but failure to grant persistence must not break the app.
- Model download progress, selected model and fallback state remain visible and truthful.

## Accuracy and hallucination rules

- `smart` is the default mode.
- Long recordings use bounded windows, overlap, silence skipping, duplicate removal, low-confidence rejection and timestamps.
- Hallucination detection includes:
  - longest repeated character run;
  - dominant-character ratio;
  - unique-character ratio;
  - bigram diversity;
  - repeating short pattern detection;
  - symbol-only and high-symbol-ratio output.
- `>>`, repeated punctuation, repeated single characters and repeated phrases must be rejected.
- Suspicious output gets one retry with shorter chunks, repetition penalty, n-gram blocking and bounded output length.
- A second suspicious result is rejected, never displayed as completed subtitles.
- Long-form processing may skip the rejected window and continue with trustworthy windows.
- Cached repetitive garbage is removed before restoration.
- Do not silently rewrite low-confidence output into guessed sentences.
- Do not promise perfect accuracy, real-time completion or identical performance across devices and audio conditions.

## PWA freshness and loading rules

- HTML, JavaScript, CSS, workers and manifest use network-first caching.
- Static icons may remain cache-first.
- Every model-worker, enhancement or breaking interface update increments the Service Worker cache version.
- Service Worker registration uses `updateViaCache: "none"`, calls `registration.update()` and permits one reload per build.
- Critical production comparison includes `index.html`, `app.js`, `ui.js`, `ui-polish.css`, `speech-enhancer.js`, `instagram-direct.js`, `universal-link.js`, `worker.js` and `sw.js`.
- Model loading overlaps media decode and VAD; avoid artificial waits and duplicate pipeline loads.

## Performance rules

- Do not add a UI framework or preload AI models.
- Keep Whisper in a Web Worker and page caching in the Service Worker.
- Keep provider requests parallel, timed out and independently degradable.
- Cache successful text locally but never persist proxied Instagram media.
- Run the expensive retry only after confidence checks fail.
- Avoid copying multi-hour PCM arrays unnecessarily; file-size and memory limits remain conservative.
- Do not add analytics or advertising scripts without explicit approval and privacy review.

## Security rules

- Keep restrictive CSP and `no-referrer`.
- Never access `document.cookie`, use `eval`, or construct dynamic functions.
- GitHub Actions use read-only permissions, full-SHA-pinned actions and disabled checkout credentials.
- Maintain `SECURITY.md`, `.github/CODEOWNERS`, `.github/dependabot.yml` and `reelscribe/SECURITY-HARDENING.md`.
- Production integrity checks compare deployed assets with repository files.
- Vercel signing secrets stay private and never enter client JavaScript.
- Repository owner enables 2FA/passkey, branch rules, signed commits, owner review, force-push blocking, secret scanning and push protection.

## Required regression checks

- Instagram URL normalization, resolver order, fallback, signed media handoff and health endpoint.
- iPhone Safari file handoff and transcription start.
- No cookies, no credentials, no-referrer, size/timeout limits and CDN allowlist.
- V12-or-newer Service Worker freshness and stale App Shell recovery.
- Tiny/Base/Small/Turbo device selection and fallback plans.
- Per-module q4f16/fp16 mappings, prepare-message reuse and model disposal.
- Silero VAD v5 loading, speech-region merging, non-speech mask, DSP fallback and no-speech rejection.
- `>>`, repeated CJK character, repeated phrase and normal Traditional Chinese fixtures.
- VTT/SRT fixtures, public-link normalization and broad MIME handling.
- Copy, TXT, SRT, VTT, local file, Whisper, WebGPU/WASM, tab capture, microphone and PWA sharing.
- Mobile layout, safe area, 16 px form sizing, focus order, no duplicate IDs, SEO, sitemap, robots and IndexNow.

## Promotion rules

- Public copy may state that speech enhancement reduces background-music interference, not that it perfectly separates every vocal track.
- Public copy may state that Large-v3-turbo is available on capable desktop WebGPU, not that every phone uses it.
- Never claim every Instagram link, codec, platform or video is guaranteed.
- Never describe rejected low-confidence output as successful transcription.
- Do not auto-post, fabricate reviews, buy fake traffic or connect paid ad accounts without explicit authorization.

## Automation rule

Every future UI, resolver, backend, format, model, music suppression, performance, long-video, accuracy, privacy, security, SEO, testing, sharing or promotion change updates all applicable items:

1. `.github/workflows/reelscribe-check.yml`
2. `tests/reelscribe-audit.mjs`
3. `reelscribe/README.md`
4. `reelscribe/OPTIMIZATION.md`
5. `reelscribe/PROMOTION.md` when positioning changes
6. `reelscribe/SECURITY-HARDENING.md` when protection changes
7. The `ReelScribe 自動維護` scheduled task

Automated maintenance applies only small, testable, non-destructive fixes. It must not add paid core dependencies, cookie extraction, login bypass, private scraping, unverified proxy services, tracking or unauthorized advertising.