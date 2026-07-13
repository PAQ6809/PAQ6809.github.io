# Native Engine Implementation Contract

## Status

The local package at `native/reelscribe-manager/` now implements the first Swift/Kotlin version of `ReelScribeManager` and is wired as the file dependency `@reelscribe/native-manager`.

Implemented source paths:

- iOS: AVFoundation media decoding, mono 16 kHz WAV output, Apple Vision OCR, device capability reporting, cleanup and checkpoint save/resume.
- Android: bounded media staging, MediaExtractor/MediaCodec decoding, mono 16 kHz WAV output, bundled ML Kit Chinese/Japanese/Korean/Latin OCR, device capability reporting, cleanup and checkpoint save/resume.
- JavaScript: `whisper.rn` model verification, context lifecycle, timestamped transcription, cancellation and OCR fusion.

This source has **not yet been compiled or validated on physical iOS/Android devices**. Store release remains blocked until the native build and acceptance gates below pass.

## Native contract

Both platforms expose:

```text
getCapabilities()
prepareMedia({ mediaUri, enhanceSpeech, checkpointDirectory })
cleanupPreparedMedia(cleanupToken)
runOcr({ mediaUri, language })
saveCheckpoint({ modelId, mediaUri, segments })
resumeLastTask()
```

Events:

```text
ReelScribeModelProgress
ReelScribeTaskProgress
```

`NativeReelScribeEngine.ts` performs model download/integrity orchestration and uses `whisper.rn`. The native manager never executes an arbitrary remote model URL. A release model must exist at a verified app-controlled local path and match the catalog SHA-256.

## iOS implementation

- Swift module: `ReelScribeManager`.
- Media pipeline: AVAssetReader to mono 16 kHz, 16-bit WAV.
- Temporary audio: app cache directory; deleted after completion/cancellation.
- Persistent metadata/checkpoint: Application Support with file protection and backup exclusion where applicable.
- OCR: Apple Vision, accurate recognition, bounded lower-frame crop, maximum 60 sampled frames.
- Device policy: memory, storage, Low Power Mode and thermal state are reported to JavaScript.
- Security-scoped file URLs are opened only for the duration of the requested operation.

Required build review:

- Replace any deprecated AVFoundation APIs required by the selected Xcode SDK.
- Profile AVAssetReader memory on 15-, 60- and 180-minute media.
- Confirm WAV writing is incremental enough for the minimum supported iPhone; refactor to chunked file writes if peak memory exceeds the release threshold.
- Validate Vision crop orientation and coordinate system on portrait, landscape and rotated videos.
- Confirm privacy manifest entries for React Native, `whisper.rn` and all SDKs.

## Android implementation

- Kotlin module: `ReelScribeManager`.
- Local media: content/file URIs through system pickers.
- Short-lived remote Instagram media: only the allowlisted ReelScribe HTTPS backend, capped at 300 MB and copied to an app cache file before decoding.
- Media pipeline: MediaExtractor + MediaCodec, downmix and bounded mono 16 kHz WAV output.
- OCR: bundled ML Kit Text Recognition v2 models for Latin, Chinese, Japanese and Korean; bounded lower-frame crop and maximum 60 sampled frames.
- Device policy: memory, storage, Power Saver and thermal state are reported to JavaScript.
- Checkpoints and models use app-private storage.

Required build review:

- Compile against the current required Android API level and Java 17.
- Verify decoder output formats including PCM 16-bit and float on the device matrix.
- Test content URI lifetime, persistable permission behavior and scoped storage.
- Add WorkManager/foreground-service behavior only for user-started long jobs and only where platform policy requires it.
- Validate bundled OCR app-size impact and confirm the chosen bundled/unbundled model policy.

## Media and memory policy

1. Use the system picker; do not request broad media-library access without a concrete reviewed feature.
2. Copy remote media only into app-private temporary storage.
3. Decode into mono 16 kHz audio accepted by `whisper.rn`.
4. Run one heavy task at a time: ASR or OCR, never two large engines concurrently on constrained devices.
5. Use bounded long-media windows with overlap and save a checkpoint after completed windows.
6. Release decoded buffers and OCR images promptly.
7. Respond to thermal/memory warnings by releasing optional contexts without deleting transcript text.
8. Delete temporary proxied Instagram media and prepared audio after completion/cancellation.

## Model security

The release model catalog is embedded/signed at build time. Before activation:

- HTTPS and host allowlist.
- Exact expected byte size.
- SHA-256 match.
- License/commercial-use record.
- Sufficient storage and device tier.
- Explicit consent for large downloads.

Partial files retain a temporary extension and are never executed. The UI, deep links and remote configuration cannot supply arbitrary model URLs.

## OCR fusion

- OCR never replaces high-confidence speech solely because text exists.
- Prefer OCR when neighboring frames agree, the script matches the selected language and confidence is sufficient.
- Reject random symbols, isolated letters, license plates, timestamps and UI chrome unless the user explicitly selected that region.
- Merge OCR and speech using temporal overlap, script match, confidence and hallucination guards.

## Checkpoints

Checkpoints include a media fingerprint, model ID/hash, language, next offset, completed segments and settings. Raw PCM is never persisted. Resume is valid only when media fingerprint, model hash and settings match.

The current first implementation stores completed segment data, but full window-level resume/fingerprint enforcement must be completed and tested before claiming three-hour process-death recovery.

## Security boundary

- No cookies, social sessions, passwords or private platform tokens.
- No arbitrary model or media host.
- No dynamic native library download.
- No TLS bypass.
- No release logging of signed media URLs, local paths, transcript bodies or secrets.
- Local OCR frames and media are not uploaded.

## Required acceptance tests

- Native iOS and Android projects compile and autolink both native packages.
- Cancel/resume model downloads without corruption.
- Tamper with one model byte; SHA-256 blocks activation.
- 15-, 60- and 180-minute transcription on physical supported devices.
- Kill and relaunch during a long job; resume from a verified checkpoint.
- Airplane-mode transcription after model installation.
- Low storage, memory warning, background/foreground and thermal transitions.
- OCR/ASR mutual exclusion and temporary-file deletion.
- Portrait/landscape OCR, multiple scripts and gibberish rejection.
- Public resolver media is copied to a controlled file; `whisper.rn` never receives an untrusted remote URL directly.
- Final signed build network capture matches App Privacy and Data Safety declarations.
