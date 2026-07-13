# Native Engine Implementation Contract

The React Native application uses two native layers with separate security responsibilities:

1. `whisper.rn` 0.6.0 provides the reviewed React Native binding to `whisper.cpp` and performs local ASR.
2. A small app-owned native module named `ReelScribeManager` manages trusted model artifacts, media preparation, checkpoints, device capabilities and platform OCR.

The iOS and Android `ReelScribeManager` implementations must expose identical behavior.

## Required manager methods

```text
getCapabilities()
ensureModel(modelId)
removeModel(modelId)
prepareMedia({ mediaUri, enhanceSpeech, checkpointDirectory })
cleanupPreparedMedia(cleanupToken)
runOcr({ mediaUri, language })
saveCheckpoint({ modelId, mediaUri, segments })
resumeLastTask()
```

Required events:

```text
ReelScribeModelProgress
ReelScribeTaskProgress
```

The JavaScript application must not perform native model execution from an unverified remote URL. `ensureModel()` returns only a verified local path and SHA-256. `prepareMedia()` returns only an app-controlled local audio path that `whisper.rn` may read.

## Core ASR engine

Use `whisper.rn` 0.6.0 with its bundled whisper.cpp implementation for the first compiled App build. The release catalog pins the target engine policy to whisper.cpp 1.9.1; before store submission, confirm the actual whisper.cpp version exposed by `whisper.rn` and either align the binding or update the catalog after regression tests.

`NativeReelScribeEngine.ts` currently performs:

- `initWhisper({ filePath, useGpu, useCoreMLIos, useFlashAttn })`;
- one active `WhisperContext` at a time;
- timestamp conversion from whisper.cpp 10 ms units to milliseconds;
- cancellation through the task `stop()` callback;
- model context release on model deletion or memory cleanup;
- optional fusion with trusted native OCR segments.

### iOS manager

- Swift module named `ReelScribeManager`.
- Store downloaded models in Application Support and exclude them from iCloud backup.
- Use `URLSessionDownloadTask` for resumable downloads.
- Compute SHA-256 with CryptoKit before moving an artifact into the approved model directory.
- Return the verified local path to `whisper.rn`; never return a partial file.
- Decode/copy selected media into bounded local audio files; prefer AVFoundation streaming/export APIs instead of loading the full video into memory.
- Use `BGProcessingTask` only for user-authorized deferred work; never assume iOS will keep the app alive.
- Use Apple Vision for burned-in subtitle OCR. Restrict OCR to user-selected frame regions and release pixel buffers immediately.
- On memory warning or serious thermal state, release optional prepared media and request `releaseIdleModel()` from the application layer.

### Android manager

- Kotlin TurboModule/NativeModule named `ReelScribeManager`.
- Store models in app-private files or approved Play Asset Delivery packs.
- Use WorkManager only for user-approved resumable downloads or deferred work.
- Verify SHA-256 with `MessageDigest` before activation.
- Return a verified local model path to `whisper.rn`.
- Convert media through MediaExtractor/MediaCodec or another reviewed bounded native pipeline, avoiding full-file PCM copies.
- Use a foreground service only when a user starts a long transcription and Android policy requires visible ongoing work.
- Use ML Kit Text Recognition v2 for local OCR. Prefer bundled or explicitly downloaded script models according to store-size policy.
- Respond to `onTrimMemory` by releasing optional buffers and preventing a second high-memory task.

## Media pipeline

1. Import with the platform photo/file picker; do not request broad media-library access unless a concrete use case requires it.
2. Copy only when necessary into an app-private working directory.
3. Decode audio incrementally where possible.
4. Convert to mono 16 kHz WAV/PCM in bounded chunks accepted by `whisper.rn`.
5. Run VAD/speech enhancement before ASR when enabled.
6. Maintain 5–10 second overlap for application-level long-media chunks and merge duplicates.
7. Save checkpoint metadata after each completed chunk.
8. Release decoded buffers before loading the next chunk.
9. Stop or downgrade when thermal state becomes serious/critical or a memory warning is received.
10. Delete temporary proxied Instagram media and prepared audio after completion or cancellation.

## Checkpoint format

```json
{
  "schemaVersion": 1,
  "mediaFingerprint": "sha256:size:mtime",
  "modelId": "whisper-base",
  "modelSha256": "64-hex-characters",
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

A partially downloaded file stays in a temporary extension and is never treated as a model. The release app must not accept arbitrary model URLs from UI input, remote configuration or deep links.

## OCR fusion

- OCR never replaces high-confidence speech text solely because it exists.
- Prefer OCR when two adjacent frames agree and the recognized script matches the selected language.
- Reject random symbols, isolated letters, license plates, timestamps and UI chrome unless the user explicitly selected that region.
- Merge OCR and speech using time overlap, language, confidence and repetition guards.
- OCR and a high-memory ASR model must not run concurrently on constrained devices.

## Security

- No cookies, account sessions, passwords or private social tokens.
- No arbitrary URL download in the native model manager.
- No model execution from writable unverified paths.
- No dynamic native library download.
- Protect exported files with platform file-protection defaults.
- Remove temporary proxied Instagram media after processing.
- Use certificate validation provided by the operating system; do not disable TLS checks.
- Never log public resolver signed URLs, full local file paths, transcript bodies or model download secrets in release builds.

## Acceptance tests

- Cancel model download and resume without corrupting the model.
- Kill and relaunch during a 60-minute transcription; resume from checkpoint.
- Trigger memory warning; app releases optional model/context and retains text.
- Put app in background; no duplicate inference task starts.
- Enable airplane mode after model installation; local transcription still works.
- Tamper with one byte of a model; SHA-256 verification prevents loading.
- OCR and ASR never run high-memory models concurrently on constrained phones.
- Verify whisper.rn segment timestamps, cancellation and context release on physical iOS and Android devices.
- Verify a remote HTTPS media URL is first copied into a controlled local file; whisper.rn is never passed the remote URL directly.
