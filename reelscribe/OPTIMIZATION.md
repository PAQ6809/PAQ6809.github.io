# ReelScribe UI Optimization Contract

## Goal

Keep ReelScribe bright, simple, fast, mobile-first, accessible, and fully usable on desktop browsers without changing the subtitle core or introducing paid dependencies.

## Interface rules

1. The first screen must focus on one task: paste a link and get subtitles.
2. The main input and primary action must remain visible on common phone screens without horizontal scrolling.
3. Upload, local Whisper, tab capture, and microphone recording stay inside the collapsed fallback section.
4. Light theme is the default and only visual theme unless a future change is explicitly approved.
5. Use white surfaces, subtle borders, restrained shadows, and one blue primary color.
6. Avoid decorative gradients, excessive badges, oversized typography, and unnecessary animation.
7. Touch targets must be at least 44 CSS pixels high.
8. Mobile widths 320, 375, 390, and 430 pixels must not overflow horizontally.
9. Tablet width 768 pixels and desktop widths 1280 pixels or above must keep readable line lengths and centered content.
10. Copy is the primary result action; TXT, SRT, and VTT are secondary actions.

## Accessibility rules

- Preserve visible labels or screen-reader labels.
- Keep clear `:focus-visible` styles.
- Preserve live regions for resolver and processing status.
- Use native `details` and `summary` for fallback disclosure.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone to communicate success or failure.

## Performance rules

- Do not add a UI framework.
- Do not preload Whisper models.
- Keep the first page static and lightweight.
- Keep model inference in a Web Worker.
- Keep Service Worker App Shell caching.
- Keep free subtitle provider requests parallel, timed out, and independently degradable.
- Cache successful link transcripts locally.

## Required regression checks

- Link resolver, provider status, metadata, and local cache.
- Copy, TXT, SRT, and VTT.
- Local file selection and drag-and-drop.
- Local Whisper and WebGPU/WASM fallback.
- Desktop tab-audio capture and microphone recording.
- Mobile PWA share target.
- iPhone safe-area spacing and 16px form font sizing.
- No horizontal overflow at 320px.
- Keyboard focus order and visible focus ring.

## Automation rule

Every future UI, resolver, performance, privacy, or dependency optimization must update both:

1. `.github/workflows/reelscribe-check.yml`
2. The `ReelScribe 自動維護` scheduled task

The automated process may apply only small, testable, non-destructive fixes. It must not add paid core dependencies, account-cookie extraction, login bypass, private-content scraping, or an unverified third-party service.