# ReelScribe Native Productization

## Objective

Package ReelScribe as installable iOS and Android apps while preserving local-first transcription, local OCR, public-caption lookup, privacy controls, and the existing web/PWA product.

## Model policy

Do not install every newly released model. A model is admitted only after license, multilingual coverage, mobile runtime, memory, download size, speed, accuracy, offline behavior, and hallucination tests pass.

### Browser stack retained

- `onnx-community/whisper-tiny`
- `onnx-community/whisper-base`
- `onnx-community/whisper-small`
- `onnx-community/whisper-large-v3-turbo` for capable desktop WebGPU only
- Silero VAD v5
- Tesseract.js 7 for optional burned-in subtitle OCR

### Native candidates to benchmark

1. iOS: WhisperKit/Core ML for Apple Neural Engine and GPU execution.
2. Android/iOS shared option: sherpa-onnx with tested multilingual ASR models.
3. Portable fallback: whisper.cpp quantized Tiny/Base/Small.
4. Apple Speech framework as an optional OS-managed path where offline availability and language support are confirmed at runtime.

English-only or narrowly licensed models must not silently replace the multilingual default. Cloud-only models are optional and require explicit consent, a privacy disclosure, quotas, and a separate paid operating plan.

## Native architecture

- Capacitor packages the audited static web app and provides the initial store-compatible shell.
- Media selection uses the platform document picker and scoped storage; the app does not request broad photo-library access unless required.
- Native ASR is introduced behind a capability adapter, not hard-wired into UI code.
- The adapter exposes `prepare`, `transcribe`, `cancel`, `dispose`, progress, language, timestamp, and memory-pressure events.
- Native inference and web inference never run concurrently.
- Model downloads are user initiated on mobile, resumable where supported, checksum verified, and removable in Settings.
- Default install does not bundle hundreds of megabytes of optional model weights.
- Public Instagram and YouTube resolver calls retain no-cookie, no-session, no-storage restrictions.

## Store readiness gates

### Functional

- No crashes on real iPhone and Android devices during a 30-minute video test.
- App survives background/foreground transitions without corrupting the transcript.
- Cancellation releases model, PCM, OCR, and video buffers.
- TXT, SRT, and VTT exports work through native share sheets.
- Offline local-file transcription works after the selected model is downloaded.

### Privacy and legal

- Publish privacy policy and support page.
- Declare local processing accurately.
- Disclose public URL resolver traffic separately from local media processing.
- Do not claim support for private, login-only, DRM, or restricted social content.
- Provide copyright and authorized-use notice.
- Complete Apple privacy nutrition labels and Google Play Data safety from actual code behavior.

### Security

- Enforce HTTPS and an origin allowlist.
- No arbitrary remote navigation inside the app WebView.
- No cookies, hidden login extraction, dynamic code installation, or unreviewed analytics SDKs.
- Pin native dependencies and generate SBOM/dependency review reports.
- Verify downloaded model hashes and store them only inside app-private storage.
- Add release signing, protected branches, required CI, secret scanning, and reproducible build documentation.

## Store metadata draft

- Product name: ReelScribe
- Subtitle: Private video-to-subtitle toolkit
- Primary category: Productivity
- Secondary category: Photo & Video
- Core promise: Turn authorized public links or local videos into editable subtitles using public caption tracks, on-device speech recognition, and optional local OCR.
- Do not use claims such as "all platforms", "perfect accuracy", "instant for every long video", or "permanently free" in store metadata.

## Release sequence

1. Complete Capacitor shell and native project generation.
2. Add native file/share/background lifecycle adapters.
3. Benchmark WhisperKit, sherpa-onnx, and whisper.cpp on a defined multilingual corpus.
4. Select one iOS engine and one Android engine; keep browser fallback.
5. Run privacy, security, battery, thermal, memory, and long-video tests.
6. Produce icons, screenshots, preview video, support URL, privacy policy, terms, review notes, and age-rating answers.
7. Publish iOS build to TestFlight and Android build to Play internal testing.
8. Fix review and device issues.
9. Submit staged production releases.

## External account blockers

App Store and Google Play submission cannot be completed by repository automation alone. The owner must provide active Apple Developer and Google Play Console accounts, legal identity/tax details where requested, signing access, store agreements, age-rating answers, and final consent to submit each build.
