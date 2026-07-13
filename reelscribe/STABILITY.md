# ReelScribe Stability Contract

## Incidents addressed

### Renderer memory pressure

iPhone Safari may show that a page "repeatedly had a problem" when the WebContent process is terminated under memory pressure. ReelScribe previously allowed three heavy operations to overlap:

1. background ONNX/Whisper model preparation;
2. full media file reading and `decodeAudioData()`;
3. foreground model selection or OCR startup.

A second foreground `prepare` message could arrive while a different background model was still loading. On memory-constrained browsers this could create concurrent model downloads, duplicate pipelines, decoded PCM, and video buffers in the same renderer process.

### Restored low-confidence subtitles

A prior result such as repeated `I'm`, repeated short phrases, `>>`, or a single repeated CJK character could be saved to local storage before the old character-only detector rejected it. On the next visit, the result appeared as "restored" even though it was not trustworthy.

The quality guard now evaluates token dominance, token diversity, consecutive token runs, repeated one-to-four-token n-grams, character diversity, symbol ratio, repeating units, and character runs. A matching saved result is deleted before it can remain visible.

### YouTube public captions false negative

Browser-only timed-text, Piped, and Invidious requests may fail because of CORS, instance health, or upstream changes even when a YouTube video has public manual or automatic captions. The dedicated public backend now uses pinned yt-dlp metadata extraction to retrieve caption tracks only. It does not download or store the video. If that backend fails, the browser still falls back to the existing public caption providers.

## Required runtime behavior

- Mobile devices never automatically preload Whisper on the landing page.
- On mobile, the early foreground `prepare` message is deferred; the `transcribe` message loads the model only after media decoding and speech enhancement finish.
- Selecting or dropping a file immediately cancels an unfinished background model Worker.
- Programmatic Instagram file handoff follows the same cancellation path.
- Desktop background preparation may run only while no file is selected, no transcription is active, the page is visible, storage is sufficient, Data Saver is off, and battery conditions are acceptable.
- A foreground transcription always preempts unfinished background preparation.
- OCR and Whisper transcription are mutually exclusive.
- Hidden pages cancel only nonessential background preparation; an active foreground transcription is not intentionally terminated.
- Background preparation has a finite timeout and must release its Worker on timeout.
- A restored transcript is never trusted solely because it was previously saved; the current quality guard revalidates it.
- Repeated English words and phrases are rejected in addition to repeated symbols and characters.

## Worker resilience

`format-compat.js` may install a narrow Worker proxy only for same-origin `worker.js`. Other workers, including Tesseract workers, are not wrapped.

A resilient proxy, when present:

- forwards message and error events through an `EventTarget`-compatible interface;
- can immediately terminate a background model Worker;
- automatically creates a fresh native Worker when the application later posts a foreground transcription;
- serializes mobile decode and model load;
- prevents background and foreground model plans from loading concurrently.

`Worker.terminate()` is used only for nonessential background preparation or an explicit preemption. It is not used to interrupt a foreground transcription.

## YouTube captions backend

- Accept only HTTPS YouTube watch, Shorts, live, embed, or youtu.be URLs with a valid 11-character video ID.
- Use public subtitle and automatic-caption metadata only.
- Never accept browser cookies, account sessions, passwords, private tokens, or login bypass instructions.
- Fetch caption data only from an HTTPS YouTube or Googlevideo allowlist.
- Cap individual caption responses at 4 MB and use finite extraction and network timeouts.
- Return normalized timed segments and plain text with `no-store` and `no-referrer` protections.
- Prefer manual captions when available, then automatic captions.
- The frontend uses `credentials: omit`, `cache: no-store`, and a 45-second timeout.
- Failure of the dedicated backend must fall through to the browser's public caption providers rather than producing a false success.

## Service Worker behavior

- No `skipWaiting()`.
- No `clients.claim()`.
- No `controllerchange` reload.
- No `window.location.reload()`.
- A waiting Service Worker activates after older pages close naturally.
- Critical scripts remain network-first so the next clean opening receives current code.
- Cache version v14 or newer is required for the repeated-token and YouTube resolver update.

## Storage and memory rules

- Browser storage estimates are advisory, not guarantees.
- Mobile background preparation is disabled regardless of an apparently large quota because storage quota does not represent available renderer RAM.
- Low storage, high usage ratio, Data Saver, slow network, low battery, or hidden-page state prevents background preparation.
- Small mobile models are loaded on demand after decode.
- Small, Large-v3-turbo, OCR, and Whisper must not run concurrently on mobile.
- Media decoding must avoid unnecessary whole-file copies in future changes.

## Regression requirements

Every relevant change must run:

- `tests/reelscribe-audit.mjs`
- `tests/reelscribe-stability-audit.mjs`
- `tests/reelscribe-youtube-quality-audit.mjs`
- `.github/workflows/reelscribe-check.yml`
- `.github/workflows/reelscribe-stability-check.yml`

The stability audits must continue to reject:

- forced reload paths;
- `skipWaiting()` and `clients.claim()`;
- automatic mobile warmup;
- simultaneous OCR and speech transcription;
- foreground preparation that does not preempt a background model Worker;
- unbounded background preparation;
- restored repeated-word or repeated-phrase transcripts;
- a YouTube resolver that sends credentials or silently suppresses all public-provider fallbacks.

## Security boundary

The stability layer remains local and does not upload media, screenshots, model state, or device-storage information. It does not access cookies, passwords, private tokens, or account sessions. The YouTube caption endpoint receives only a public URL and optional language preference, returns public caption text, and does not store video media. Changes must not weaken CSP or introduce unpinned external scripts.