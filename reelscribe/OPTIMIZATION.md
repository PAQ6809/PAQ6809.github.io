# ReelScribe UI Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accessible, secure, and usable on desktop browsers without paid core dependencies.

## Interface rules

1. The first screen focuses on one task: paste a link and get subtitles.
2. The main input and primary action remain visible on common phone screens without horizontal scrolling.
3. Upload, local Whisper, tab capture, and microphone recording stay inside the collapsed fallback section.
4. Light theme remains the default; use white surfaces, subtle borders, restrained shadows, and one blue primary color.
5. Avoid decorative gradients, excessive badges, oversized typography, repeated feature lists, repeated safety explanations, and unnecessary animation.
6. Touch targets are at least 44 CSS pixels high.
7. Widths 320, 375, 390, 430, 768, and 1280 pixels must remain usable without horizontal overflow.
8. Copy is the primary result action; TXT, SRT, and VTT are secondary.
9. Platform and format details belong on `supported-platforms.html`, not repeated on the landing screen.
10. On phone widths, the header is not sticky because it must not cover the hero title, status text, or Safari-restored scroll position.
11. Provider status chips wrap inside the card; they must never extend beyond the viewport or require horizontal scrolling.

## Instagram direct-link rules

- `instagram-direct.js` must load before `universal-link.js` so Instagram receives the dedicated path first.
- The fast resolver `/api/instagram-resolve` runs first; `/api/instagram-yt` is the compatibility fallback.
- The compatibility resolver pins yt-dlp and curl_cffi versions and is updated only after a real public Reel regression test.
- Both backends are public-only and must never accept passwords, browser cookies, session IDs, private tokens, or login bypass instructions.
- Media proxy URLs must be HMAC-signed, short-lived, HTTPS-only, limited to Instagram/Facebook CDN hosts, and capped at 300 MB.
- Backend responses and media are `no-store`; the backend does not persist media or captions.
- The frontend uses `credentials: omit`, `no-referrer`, request timeouts, streaming size checks, and local Whisper.
- Instagram media is handed to the local engine through `window.ReelScribeApp.setFile()` first; `DataTransfer` is only a legacy fallback because iPhone Safari support can be inconsistent.
- The local transcription starts through `window.ReelScribeApp.startTranscription()` when available, rather than depending on a synthetic button click.
- A failed anonymous extraction must display a short truthful fallback message instead of claiming success.
- Private, login-only, age-restricted, region-restricted, removed, DRM, or platform-blocked content is not bypassed.

## PWA freshness rules

- HTML, JavaScript, CSS, workers, and the manifest use a network-first Service Worker path so a stale App Shell cannot hide a newly deployed resolver or quality fix.
- Static icons and other non-critical assets may remain cache-first.
- Every breaking resolver, model-worker, or interface update increments the Service Worker cache version.
- Service Worker registration uses `updateViaCache: "none"` and explicitly calls `registration.update()`.
- A new controller may reload the page once per build through a session-scoped guard; it must not enter a reload loop.
- Critical production-integrity checks include `index.html`, `app.js`, `ui.js`, `ui-polish.css`, `instagram-direct.js`, `universal-link.js`, `worker.js`, and `sw.js`.

## Format and platform rules

- Accept every public HTTPS page as a candidate source.
- Platform-specific success is never universally guaranteed.
- Keep generic handling for platforms that do not expose captions or public media anonymously.
- Accept common video and audio extensions through `format-compat.js` and normalize missing MIME types.
- Browser and operating-system codec support remains the final decoder boundary.

## Long-video and accuracy rules

- `smart` mode is the default.
- Short clips on capable devices may use base; long clips and constrained devices use tiny for speed.
- Long recordings use bounded windows with overlap, silence skipping, duplicate removal, low-confidence rejection, and timestamps.
- Detect Whisper repetition hallucinations using at least longest character run, dominant-character ratio, and n-gram diversity.
- When a transcript is suspicious, retry once using shorter chunks, a repetition penalty, an n-gram repetition block, and a bounded output length.
- A second suspicious result must be rejected, not displayed as a completed transcript.
- Long-form processing may skip only the rejected low-confidence window and continue combining trustworthy windows.
- The UI must remove previously cached repetitive garbage transcripts and clearly explain why they were blocked.
- Do not silently rewrite suspicious repeated text into guessed sentences.
- Do not promise real-time completion or identical accuracy across devices, languages, accents, noise, or codecs.
- Do not raise file-size limits without measured memory-safety review because `decodeAudioData` loads media into memory.

## Performance rules

- Do not add a UI framework or preload Whisper models.
- Keep model inference in a Web Worker and App Shell caching in the Service Worker.
- Keep free subtitle providers parallel, timed out, and independently degradable.
- Cache successful text results locally, but do not persist proxied Instagram media.
- A quality retry runs only after the first result fails the repetition-confidence checks.
- Do not add third-party analytics or advertising scripts without explicit approval and privacy review.

## Security rules

- Keep restrictive CSP and `no-referrer` in the main page.
- Never access `document.cookie`, use `eval`, or construct dynamic functions.
- GitHub Actions use read-only permissions, full-SHA pinned actions, and disabled checkout credentials.
- Maintain `SECURITY.md`, `.github/CODEOWNERS`, `.github/dependabot.yml`, and `reelscribe/SECURITY-HARDENING.md`.
- Production integrity checks compare deployed core assets with repository files.
- Branch rules, signed commits, owner review, force-push blocking, secret scanning, and account 2FA are enabled by the repository owner.
- Vercel resolver signing secrets remain private and are never exposed in the GitHub Pages repository or client JavaScript.

## Required regression checks

- Instagram URL normalization, script order, fast resolver, yt-dlp fallback, signed proxy handoff, and Vercel health endpoint.
- iPhone Safari file handoff through `ReelScribeApp`, with DataTransfer as fallback only.
- Resolver privacy controls: no cookies, no credentials, no-referrer, CDN allowlist, expiry, rate limit, timeout, and size cap.
- Service Worker network-first strategy, cache-version bump, `updateViaCache: none`, controller-change reload guard, and stale App Shell recovery.
- Link resolver, provider status, metadata, and local cache.
- VTT/SRT fixtures, YouTube and generic URL normalization.
- Broad format MIME normalization for chooser and drag-and-drop.
- Smart model selection, silence detection, segmentation, overlap deduplication, repeated-character hallucination detection, guarded retry, and rejection after a second failure.
- Old repetitive subtitles in local storage are removed and not restored into the results panel.
- Copy, TXT, SRT, VTT, local file selection, local Whisper, WebGPU/WASM, tab capture, microphone, PWA sharing.
- SEO, sitemap, robots, IndexNow, safe-area spacing, 16px mobile form sizing, focus order, no duplicate IDs, and no repeated notes section.
- Mobile header must not overlap the hero and provider chips must remain inside the card.

## Promotion rules

- Keep launch copy and UTM conventions in `reelscribe/PROMOTION.md`.
- Promotion may state that public Instagram Reels and video posts have a direct best-effort path, but must disclose that Instagram can block anonymous access and that private/restricted posts are unsupported.
- Never claim every Instagram link, social platform, codec, or video is guaranteed to return subtitles.
- Never describe blocked low-confidence output as a successful transcription.
- Do not auto-post, buy ads, connect ad accounts, fabricate testimonials, force sharing, or use intrusive banners.

## Automation rule

Every future UI, resolver, Instagram backend, format, performance, long-video, accuracy, hallucination protection, privacy, security, SEO, testing, sharing, or promotion optimization updates all applicable items:

1. `.github/workflows/reelscribe-check.yml`
2. `tests/reelscribe-audit.mjs`
3. `reelscribe/README.md`
4. `reelscribe/OPTIMIZATION.md`
5. `reelscribe/PROMOTION.md` when public positioning changes
6. `reelscribe/SECURITY-HARDENING.md` when protection changes
7. The `ReelScribe 自動維護` scheduled task

Automated maintenance applies only small, testable, non-destructive fixes. It must not add paid core dependencies, cookie extraction, login bypass, private scraping, unverified public proxy services, tracking, or unauthorized advertising.