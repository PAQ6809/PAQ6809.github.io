# ReelScribe Testing Matrix

## Automated checks

The `ReelScribe quality check` workflow validates:

- JavaScript syntax for the resolver, format compatibility, Whisper worker, PWA and sharing modules
- VTT and SRT parsing fixtures
- URL normalization for YouTube, social links, generic public pages and direct subtitle files
- Smart model selection, silence detection and overlap de-duplication
- HTML duplicate IDs, CSS structure, JSON-LD, Manifest and Sitemap
- Content Security Policy, no-referrer policy and prohibited JavaScript APIs
- CODEOWNERS, Dependabot, Security Policy and read-only workflow permissions
- Production files matching the repository revision
- IndexNow submission after verified deployment

## Manual browser matrix

Test at minimum:

| Environment | Link resolver | File picker | Local Whisper | Export | Share/PWA |
|---|---:|---:|---:|---:|---:|
| iPhone Safari | Required | Required | Required | Required | Required |
| Android Chrome | Required | Required | Required | Required | Required |
| macOS Safari | Required | Required | Required | Required | Required |
| Desktop Chrome | Required | Required | Required | Required | Required |
| Desktop Edge | Required | Required | Required | Required | Required |

## Representative fixtures

- YouTube URL with public captions
- Public VTT and SRT URLs
- Generic public HTTPS video page without captions
- MP4/H.264/AAC, WebM/Opus, MP3, M4A and WAV
- At least one uncommon extension with an empty MIME type
- Five-minute short clip, thirty-minute recording and one-hour recording
- Chinese, English and mixed-language speech
- Quiet speech, background noise, music, silence and overlapping speakers

## Acceptance rules

- Unsupported platforms or codecs must show a clear limitation instead of a false success.
- A private, login-only, DRM-protected or paid source must not be bypassed.
- Large files must not crash the interface silently.
- Copy, TXT, SRT and VTT must preserve the visible text and timestamps.
- Mobile layouts must not overflow horizontally at 320, 375, 390 or 430 CSS pixels.
- Long-video completion time and accuracy must be reported as device-dependent, never guaranteed.
