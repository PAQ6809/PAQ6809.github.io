# ReelScribe Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accurate, secure, storage-aware and usable without paid core dependencies.

## Interface rules

1. The first screen focuses on one task: paste a link and get subtitles.
2. The input and primary action remain visible on common phone screens without horizontal scrolling.
3. Upload, local Whisper, tab capture, microphone, OCR, model and enhancement controls stay in the collapsed fallback section.
4. Light theme remains the default; avoid decorative gradients, excessive badges, repeated feature lists and unnecessary animation.
5. Touch targets are at least 44 CSS pixels high.
6. Widths 320, 375, 390, 430, 768 and 1280 pixels remain usable.
7. Copy remains the primary result action; TXT, SRT and VTT are secondary.
8. On phone widths the header is not sticky, and provider chips wrap inside their card.
9. The music-suppression control is enabled by default and notes that song/lyric transcription may require disabling it.
10. Model progress, storage status and OCR status reserve stable minimum heights before text changes.
11. Model-loading mode suppresses nonessential animations and transitions to avoid layout shifts.
12. Model options are present in initial HTML; JavaScript may disable unsuitable options but must not insert options after first paint.

## Storage and background preparation rules

- Read storage information only through standard browser APIs such as `navigator.storage.estimate()`, `persisted()` and `persist()`.
- Storage estimates are advisory; the app must remain usable when quota or persistence information is unavailable.
- Background model preparation is best-effort and starts only while the page is visible, during idle time, with sufficient storage, acceptable battery and no Data Saver/slow-network signal.
- Conservative free-space thresholds remain at least approximately 220 MB on mobile and 420 MB on desktop unless measured browser tests justify a change.
- When estimated cache usage reaches roughly 86% or remaining space is below the threshold, background preparation stops and local transcription falls back to Tiny.
- Mobile background preparation is limited to Tiny; normal desktop WebGPU background preparation is limited to Base.
- Small and Large-v3-turbo are never automatically downloaded at page load.
- A user may manually request preparation after receiving a truthful storage/network warning.
- The app exposes a clear AI-cache removal control that does not delete the App Shell or transcript text.
- OCR uses a no-write cache mode when storage is constrained.
- Model/OCR cache pressure must never trigger an intentional page reload.

## PWA update and no-reload rules

- HTML, JavaScript, CSS, workers and manifest use network-first caching.
- Static icons may remain cache-first.
- Every model-worker, OCR, enhancement, resolver or breaking interface update increments the Service Worker cache version.
- Service Worker registration uses `updateViaCache: "none"` and may call `registration.update()`.
- The Service Worker must not call `skipWaiting()` or `clients.claim()` while a previous version may have an open client.
- App and UI scripts must not reload the page on `controllerchange` or call `window.location.reload()` for updates.
- A waiting update is announced non-disruptively and applies after existing tabs close or on the next natural visit.
- Cache cleanup only deletes ReelScribe App Shell caches by prefix; it does not broadly delete model, OCR or unrelated origin caches.
- Service Worker v14 or newer is required for the repeated-token quality guard and YouTube captions fallback.
- Critical production comparison includes `index.html`, `app.js`, `ui.js`, `styles.css`, `ui-polish.css`, `runtime.css`, `speech-enhancer.js`, `runtime-optimizer.js`, `screen-ocr.js`, `instagram-direct.js`, `universal-link.js`, `worker.js` and `sw.js`.

## Screen OCR rules

- Screen OCR is optional and explicitly described as recognition of text visibly burned into video frames, not scene understanding.
- Tesseract.js is version-pinned and loaded only after the user starts OCR.
- OCR captures frames from the local `<video>` element through Canvas; frames, screenshots and recognized text are not uploaded.
- The default crop is the lower 45% of the frame; users may select a bounded lower-frame crop.
- Mobile OCR processes at most 60 sampled frames per pass; desktop processes at most 120 unless measured memory tests justify a change.
- Long videos automatically increase the sampling interval to remain within the frame cap.
- Frames receive limited grayscale/contrast preprocessing, not destructive filters that make text unreadable.
- OCR languages follow the user's selected language, with Traditional Chinese plus English as the default Chinese path.
- Low-confidence, symbol-only and hallucinated text is rejected.
- Similar consecutive OCR results are merged; an OCR segment may replace an overlapping speech segment only when explicitly enabled.
- Tesseract workers terminate after completion, stop or failure to release memory.
- OCR cache writes are disabled under storage pressure.
- OCR must remain usable independently of Whisper; failure to load OCR must not break speech transcription.

## Instagram direct-link rules

- `instagram-direct.js` loads before `universal-link.js`.
- `/api/instagram-resolve` runs first; `/api/instagram-yt` is the compatibility fallback.
- Backends never accept passwords, cookies, sessions, private tokens or login bypass instructions.
- Media URLs are short-lived, HMAC-signed, HTTPS-only, limited to Instagram/Facebook CDN hosts and capped at 300 MB.
- Backend responses are `no-store`; media and captions are not persisted.
- The frontend uses `credentials: omit`, `no-referrer`, timeouts and streaming size checks.
- iPhone Safari uses `window.ReelScribeApp.setFile()` and `startTranscription()`; `DataTransfer` is legacy fallback only.
- Private, login-only, age/region restricted, removed, DRM or platform-blocked content is not bypassed.

## YouTube captions rules

- A dedicated `/api/youtube-captions` endpoint is attempted before the browser-only timed-text, Piped and Invidious fallbacks.
- The endpoint accepts only HTTPS YouTube watch, Shorts, live, embed or youtu.be links with a valid 11-character video ID.
- It reads public manual captions first and public automatic captions second; it does not download or store video media.
- It never accepts cookies, account sessions, passwords, private tokens or login bypass instructions.
- Caption downloads are restricted to HTTPS YouTube and Googlevideo hosts, use finite timeouts and are capped at 4 MB.
- The frontend uses `credentials: omit`, `no-referrer`, `cache: no-store` and a 45-second timeout.
- A dedicated-backend failure must fall through to timed-text, Piped and Invidious rather than returning a false success.
- Returned caption segments are imported into the existing editor and retain copy, TXT, SRT and VTT export.

## Speech enhancement rules

- `speech-enhancer.js` loads before `app.js` and remains dependency-free at build time.
- ONNX Runtime Web and `@ricky0123/vad-web` are lazy-loaded only when local speech enhancement is used.
- External runtime versions remain pinned and are checked by scheduled CI.
- Silero VAD v5 uses `NonRealTimeVAD` on the already-decoded 16 kHz Float32Array.
- Stereo input may use Mid/Side analysis to emphasize center-panned speech; mono input remains unchanged before filtering.
- The lightweight speech band uses a low-frequency high-pass, restrained presence boost and high-frequency low-pass.
- VAD speech regions receive short padding and merge across small gaps to prevent clipped words.
- Non-speech regions are strongly attenuated with fades, not abruptly deleted, so timestamps remain aligned.
- Speech gain normalization is bounded to prevent clipping and pumping.
- When VAD finds no speech, reject transcription instead of asking Whisper to guess from music.
- If VAD assets fail, use DSP fallback and never silently upload audio.
- Song and lyric recognition may bypass VAD/music suppression because singing is not ordinary speech.

## Model architecture rules

- The local stack contains four multilingual tiers:
  - Tiny: phone, long video, low resources and WASM.
  - Base: normal clips and mobile WebGPU.
  - Small: desktop WebGPU precision.
  - Large-v3-turbo: capable desktop WebGPU flagship mode.
- Smart mode considers duration, WebGPU, mobile detection, memory, CPU cores, Data Saver, network type and storage pressure.
- Large-v3-turbo is never forced on a phone and is not used on slow/data-saving connections.
- Large-v3-turbo WebGPU uses per-module q4f16 for encoder and merged decoder.
- Small/Base/Tiny WebGPU prefer encoder fp16 and merged decoder q4f16, then full fp16 if required.
- WASM uses q8 and never loads Large-v3-turbo or Small.
- The fallback chain is `Turbo → Small → Base → Tiny → WASM Base/Tiny`.
- Model switching disposes the previous pipeline when practical.
- A `prepare` message may start model loading while media decode and VAD run; actual transcription reuses the same in-flight or loaded pipeline.
- No model is a render-blocking page dependency.
- Model download progress, selected model, storage fallback and compatibility fallback remain visible and truthful.

## Accuracy and hallucination rules

- `smart` is the default mode.
- Long recordings use bounded windows, overlap, silence skipping, duplicate removal, low-confidence rejection and timestamps.
- Hallucination detection includes repeated character runs, dominant and unique character ratios, bigram diversity, repeating character patterns, symbol-only output, repeated word dominance, word diversity, consecutive word runs and repeated one-to-four-word n-grams.
- `>>`, repeated punctuation, repeated single characters, repeated `I'm`, repeated boilerplate and repeated phrases are rejected.
- Suspicious output gets one retry with shorter chunks, repetition penalty, n-gram blocking and bounded output length.
- A second suspicious result is rejected, never displayed as completed subtitles.
- Long-form processing may skip the rejected window and continue with trustworthy windows.
- Every restored localStorage result is revalidated with the current quality guard.
- Cached repetitive garbage is deleted before it can remain visible as an old restored transcript.
- Do not silently rewrite low-confidence output into guessed sentences.
- Do not promise perfect accuracy, real-time completion or identical performance across devices and audio conditions.

## Performance rules

- Do not add a UI framework.
- Keep Whisper in a Web Worker and App Shell caching in the Service Worker.
- Background preparation must be conservative; actual model loading remains demand-driven when conditions are unsuitable.
- Keep provider requests parallel, timed out and independently degradable.
- Cache successful text locally but never persist proxied Instagram media.
- Run expensive recognition retries only after confidence checks fail.
- Avoid copying multi-hour PCM arrays unnecessarily; file-size and memory limits remain conservative.
- OCR yields between frames to keep the interface responsive and destroys temporary canvases after use.
- Do not add analytics or advertising scripts without explicit approval and privacy review.

## Security rules

- Keep restrictive CSP and `no-referrer`.
- Never access `document.cookie`, use `eval`, or construct dynamic functions.
- OCR must not use `FormData`, upload endpoints or remote screenshot analysis.
- External CDN packages are pinned to explicit versions and health-checked.
- GitHub Actions use read-only permissions, full-SHA-pinned actions and disabled checkout credentials.
- Maintain `SECURITY.md`, `.github/CODEOWNERS`, `.github/dependabot.yml` and `reelscribe/SECURITY-HARDENING.md`.
- Production integrity checks compare deployed assets with repository files.
- Vercel signing secrets stay private and never enter client JavaScript.
- Repository owner enables 2FA/passkey, branch rules, signed commits, owner review, force-push blocking, secret scanning and push protection.

## Required regression checks

- Instagram URL normalization, resolver order, fallback, signed media handoff and health endpoint.
- YouTube URL normalization, dedicated captions endpoint contract, browser-provider fallback and segment import.
- iPhone Safari file handoff and transcription start.
- No cookies, credentials, screenshot uploads, login bypass, unsafe dynamic code or private media persistence.
- V14-or-newer Service Worker has no `skipWaiting`, `clients.claim`, forced reload or controller-change reload.
- Storage estimate, persistence request, threshold fallback, Data Saver handling, manual preparation and AI-cache cleanup.
- Stable progress panel, static model options, reduced animation and no horizontal overflow.
- Tesseract 7 loading, local frame crop, mobile/desktop frame caps, confidence rejection, OCR deduplication, timeline merge and worker termination.
- Tiny/Base/Small/Turbo device selection and fallback plans.
- Per-module q4f16/fp16 mappings, prepare-message reuse and model disposal.
- Silero VAD v5 loading, speech-region merging, non-speech mask, DSP fallback and no-speech rejection.
- `>>`, repeated CJK character, repeated English word, repeated phrase and normal Traditional Chinese fixtures.
- VTT/SRT fixtures, public-link normalization and broad MIME handling.
- Copy, TXT, SRT, VTT, local file, Whisper, WebGPU/WASM, tab capture, microphone and PWA sharing.
- Mobile layout, safe area, 16 px form sizing, focus order, no duplicate IDs, SEO, sitemap, robots and IndexNow.

## Promotion rules

- Public copy may state that speech enhancement reduces background-music interference, not that it perfectly separates every vocal track.
- Public copy may state that OCR reads visible burned-in subtitles locally, not that it understands every frame or guarantees accuracy.
- Public copy may state that background preparation can reduce later waiting when storage, battery and network permit, not that every browser keeps the model permanently.
- Public copy may state that public YouTube manual or automatic captions use a text-only resolver, not that every YouTube video has captions.
- Never claim every Instagram link, codec, platform or video is guaranteed.
- Never describe rejected low-confidence output as successful transcription.
- Do not auto-post, fabricate reviews, buy fake traffic or connect paid ad accounts without explicit authorization.

## Research-first automation rule

Every scheduled maintenance run begins by checking current first-party or primary public sources relevant to the contemplated change, such as MDN/browser-vendor documentation, official Hugging Face model repositories and documentation, official package releases, upstream GitHub repositories, yt-dlp upstream and platform documentation.

Research does not grant automatic permission to install a feature. A candidate is applied only when it is:

- free for the core workflow;
- compatible with current CSP and privacy rules;
- version-pinnable and independently degradable;
- testable without private credentials or user data;
- unlikely to increase mobile crashes, cache eviction or forced reloads;
- legally and operationally appropriate for public content.

Every future UI, resolver, backend, format, model, OCR, storage, Service Worker, music suppression, performance, long-video, accuracy, privacy, security, SEO, testing, sharing or promotion change updates all applicable items:

1. `.github/workflows/reelscribe-check.yml`
2. `.github/workflows/reelscribe-stability-check.yml`
3. `tests/reelscribe-audit.mjs`
4. `tests/reelscribe-stability-audit.mjs`
5. `tests/reelscribe-youtube-quality-audit.mjs`
6. `reelscribe/README.md`
7. `reelscribe/OPTIMIZATION.md`
8. `reelscribe/STABILITY.md`
9. `reelscribe/PROMOTION.md` when positioning changes
10. `reelscribe/SECURITY-HARDENING.md` when protection changes
11. The `ReelScribe 自動維護` scheduled task

Automated maintenance applies only small, testable, non-destructive fixes. It must not add paid core dependencies, cookie extraction, login bypass, private scraping, unverified proxy services, tracking, automatic third-party uploads or unauthorized advertising.