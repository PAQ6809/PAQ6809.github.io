# ReelScribe upstream and release audit — 2026-08-06

## Scope

Reviewed the canonical `reelscribe-mobile/` app, the three mobile workflows, the public website/repository boundaries, and current first-party platform/runtime records. No parallel Capacitor or alternate mobile project was introduced.

## Verified platform records

### Apple

- Apple App Review Guidelines were last updated on 2026-06-08.
- A privacy-policy link is required both in App Store Connect metadata and inside the app.
- The policy must identify collected data, uses, third parties, retention/deletion, consent withdrawal and deletion-request paths.
- No store submission, agreement acceptance, payment, signing certificate or rollout action was performed.

Official source:
- https://developer.apple.com/app-store/review/guidelines/

### Google Play

- Starting 2026-08-31, new mobile apps and app updates must target Android 16 / API 36 or higher.
- Existing mobile apps must target Android 15 / API 35 or higher to remain available to new users on newer Android versions.
- An extension may be requested in Play Console until 2026-11-01, but ReelScribe must not rely on the extension as its release plan.
- No Play Console account, identity, payment, signing or production-rollout action was performed.

Official source:
- https://support.google.com/googleplay/android-developer/answer/11926878

### React Native

- React Native 0.86 remains an active supported release.
- React Native 0.87 is scheduled for release on 2026-08-10 and was still listed as future at the time of this audit.
- No framework upgrade was made because `whisper.rn`, the app-owned `ReelScribeManager`, Android API 36, iOS native media/OCR and physical-device evidence must be validated together before changing the baseline.

Official sources:
- https://reactnative.dev/blog/2026/06/11/react-native-0.86
- https://reactnative.dev/releases/overview

## Runtime and model records

### whisper.rn / whisper.cpp

- The canonical app remains pinned to `whisper.rn` 0.6.0.
- The binding's upstream `src/version.json` reports whisper.cpp `1.9.1`, so the catalog's `1.9.1` value is consistent with the installed binding rather than the latest standalone whisper.cpp tagged release.
- No runtime upgrade was made.

Official sources:
- https://github.com/mybigday/whisper.rn
- https://github.com/mybigday/whisper.rn/blob/main/src/version.json

### sherpa-onnx

- The latest verified release found during this audit is `v1.13.2`, signed commit prefix `13d0ae6`.
- The release includes checksum assets and Android AAR artifacts, plus changes related to buffered RNNT streaming for Parakeet Unified.
- This does not satisfy ReelScribe's production gates by itself. SenseVoice, Fun-ASR Nano, Omnilingual, Qwen3-ASR, Nemotron and Parakeet remain candidate/server/research entries until exact model artifacts, model licenses, hashes, memory, battery, thermal, CER/WER, timestamps and long-video physical-device tests pass.

Official source:
- https://github.com/k2-fsa/sherpa-onnx/releases/tag/v1.13.2

### Qwen3-ASR

- Official source code remains Apache-2.0.
- It remains an explicit self-hosted/server candidate and is not treated as an on-device phone model.

Official source:
- https://github.com/QwenLM/Qwen3-ASR

## Repository audit

Confirmed statically:

- `reelscribe-mobile/` is the only canonical mobile app path.
- React Native is pinned to `0.86.0` and `whisper.rn` to `0.6.0`.
- `npm run check` includes TypeScript, model-catalog audit and store preflight.
- The app uses the app-owned `@reelscribe/native-manager` package.
- Mobile workflows use `contents: read`.
- Third-party GitHub Actions are pinned to full commit SHAs.
- Checkout uses `persist-credentials: false`.
- The source audits prohibit `document.cookie`, `eval` and `new Function`.
- The resolver client requires omitted credentials, no-store and no-referrer behavior.
- Native checks require AVAssetReader streaming writes on iOS and MediaExtractor/MediaCodec bounded processing on Android.
- OCR and ASR remain governed by a one-heavy-inference-task rule.

## Execution evidence

The isolated execution environment could not resolve `github.com`, so it could not clone the repository or run a fresh local `npm install` / `npm run check`. This network failure is not evidence that CI passed or failed.

The repository still has no committed `reelscribe-mobile/package-lock.json`. Consequently, workflows using `npm install` do not yet provide fully reproducible transitive dependency resolution. A lockfile must be generated and reviewed in a network-enabled trusted environment before switching workflows to `npm ci`.

## Release decision

No model or runtime was promoted to production. No model URL, hash, store listing, native signing configuration or production deployment was changed.

Release remains blocked on:

1. Exact byte size and SHA-256 for every production downloadable model artifact.
2. Reviewed `package-lock.json` and reproducible `npm ci` evidence.
3. Android API 36 build evidence.
4. iOS and Android physical-device evidence for 15-second, 15-minute, 60-minute and 3-hour media.
5. Low-storage, interrupted download, partial-file isolation, atomic installation, deletion, thermal, memory-warning, background/foreground, cancellation and checkpoint-resume tests.
6. Verified production resolver logging/retention behavior and live-site-to-repository integrity evidence.

No unsafe or unverifiable deployment was attempted.
