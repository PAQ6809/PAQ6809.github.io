# Native Engine Implementation Contract

The React Native layer calls a single native module named `ReelScribeEngine`. The iOS and Android implementations must expose identical behavior.

## Required methods

```text
getCapabilities()
ensureModel(modelId)
removeModel(modelId)
transcribe(request)
cancelActiveTask()
resumeLastTask()
```

Required events:

```text
ReelScribeModelProgress
ReelScribeTaskProgress
```

## Core engine

Use `whisper.cpp` 1.9.1 as the first production engine.

### iOS

- Swift bridge with a small Objective-C++ wrapper around whisper.cpp.
- Prefer Metal/Core ML paths only when validated on the current device.
- Store downloaded models in Application Support, excluded from iCloud backup.
- Use `URLSessionDownloadTask` for resumable downloads.
- Compute SHA-256 with CryptoKit before moving the artifact into the approved model directory.
- Keep exactly one model context resident.
- Run inference on a dedicated serial queue with autorelease pools around each chunk.
- Use `BGProcessingTask` only for user-authorized deferred work; never assume iOS will keep the app alive.
- Use Apple Vision for burned-in subtitle OCR. Restrict OCR to user-selected frame regions and release pixel buffers immediately.

### Android

- Kotlin TurboModule/NativeModule with JNI wrapper around whisper.cpp.
- Store models in app-private files or approved Play Asset Delivery packs.
- Use WorkManager only for user-approved resumable downloads or deferred work.
- Verify SHA-256 with `MessageDigest` before activation.
- Keep exactly one native model context resident.
- Use a foreground service only when a user starts a long transcription and Android policy requires visible ongoing work.
- Use ML Kit Text Recognition v2 for local OCR. Prefer bundled or explicitly downloaded script models according to store-size policy.

## Media pipeline

1. Import with the platform photo/file picker; do not request broad media-library access unless a concrete use case requires it.
2. Copy only when necessary into an app-private working directory.
3. Decode audio incrementally where possible.
4. Convert to mono 16 kHz float PCM in bounded chunks.
5. Run VAD/speech enhancement before ASR.
6. Maintain 5–10 second overlap and merge duplicates.
7. Save checkpoint metadata after each completed chunk.
8. Release decoded buffers before loading the next chunk.
9. Stop or downgrade when thermal state becomes serious/critical or memory warning is received.

## Checkpoint format

```json
{
  "schemaVersion": 1,
  "mediaFingerprint": "sha256:size:mtime",
  "modelId": "whisper-base",
  "language": "zh",
  "nextStartMs": 600000,
  "segments": [],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

- Never persist raw PCM.
- Delete checkpoints after successful export unless the user chooses to retain the project.
- A checkpoint may resume only when the media fingerprint, model hash and processing settings match.

## Model manager

The native manager reads `reelscribe/models/mobile-model-catalog.json` at build time and emits a signed/embedded release catalog.

Before activation:

- HTTPS only.
- Host allowlist.
- Exact expected byte size.
- SHA-256 match.
- License and commercial-use flag present.
- Minimum storage and memory rule satisfied.
- User consent for downloads larger than the store-defined threshold.

A partially downloaded file stays in a temporary extension and is never treated as a model.

## OCR fusion

- OCR never replaces high-confidence speech text solely because it exists.
- Prefer OCR when two adjacent frames agree and the recognized script matches the selected language.
- Reject random symbols, isolated letters, license plates, timestamps and UI chrome unless the user explicitly selected that region.
- Merge OCR and speech using time overlap, language, confidence and repetition guards.

## Security

- No cookies, account sessions, passwords or private social tokens.
- No arbitrary URL download in the native model manager.
- No model execution from writable unverified paths.
- No dynamic native library download.
- Protect exported files with platform file-protection defaults.
- Remove temporary proxied Instagram media after processing.
- Use certificate validation provided by the operating system; do not disable TLS checks.

## Acceptance tests

- Cancel model download and resume without corrupting the model.
- Kill and relaunch during a 60-minute transcription; resume from checkpoint.
- Trigger memory warning; app releases optional model/context and retains text.
- Put app in background; no duplicate inference task starts.
- Enable airplane mode after model installation; local transcription still works.
- Tamper with one byte of a model; SHA-256 verification prevents loading.
- OCR and ASR never run high-memory models concurrently on constrained phones.
