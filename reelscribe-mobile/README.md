# ReelScribe Mobile

ReelScribe Mobile is the native iOS/Android product track for the existing ReelScribe web service.

## Current status

This directory contains the production architecture, React Native application layer, model policy, store metadata, privacy documents, native bridge contract, CI checks and bootstrap scripts.

The provisional application identifier is:

```text
io.github.paq6809.reelscribe
```

It is **not yet registered** in App Store Connect or Google Play Console. Confirm availability before signing a release.

## Architecture

- React Native 0.86 + React 19.2 for the shared app UI and task orchestration.
- Native Swift/Kotlin implementation behind `NativeReelScribeEngine`.
- `whisper.cpp` 1.9.1 as the primary offline multilingual engine.
- Optional `sherpa-onnx` integration for SenseVoice, VAD, source separation, diarization and enhancement after model-license review.
- Apple Vision text recognition on iOS and ML Kit Text Recognition v2 on Android for on-device burned-in subtitle OCR.
- The existing public link resolver remains a text/metadata service; local media and transcripts stay on the device unless the user explicitly enables an optional self-hosted server mode.

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

The scripts create the native `ios/` and `android/` projects through the pinned React Native community CLI, then copy the maintained ReelScribe source files into the generated project. A macOS machine with Xcode is required to produce and sign an iOS build.

## Native implementation gates

The store build is blocked until all of these pass:

- Native bridge implements model download, SHA-256 verification, cancellation, resume and one-model-at-a-time memory rules.
- iOS uses background asset delivery or a reviewed application-support download location; Android uses Play Asset Delivery or verified app-private storage.
- App stays responsive during model download, OCR and long transcription.
- 15-minute, 60-minute and 3-hour regression files complete without process termination on the supported device matrix.
- Airplane-mode transcription works after the selected model is installed.
- No audio, video frame, transcript, cookie, session or device identifier leaves the device in local mode.
- App Privacy and Google Data Safety declarations match every shipped SDK.

## Release commands

After the native projects exist:

```bash
npm ci
npm run typecheck
npm run audit:catalog
npm run ios
npm run android
```

Store signing and submission steps are in `STORE-LAUNCH.md`.
