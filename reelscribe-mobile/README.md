# ReelScribe Mobile

ReelScribe Mobile is the native iOS/Android product track for the existing ReelScribe web service.

## Current status

This directory contains the React Native application layer, the installed `whisper.rn` native binding, iOS and Android model/media managers, model policy, public-link resolver client, store metadata, privacy documents, CI checks and bootstrap scripts.

The provisional application identifier is:

```text
io.github.paq6809.reelscribe
```

It is **not yet registered** in App Store Connect or Google Play Console. Confirm availability before signing a release.

The native managers are source-complete enough for the first Debug compilation attempt, but they have not yet been compiled on Xcode/Android Gradle or tested on physical devices. OCR frame sampling, durable checkpoint resume and final release-model hashes intentionally remain disabled. `.do-not-ship` must remain in the repository.

## Architecture

- React Native 0.86 + React 19.2 for the shared app UI and task orchestration.
- `whisper.rn` 0.6.0 provides the reviewed React Native binding to `whisper.cpp` for native iOS/Android ASR.
- `NativeReelScribeEngine.ts` calls `whisper.rn` for local transcription, cancellation, progress and timestamped segments.
- `ReelScribeManager.swift` and `ReelScribeManagerModule.kt` manage allowlisted downloads, local media import, 16 kHz mono WAV conversion, storage/thermal capability reporting and temporary-file cleanup.
- Release builds fail closed while exact SHA-256 model values are absent.
- iOS downloads use an ephemeral cookie-free URLSession and validate every redirect host; Android disables automatic redirects and validates each redirect before resuming a partial model file.
- `whisper.cpp` 1.9.1 is the pinned production engine target in the release catalog.
- Optional `sherpa-onnx` integration for SenseVoice, VAD, source separation, diarization and enhancement remains a candidate until model-license and physical-device testing pass.
- Apple Vision text recognition on iOS and ML Kit Text Recognition v2 on Android remain the planned on-device OCR implementations; the current native methods return no OCR output rather than unvalidated text.
- The existing public-link resolver remains a public text/metadata service; local media and transcripts stay on the device unless the user explicitly enables a future self-hosted server mode.

## Model policy

The app does not package every model. It uses a curated registry in:

```text
../reelscribe/models/mobile-model-catalog.json
```

Default mobile tiers:

1. Whisper Tiny: phones, long video, low memory and fast preview.
2. Whisper Base: balanced quality.
3. Whisper Small: optional download for high-end devices.
4. Whisper Large-v3-turbo: explicit optional download for flagship devices only.
5. SenseVoice Small: research candidate for Chinese/Cantonese/Japanese/Korean; not released until runtime, license and device benchmarks pass.
6. Qwen3-ASR 0.6B/1.7B: optional self-hosted GPU mode only, never silently used and never treated as an on-device model.

Every downloadable artifact requires an approved HTTPS source, exact byte size, SHA-256 hash, license record and device eligibility rule before a store release.

## Bootstrap

Windows PowerShell:

```powershell
./scripts/bootstrap.ps1
```

macOS/Linux:

```bash
./scripts/bootstrap.sh
```

The scripts create `ios/` and `android/` through the pinned React Native community CLI. `install-native-manager.mjs` then registers the local iOS pod, copies the Android Kotlin sources and inserts `ReelScribeManagerPackage()` into `MainApplication.kt`. A macOS machine with Xcode is required to compile and sign iOS.

A project that already has `ios/` and `android/` can run:

```bash
npm run install:native-manager
```

The installer fails rather than modifying an unexpected package identifier or unrecognized project structure.

## Native implementation gates

The store build is blocked until all of these pass:

- Tiny and Base artifacts have independently verified exact sizes and SHA-256 values in the release catalog and native maps.
- Xcode and Android Gradle Debug builds compile from a clean checkout.
- Apple Vision and ML Kit OCR frame sampling pass script/language, random-symbol and adjacent-frame quality tests.
- Checkpoints include media fingerprint, model hash and processing settings and resume atomically.
- App stays responsive during model download, OCR and long transcription.
- 15-minute, 60-minute and 3-hour regression files complete without process termination on the supported device matrix.
- Airplane-mode transcription works after the selected model is installed.
- No audio, video frame, transcript, cookie, session or device identifier leaves the device in local mode.
- App Privacy and Google Data Safety declarations match every shipped SDK.
- Account owner completes identifiers, signing, agreements, legal verification and final store submission.

## Validation commands

Before native projects exist:

```bash
npm install --ignore-scripts
npm run check
```

After bootstrap:

```bash
npm run install:native-manager
npm run check
npm run android
```

On macOS:

```bash
cd ios && pod install && cd ..
npm run ios
```

Static CI proves the TypeScript, catalog policy and source security invariants. It does not prove Swift/Kotlin compilation, App Store signing or physical-device stability. Store signing and submission steps are in `STORE-LAUNCH.md`.
