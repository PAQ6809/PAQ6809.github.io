# ReelScribe Stability Contract

## Incidents addressed

### Renderer memory pressure

iPhone Safari may show that a page "repeatedly had a problem" when the WebContent process is terminated under memory pressure. ReelScribe previously allowed background model preparation, full media decoding and foreground model/OCR startup to overlap.

Required mitigation:

- Mobile devices never automatically preload Whisper on the landing page.
- On mobile, media decoding and speech enhancement finish before demand-loading the model.
- Selecting, dropping or programmatically assigning a file cancels unfinished background model preparation.
- Foreground transcription preempts background preparation.
- OCR and Whisper are mutually exclusive.
- Hidden pages cancel only nonessential background preparation.
- Background preparation has a finite timeout and releases its Worker.

### Restored low-confidence speech subtitles

A prior result such as repeated `I'm`, repeated short phrases, `>>`, or a single repeated CJK character could be saved before the older detector rejected it. Every restored result is now revalidated by current character and token repetition rules; rejected results are deleted before they remain visible.

### OCR mixed-symbol gibberish

Tesseract can report a non-zero confidence for video frames that contain motion, cars, road markings, logos, shadows or stylized captions. The former OCR path accepted any two-character result above a low page-confidence threshold. This allowed output such as:

`x - yo § -- Va ) da J 78 4 fad 9 7 %`

Required mitigation:

- OCR validates page confidence, selected-language script ratio, symbol ratio, digit ratio and one-letter Latin word ratio.
- A small white border and 300 DPI hint are applied to the cropped subtitle region.
- First pass uses grayscale/contrast; only an uncertain frame gets a bright-text binary retry.
- A low-confidence single frame is not written immediately. It needs either high confidence or a similar adjacent-frame observation.
- If all frames are weak, the run reports how many frames were rejected and creates no transcript.
- Restored results containing OCR segments are revalidated; invalid OCR localStorage entries are deleted.
- OCR never guesses replacements for rejected text.

### YouTube public captions false negative

Browser-only timed-text, Piped and Invidious requests may fail because of CORS, instance health or upstream changes even when a YouTube video has public captions. A dedicated public backend reads caption metadata and text only, never the video. Failure still falls through to browser providers.

## Worker resilience

`format-compat.js` may wrap only the same-origin `worker.js`. Tesseract and other workers remain unwrapped.

The model Worker layer may terminate only unfinished background preparation or an explicit preemption. It must automatically create a clean Worker for later foreground transcription and must not interrupt an active foreground transcription.

## YouTube captions backend

- Accept only HTTPS YouTube watch, Shorts, live, embed or youtu.be URLs with a valid 11-character video ID.
- Use public manual or automatic-caption metadata only.
- Never accept browser cookies, account sessions, passwords, private tokens or login bypass instructions.
- Fetch caption data only from HTTPS YouTube or Googlevideo allowlisted hosts.
- Cap individual responses at 4 MB and use finite timeouts.
- Return normalized segments and text with `no-store` and `no-referrer` protections.
- Prefer manual captions, then automatic captions.
- The frontend uses `credentials: omit`, `cache: no-store` and a 45-second timeout.

## Service Worker behavior

- No `skipWaiting()`.
- No `clients.claim()`.
- No `controllerchange` reload.
- No `window.location.reload()`.
- A waiting Service Worker activates after older pages close naturally.
- Critical scripts remain network-first.
- Cache version v15 or newer is required for the OCR quality update.

## Storage and memory rules

- Browser storage estimates are advisory and do not represent available renderer RAM.
- Mobile background preparation remains disabled regardless of apparent quota.
- Low storage, high usage ratio, Data Saver, slow network, low battery or hidden-page state prevents background preparation.
- Small mobile models load on demand after decode.
- Small, Large-v3-turbo, OCR and Whisper must not run concurrently on mobile.
- Media decoding and OCR must avoid unnecessary whole-file, PCM or frame copies.

## Regression requirements

Every relevant change runs:

- `tests/reelscribe-audit.mjs`
- `tests/reelscribe-stability-audit.mjs`
- `tests/reelscribe-youtube-quality-audit.mjs`
- `tests/reelscribe-ocr-quality-audit.mjs`
- `.github/workflows/reelscribe-check.yml`
- `.github/workflows/reelscribe-stability-check.yml`

The stability audits reject:

- forced reload paths;
- `skipWaiting()` and `clients.claim()`;
- automatic mobile warmup;
- simultaneous OCR and speech transcription;
- foreground preparation that does not preempt background preparation;
- unbounded background preparation;
- restored repeated-word or repeated-phrase transcripts;
- OCR mixed-symbol fixtures matching the reported screenshot pattern;
- low-confidence OCR accepted without language plausibility or adjacent-frame confirmation;
- a YouTube resolver that sends credentials or suppresses all fallbacks.

## Security boundary

The stability layer remains local and does not upload media, screenshots, OCR frames, model state or device-storage information. It does not access cookies, passwords, private tokens or account sessions. The YouTube caption endpoint receives only a public URL and optional language preference. Changes must not weaken CSP or introduce unpinned external scripts.