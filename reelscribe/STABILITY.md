# ReelScribe Stability Contract

## Incident addressed

iPhone Safari may show that a page "repeatedly had a problem" when the WebContent process is terminated under memory pressure. ReelScribe previously allowed three heavy operations to overlap:

1. background ONNX/Whisper model preparation;
2. full media file reading and `decodeAudioData()`;
3. foreground model selection or OCR startup.

A second foreground `prepare` message could arrive while a different background model was still loading. On memory-constrained browsers this could create concurrent model downloads, duplicate pipelines, decoded PCM, and video buffers in the same renderer process.

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

## Worker resilience

`format-compat.js` installs a narrow Worker proxy only for same-origin `worker.js`. Other workers, including Tesseract workers, are not wrapped.

The proxy:

- forwards message and error events through an `EventTarget`-compatible interface;
- can immediately terminate a background model Worker;
- automatically creates a fresh native Worker when the application later posts a foreground transcription;
- serializes mobile decode and model load;
- prevents background and foreground model plans from loading concurrently.

`Worker.terminate()` is used only for nonessential background preparation or an explicit preemption. It is not used to interrupt a foreground transcription.

## Service Worker behavior

- No `skipWaiting()`.
- No `clients.claim()`.
- No `controllerchange` reload.
- No `window.location.reload()`.
- A waiting Service Worker activates after older pages close naturally.
- Critical scripts remain network-first so the next clean opening receives current code.

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
- `.github/workflows/reelscribe-check.yml`
- `.github/workflows/reelscribe-stability-check.yml`

The stability audit must continue to reject:

- forced reload paths;
- `skipWaiting()` and `clients.claim()`;
- automatic mobile warmup;
- simultaneous OCR and speech transcription;
- foreground preparation that does not preempt a background model Worker;
- unbounded background preparation.

## Security boundary

The stability layer remains local and does not upload media, screenshots, model state, or device-storage information. It does not access cookies, passwords, private tokens, or account sessions. It must not weaken CSP or introduce unpinned external scripts.