# ReelScribe Mobile

ReelScribe Mobile is the canonical native iOS/Android product track for the existing ReelScribe web service.

## Current status

This directory contains:

- a React Native 0.86 application UI;
- the pinned `whisper.rn` 0.6.0 binding to whisper.cpp;
- a local autolinkable Swift/Kotlin package named `@reelscribe/native-manager`;
- public YouTube/Instagram resolver integration;
- on-device media preparation, native OCR, checkpoints and cleanup implementations;
- native TXT/SRT/VTT serialization and operating-system share flow;
- a curated 2026 ASR model/service registry;
- store metadata, privacy/data-safety drafts, support pages and CI/preflight checks;
- unsigned Android and iOS simulator build verification workflows.

The provisional application identifier is:

```text
io.github.paq6809.reelscribe
```

It is **not yet registered** in App Store Connect or Google Play Console. The repository is a release-engineering candidate, not a signed or store-approved app.

## Architecture

- React Native 0.86 + React 19.2 for shared UI and task orchestration.
- `whisper.rn` 0.6.0 for native local ASR on iOS and Android.
- `NativeReelScribeEngine.ts` for model verification, one-context-at-a-time inference, cancellation, progress, timestamps and OCR fusion.
- `@reelscribe/native-manager` for device capabilities, media-to-mono-16-kHz-WAV preparation, temporary-file cleanup, checkpoints and platform OCR.
- iOS uses AVFoundation and Apple Vision. Audio conversion streams decoded PCM directly into a WAV file instead of holding the full soundtrack in memory.
- Android uses MediaExtractor/MediaCodec streaming decode and bundled Google ML Kit Text Recognition v2 models.
- The public resolver receives only a public URL and language preference; local media and transcripts stay on the device in local mode.

The native package is source-complete enough for compilation review, but physical-device signing and store acceptance have not been completed in this environment.

## Model policy

The app never installs every new model into every phone. The catalog at:

```text
../reelscribe/models/mobile-model-catalog.json
```

separates models into production mobile, optional mobile, server-only, research and excluded tiers.

First-release mobile tiers:

1. Whisper Tiny — phones, long video, low memory and fast preview.
2. Whisper Base — balanced quality.
3. Whisper Small — optional download for high-end devices after tests.
4. Whisper Large-v3-turbo — explicit flagship-device download after tests.

The official whisper.cpp Tiny, Base, Small and Large-v3-turbo artifacts have pinned upstream sizes and SHA-256 values in both the native catalog and central registry. Tiny and Base remain the first-release defaults; artifact integrity does not replace device eligibility and benchmark gates.

Candidates, not first-release defaults:

- Breeze ASR 25 for Taiwanese Mandarin, Traditional Chinese, Mandarin-English code-switching and caption alignment. The official model is reviewed, but no community mobile conversion is approved.
- WhisperKit/Core ML on supported iPhones.
- SenseVoice Small through a pinned mobile runtime after license/device review.
- Fun-ASR Nano for Chinese dialect, singing, streaming and hotword benchmarks.
- Omnilingual ASR as an optional long-tail language pack.
- Moonshine English models for low-latency English after runtime-size review.
- Qwen3-ASR and NVIDIA Nemotron/Parakeet only as explicit, self-hosted server modes with separate consent and privacy disclosures.

Non-English Moonshine community-license models remain excluded from commercial store distribution.

Every downloadable release artifact requires an approved HTTPS origin, exact byte size, SHA-256, license record and device eligibility rule. Release builds reject unpinned artifacts, arbitrary URLs and research-only models.

## Bootstrap

Windows PowerShell:

```powershell
./scripts/bootstrap.ps1
```

macOS/Linux:

```bash
./scripts/bootstrap.sh
```

The scripts create the native `ios/` and `android/` projects with the pinned React Native CLI. Local package autolinking then connects both `whisper.rn` and `@reelscribe/native-manager`.

A macOS machine with the release Xcode version is required to compile/sign iOS. Android requires the current Android SDK/NDK, Java 17 and a release keystore.

## Verification commands

```bash
npm install
npm run check
npm run preflight:store
```

Release-only integrity gate:

```bash
npm run preflight:release
```

The release integrity gate is expected to pass for the locked production Whisper artifacts. Optional and research models remain blocked until their own release gates pass.

A manual GitHub workflow named `ReelScribe model integrity` downloads only the explicitly selected approved Whisper artifacts, calculates exact bytes and SHA-256 and uploads a review-only report. It never modifies the production catalog automatically.

The `ReelScribe native build` workflow generates the pinned React Native projects, validates native-module autolinking, builds an unsigned Android debug APK and compiles an unsigned iOS simulator application. Passing these jobs is necessary but does not replace signed physical-device tests.

After bootstrap and native dependency installation:

```bash
npm run ios
npm run android
```

## Store release gates

The app must not be submitted until all of these pass:

- iOS and Android native projects compile with no placeholder native methods.
- Production model downloads verify against locked byte-size expectations and SHA-256 values.
- Model tampering, interrupted download and low-storage tests pass.
- 15-minute, 60-minute and 3-hour tasks complete/resume on the supported device matrix.
- Airplane-mode transcription works after model installation.
- OCR and ASR do not run high-memory models concurrently.
- App remains usable through memory warnings, background/foreground changes and thermal throttling.
- App Privacy and Google Data Safety forms match the final signed binaries and resolver logs.
- Icons, screenshots, feature graphics and review demo media are final.
- Bundle/application identifiers, signing keys, certificates and store accounts are owned and approved by the account holder.

Store metadata and submission steps are in `STORE-LAUNCH.md` and `store/`.
