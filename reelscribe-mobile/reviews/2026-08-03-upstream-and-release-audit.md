# ReelScribe upstream and release audit — 2026-08-03

## Scope

This review covers the canonical `reelscribe-mobile/` app, its model catalog, store gates, native build workflows, public resolver boundaries and the current public store/runtime requirements. It does not authorize store submission, signing, payment, rollout or promotion of any candidate model.

## Primary sources reviewed

- Apple App Review Guidelines, last updated 2026-06-08: https://developer.apple.com/app-store/review/guidelines/
- Apple App Review preparation guidance: https://developer.apple.com/app-store/review/
- App Store Connect app privacy guidance: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Google Play target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- React Native 0.86 release, published 2026-06-11: https://reactnative.dev/blog/2026/06/11/react-native-0.86
- whisper.cpp releases: https://github.com/ggml-org/whisper.cpp/releases
- whisper.rn upstream: https://github.com/mybigday/whisper.rn
- Android ML Kit text recognition API: https://developers.google.com/android/reference/com/google/mlkit/vision/text/package-summary

## Confirmed platform requirements

### Apple

Apple still requires accurate metadata, screenshots and privacy information. Every app must expose an accessible privacy-policy link in App Store Connect and inside the app. The policy must identify collected data, collection methods and uses; cover third-party protections; and explain retention, deletion and consent withdrawal. App Review preparation guidance also requires working support/privacy links and physical-device testing before submission.

No signing, App Store Connect submission, legal agreement acceptance or Developer Program payment was performed.

### Google Play

Starting **2026-08-31**, normal new Android apps and updates must target **Android 16 / API 36 or higher**. Existing apps must target at least **Android 15 / API 35** to remain available to new users on newer Android versions. Google documents an extension path to **2026-11-01**, but ReelScribe must not depend on an extension as its normal release plan.

The repository must retain build evidence showing `targetSdkVersion 36` before a 2026-08-31-or-later Play submission.

### React Native

React Native `0.86` remains the reviewed stable baseline. The official 2026-06-11 release states there are no user-facing breaking changes. No framework upgrade was made in this review because the canonical app already pins `react-native` to `0.86.0` and native compatibility still requires CI and device evidence.

## Runtime and model findings

### whisper.cpp version claim requires correction before release

The public whisper.cpp releases page reviewed on 2026-08-03 lists **v1.8.6** as the latest tagged release. The ReelScribe model catalog currently declares the `whisper-cpp` engine as `1.9.1` while the app actually depends on `whisper.rn 0.6.0`.

This is a release-blocking provenance inconsistency. The catalog must not imply that a tagged upstream `1.9.1` release was reviewed unless the exact bundled whisper.cpp commit in `whisper.rn 0.6.0` is identified and independently verified. Before release, replace the catalog value with one of the following evidence-backed forms:

- the exact tagged whisper.cpp version bundled by the installed binding; or
- an exact whisper.cpp commit SHA plus the `whisper.rn 0.6.0` package integrity value.

Do not upgrade or downgrade native runtime code solely to make the version string match.

### Production model artifacts remain blocked

Whisper Tiny and Base remain the intended first-release mobile core, but they are not store-release-ready until each artifact has:

- an allowlisted HTTPS URL;
- an exact byte size;
- a 64-character SHA-256;
- explicit download consent;
- free-space validation;
- `.partial` isolation and resumable download behavior;
- atomic installation;
- deletion controls;
- a tested failure fallback;
- physical-device evidence for memory, battery, thermal behavior, CER/WER and timestamps.

Small and Large-v3-turbo remain conditional manual downloads. Qwen3-ASR, Fun-ASR Nano, SenseVoice, Omnilingual ASR, Moonshine, Nemotron and Parakeet remain candidate/server/research tiers. No model was promoted.

## Repository and supply-chain findings

### Dependency installation is not reproducible yet

`reelscribe-mobile/package.json` pins direct dependencies, but `reelscribe-mobile/package-lock.json` is absent. The current workflows use `npm install`, so transitive dependency resolution may change between runs.

Before a release candidate:

1. Generate `package-lock.json` with the pinned Node/npm toolchain in a trusted environment.
2. Review package diffs and integrity fields.
3. Commit the lockfile.
4. Change CI from `npm install` to `npm ci --ignore-scripts --no-audit --no-fund`.
5. Keep lifecycle scripts disabled unless a specific reviewed native package requires them.

This audit does not synthesize a lockfile because a lockfile generated without successfully resolving the registry would be misleading.

### Workflow boundaries reviewed

The three canonical workflows retain these required controls:

- repository permissions are read-only;
- third-party Actions are pinned to full commit SHAs;
- checkout does not retain repository credentials;
- native build artifacts are unsigned debug/simulator outputs;
- no signing key, keystore, App Store API key, Play service account or Vercel secret is expected in Git;
- store/model checks remain separate from signing and submission.

## Native implementation gates still open

The following require real devices and cannot be certified by source inspection alone:

- iOS AVAssetReader conversion streams to disk without retaining full PCM;
- Android MediaExtractor/MediaCodec decoding remains bounded;
- OCR and ASR do not hold high-memory contexts simultaneously;
- foreground work preempts background preparation;
- cancellation cleans temporary media and releases model contexts;
- checkpoint resume survives process termination;
- approved HTTPS hosts are enforced for temporary remote media;
- 15-second, 15-minute, 60-minute and 3-hour tests pass on minimum and flagship iOS/Android devices;
- low storage, download interruption, memory warning and serious/critical thermal states degrade safely.

## Execution note

A local `npm run check` attempt could not start because the execution environment could not resolve `github.com`, so dependencies and repository contents could not be cloned. This is an environment/network failure, not evidence that CI passed or failed. The repository workflows remain the authoritative executable checks.

## Release decision

**Production remains blocked.**

No store submission, signing, payment, rollout, model promotion or cloud fallback was enabled. The next safe repository changes are to establish a reviewed dependency lockfile and replace the unsupported whisper.cpp version claim with exact binding/runtime provenance.