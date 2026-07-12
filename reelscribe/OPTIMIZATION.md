# ReelScribe UI Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accessible, secure, and fully usable on desktop browsers without introducing paid core dependencies.

## Interface rules

1. The first screen must focus on one task: paste a link and get subtitles.
2. The main input and primary action must remain visible on common phone screens without horizontal scrolling.
3. Upload, local Whisper, tab capture, and microphone recording stay inside the collapsed fallback section.
4. Light theme is the default and only visual theme unless a future change is explicitly approved.
5. Use white surfaces, subtle borders, restrained shadows, and one blue primary color.
6. Avoid decorative gradients, excessive badges, oversized typography, repeated feature lists, repeated safety explanations, and unnecessary animation.
7. Touch targets must be at least 44 CSS pixels high.
8. Mobile widths 320, 375, 390, and 430 pixels must not overflow horizontally.
9. Tablet width 768 pixels and desktop widths 1280 pixels or above must keep readable line lengths and centered content.
10. Copy is the primary result action; TXT, SRT, and VTT are secondary actions.
11. A compact share action may appear in the header and footer, but promotion must not interrupt the subtitle workflow.
12. Platform and format details belong on `supported-platforms.html`, not as repeated blocks on the landing screen.

## Accessibility rules

- Preserve visible labels or screen-reader labels.
- Keep clear `:focus-visible` styles.
- Preserve live regions for resolver and processing status.
- Use native `details` and `summary` for fallback disclosure.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone to communicate success or failure.

## Format and platform rules

- Accept every public HTTPS page as a candidate source.
- Platform-specific success is never guaranteed; direct-link subtitle extraction requires a public caption or text track.
- Keep generic handling for platforms that do not expose captions anonymously.
- Accept common video and audio extensions through `format-compat.js` and normalize missing MIME types before the core file handler runs.
- Browser and operating-system codec support remains the final decoder boundary.
- Never add login bypass, DRM circumvention, cookie extraction, private-content scraping, or an unofficial service that requires user session data.

## Long-video and accuracy rules

- `smart` mode is the default.
- Short clips on capable devices may use the base model; long clips and constrained devices use the tiny model for speed.
- Long recordings must be processed in bounded windows with overlap.
- Skip mostly silent windows to reduce wasted inference.
- Remove overlap duplicates when merging windows.
- Keep timestamp output for TXT, SRT, and VTT workflows.
- Do not promise real-time completion or identical accuracy across devices, languages, accents, noise levels, or codecs.
- Do not raise file-size limits without a measured memory-safety review because `decodeAudioData` loads media into memory.

## Performance rules

- Do not add a UI framework.
- Do not preload Whisper models.
- Keep the first page static and lightweight.
- Keep model inference in a Web Worker.
- Keep Service Worker App Shell caching.
- Keep free subtitle provider requests parallel, timed out, and independently degradable.
- Cache successful link transcripts locally.
- Do not add third-party analytics or advertising scripts without explicit approval and a privacy review.

## Security rules

- Keep a restrictive Content Security Policy and `no-referrer` policy in the main page.
- Never access `document.cookie`, use `eval`, or construct dynamic functions.
- GitHub Actions must use read-only permissions and pin third-party actions to full commit SHAs.
- Keep checkout credentials disabled in CI.
- Maintain `SECURITY.md`, `.github/CODEOWNERS`, `.github/dependabot.yml`, and `reelscribe/SECURITY-HARDENING.md`.
- Production integrity checks must compare deployed core assets with repository files.
- Branch rules, signed commits, owner review, force-push blocking, secret scanning, and account 2FA must be enabled in GitHub settings by the repository owner.

## Required regression checks

- Link resolver, provider status, metadata, and local cache.
- Actual VTT and SRT parsing fixtures through `tests/reelscribe-audit.mjs`.
- URL normalization for YouTube, known social links, generic public pages, and direct subtitle links.
- Broad format MIME normalization for chooser and drag-and-drop flows.
- Smart model selection, silence detection, long-video segmentation, and overlap deduplication.
- Copy, TXT, SRT, and VTT.
- Local file selection and drag-and-drop.
- Local Whisper and WebGPU/WASM fallback.
- Desktop tab-audio capture and microphone recording.
- Mobile PWA share target and website share button.
- Canonical, Open Graph, Twitter Card, JSON-LD, sitemap, robots.txt, and IndexNow ownership file.
- iPhone safe-area spacing and 16px form font sizing.
- No horizontal overflow at 320px.
- Keyboard focus order and visible focus ring.
- No duplicate HTML IDs and no return of the removed repetitive notes section.
- Workflow action references are full SHAs and the workflow token remains read-only.

## Promotion rules

- Keep launch copy and UTM conventions in `reelscribe/PROMOTION.md`.
- Organic promotion should demonstrate the real workflow and disclose unsupported/private-content limitations.
- Never claim every social platform, codec, or video is guaranteed to return subtitles.
- IndexNow may be used to notify participating search engines after verified deployment.
- Do not auto-post to social accounts, buy ads, spend money, or connect advertising accounts without explicit user approval and account access.
- Do not add fake testimonials, fake usage numbers, dark patterns, forced sharing, or intrusive banners.

## Automation rule

Every future UI, resolver, format, performance, long-video, accuracy, privacy, security, SEO, testing, sharing, or promotion optimization must update all applicable items:

1. `.github/workflows/reelscribe-check.yml`
2. `tests/reelscribe-audit.mjs`
3. `reelscribe/OPTIMIZATION.md`
4. `reelscribe/PROMOTION.md` when public positioning or campaign material changes
5. `reelscribe/SECURITY-HARDENING.md` when repository protection changes
6. The `ReelScribe 自動維護` scheduled task

The automated process may apply only small, testable, non-destructive fixes. It must not add paid core dependencies, account-cookie extraction, login bypass, private-content scraping, unverified third-party services, third-party tracking, or unauthorized paid advertising.
