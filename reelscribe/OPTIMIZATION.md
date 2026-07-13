# ReelScribe Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accurate, secure, storage-aware and usable without paid core dependencies.

## Interface rules

1. The first screen focuses on one task: paste a link and get subtitles.
2. The input and primary action remain visible on 320, 375, 390, 430, 768 and 1280 px widths without horizontal scrolling.
3. Upload, local Whisper, tab capture, microphone, OCR, model and enhancement controls stay in the collapsed fallback section.
4. Light theme remains the default; avoid decorative gradients, excessive badges, repeated feature lists and unnecessary animation.
5. Touch targets are at least 44 CSS pixels high.
6. Copy remains the primary result action; TXT, SRT and VTT are secondary.
7. On phone widths the header is not sticky, provider chips wrap inside their card and Safari browser chrome must not cover essential controls.
8. Model progress, storage status and OCR status reserve stable minimum heights before text changes.
9. Model-loading mode suppresses nonessential animation and transitions.
10. Model options exist in initial HTML; JavaScript may disable unsuitable options but must not insert them after first paint.

## Storage, memory and background preparation

- Read storage information only through standard browser APIs such as `navigator.storage.estimate()`, `persisted()` and `persist()`.
- Storage estimates are advisory and do not represent renderer RAM.
- Mobile devices never automatically preload Whisper on the landing page.
- On mobile, media decode and speech enhancement finish before demand-loading Tiny or Base.
- Desktop background preparation runs only while no file is selected, no foreground processing is active, the page is visible, storage is sufficient, Data Saver is off and battery/network conditions are acceptable.
- Conservative thresholds remain approximately 260 MB mobile, 420 MB desktop and 82% usage pressure unless measured browser tests justify changes.
- Small and Large-v3-turbo are never automatically downloaded at page load.
- A foreground file, Instagram handoff, OCR start or transcription preempts unfinished background model preparation.
- OCR and Whisper are mutually exclusive on memory-constrained browsers.
- AI-cache removal must not delete the App Shell or transcript text.
- Cache pressure must never intentionally reload the page.

## PWA update and no-reload rules

- HTML, JavaScript, CSS, workers and manifest use network-first caching.
- Static icons may remain cache-first.
- Every breaking model-worker, OCR, enhancement, resolver or interface change increments the Service Worker cache version.
- Service Worker registration may use `updateViaCache: "none"` and `registration.update()`.
- The Service Worker must not call `skipWaiting()` or `clients.claim()` while an older client may be active.
- App and UI scripts must not reload on `controllerchange` or call `window.location.reload()` for updates.
- A waiting update applies after existing tabs close or on the next natural visit.
- Cache cleanup only deletes `reelscribe-shell-*` caches.
- Service Worker v15 or newer is required for the current OCR quality guard.
- Production comparison includes `index.html`, `app.js`, `ui.js`, `styles.css`, `ui-polish.css`, `runtime.css`, `speech-enhancer.js`, `runtime-optimizer.js`, `screen-ocr.js`, `instagram-direct.js`, `universal-link.js`, `worker.js` and `sw.js`.

## Screen OCR rules

- OCR recognizes text visibly burned into local video frames; it is not scene understanding.
- Tesseract.js is version-pinned and loaded only after the user starts OCR.
- Frames are captured from the local `<video>` element through Canvas; frames, screenshots and recognized text are not uploaded.
- The default crop is the lower 45%; users may select a bounded lower-frame crop.
- Mobile processes at most 60 sampled frames; desktop at most 120 unless measured memory tests justify changes.
- Long videos automatically increase the sampling interval.
- Each crop receives a small white border and a 300 DPI hint.
- The first pass uses grayscale and restrained contrast. Only an uncertain frame receives a second bright-text binarization pass.
- OCR languages follow the selected language, with Traditional Chinese plus English as the default Chinese path.
- Quality filtering checks Tesseract confidence, script consistency, symbol ratio, digit ratio, single-letter-word ratio and the global hallucination guard.
- Mixed garbage such as `x - yo § J 78 9%` must be rejected even when Tesseract reports a high page confidence.
- A low-confidence single frame is not written immediately. It needs either high confidence or a similar adjacent-frame observation.
- Similar consecutive OCR results are merged; an OCR segment may replace an overlapping speech segment only when explicitly enabled.
- If every frame is weak, show a truthful failure with rejected-frame count and do not create a transcript.
- Previously cached OCR results are revalidated on restore; invalid OCR transcripts are removed from localStorage.
- Tesseract workers terminate after completion, stop or failure.
- OCR cache writes are disabled under storage pressure.
- OCR failure must not break speech transcription.

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

- `/api/youtube-captions` is attempted before timed-text, Piped and Invidious.
- It accepts only HTTPS YouTube watch, Shorts, live, embed or youtu.be links with a valid 11-character video ID.
- It reads public manual captions first and public automatic captions second; it does not download or store video media.
- It never accepts cookies, account sessions, passwords, private tokens or login bypass instructions.
- Caption downloads are restricted to HTTPS YouTube and Googlevideo hosts, finite timeouts and 4 MB.
- The frontend uses `credentials: omit`, `no-referrer`, `cache: no-store` and a 45-second timeout.
- Dedicated-backend failure falls through to browser providers rather than returning false success.

## Speech enhancement and model rules

- `speech-enhancer.js` loads before `app.js`.
- ONNX Runtime Web and Silero VAD are lazy-loaded only for local speech enhancement.
- External versions remain pinned and scheduled CI checks upstream availability.
- Mid/Side analysis, restrained speech-band filtering, padded VAD regions and bounded gain may reduce background-music interference.
- No-speech output is rejected instead of asking Whisper to guess from music.
- Songs may disable VAD/music suppression.
- The model tiers are Tiny, Base, Small and Large-v3-turbo.
- Smart mode considers duration, WebGPU, mobile status, memory, CPU, Data Saver, network and storage pressure.
- Large-v3-turbo and Small are desktop WebGPU only; WASM uses q8 Base/Tiny.
- Fallback order is `Turbo → Small → Base → Tiny → WASM Base/Tiny`.
- No model is render-blocking.

## Accuracy and hallucination rules

- Long recordings use bounded windows, overlap, silence skipping, duplicate removal, low-confidence rejection and timestamps.
- Hallucination detection includes repeated characters, symbols, repeated words, repeated phrases and one-to-four-token n-grams.
- `>>`, repeated punctuation, repeated single characters, repeated `I'm` and repeated boilerplate are rejected.
- Suspicious speech output gets one guarded retry; a second suspicious result is rejected.
- Long-form processing may skip only the rejected window and continue with trustworthy windows.
- Every restored localStorage result is revalidated.
- Do not rewrite low-confidence output into guessed sentences.
- Do not promise perfect accuracy, real-time completion or identical performance across devices.

## Performance and security rules

- Do not add a UI framework.
- Keep Whisper in a Web Worker and the App Shell in the Service Worker.
- Keep provider requests parallel, timed out and independently degradable.
- Cache successful text locally but never persist proxied Instagram media or OCR frames.
- Run expensive OCR/Whisper retries only after the first quality check fails.
- Avoid unnecessary whole-file or PCM copies.
- Keep restrictive CSP and `no-referrer`.
- Never access `document.cookie`, use `eval`, construct dynamic functions, upload OCR frames or use remote screenshot analysis.
- External packages are pinned and health-checked.
- GitHub Actions use read-only permissions, full-SHA-pinned actions and disabled checkout credentials.
- Maintain `SECURITY.md`, `.github/CODEOWNERS`, `.github/dependabot.yml` and `reelscribe/SECURITY-HARDENING.md`.

## Required regression checks

- Instagram resolver order, signed handoff and iPhone transcription start.
- YouTube dedicated captions endpoint, fallback and segment import.
- No forced reload, `skipWaiting`, `clients.claim` or controller-change reload.
- Mobile no-preload, background preemption, OCR/Whisper mutual exclusion and bounded background timeout.
- Storage estimate, thresholds, Data Saver and cache cleanup.
- Tesseract 7 loading, local crop, 300 DPI, white border, contrast pass, bright-text retry, language fit, confidence rejection, adjacent-frame confirmation, OCR deduplication and worker termination.
- OCR fixtures include clear Traditional Chinese, English, Japanese and Korean plus mixed-symbol garbage matching the reported screenshot pattern.
- Tiny/Base/Small/Turbo selection, VAD, music suppression and hallucination fixtures.
- Copy, TXT, SRT, VTT, local file, tab capture, microphone and PWA sharing.
- Mobile layout, safe area, focus order, SEO, sitemap, robots and IndexNow.

## Research-first automation rule

Every scheduled maintenance run begins by checking current first-party or primary sources relevant to the contemplated change: browser-vendor documentation, official Hugging Face repositories, Tesseract/Tesseract.js upstream, Silero VAD, ONNX Runtime, yt-dlp and platform documentation.

Research does not grant permission to install a feature. A candidate is applied only when it is free for the core workflow, version-pinnable, compatible with CSP and privacy rules, testable without private credentials, independently degradable and unlikely to increase mobile crashes or cache eviction.

Every applicable change updates:

1. `.github/workflows/reelscribe-check.yml`
2. `.github/workflows/reelscribe-stability-check.yml`
3. `tests/reelscribe-audit.mjs`
4. `tests/reelscribe-stability-audit.mjs`
5. relevant focused audits such as `tests/reelscribe-youtube-quality-audit.mjs` and `tests/reelscribe-ocr-quality-audit.mjs`
6. `reelscribe/README.md`
7. `reelscribe/OPTIMIZATION.md`
8. `reelscribe/STABILITY.md`
9. `reelscribe/PROMOTION.md` when positioning changes
10. `reelscribe/SECURITY-HARDENING.md` when protection changes
11. the `ReelScribe 自動維護` scheduled task

Automated maintenance applies only small, testable, non-destructive fixes. It must not add paid core dependencies, cookie extraction, login bypass, private scraping, unverified public proxies, tracking or unauthorized advertising.