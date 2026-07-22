# ReelScribe upstream and store review — 2026-07-20

This record documents the sources and release decisions used for the maintenance pass on 2026-07-20. It is evidence for review, not permission to publish, sign, enroll, pay, or submit an application.

## Store policy findings

### Apple

- Apple App Review Guidelines were last updated on 2026-06-08 when checked on 2026-07-20.
- The privacy policy must be linked in App Store Connect and inside the app, describe collection and use, cover third parties, retention/deletion, consent withdrawal and deletion requests.
- App Store Connect release notes checked on 2026-07-20 include a 2026-07-08 clarification that screenshots cannot contain alpha channels or transparency and a 2026-07-09 age-rating questionnaire update concerning social-media capabilities.
- No Apple account enrollment, agreement acceptance, certificate creation, payment, signing, TestFlight upload or submission was performed.

Official sources:

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/release-notes/
- https://developer.apple.com/app-store/review/

### Google Play

- Starting 2026-08-31, new mobile apps and app updates must target Android 16 / API level 36 or higher.
- Existing mobile apps must target Android 15 / API level 35 or higher to remain available to new users on devices running a newer Android version.
- Google indicates that an extension to 2026-11-01 may be available, but ReelScribe must not depend on an extension.
- The generated React Native Android project must therefore be inspected after bootstrap and before any Play upload; a simulator/debug build alone is not release evidence.
- No Play account registration, identity verification, agreement acceptance, fee payment, upload-key creation, service-account setup or rollout was performed.

Official sources:

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/16561298

## Runtime findings

### React Native

- React Native 0.86 was released on 2026-06-11 and remains the pinned canonical App line in this repository.
- The official release states that 0.86 is stable and includes Android edge-to-edge and DevTools improvements without user-facing breaking changes.
- No automatic upgrade beyond 0.86 was made because native-manager, whisper.rn, iOS and Android physical-device evidence must move together.

Official source:

- https://reactnative.dev/blog/2026/06/11/react-native-0.86

### whisper.rn and whisper.cpp

- `whisper.rn` 0.6.0 remains pinned.
- Its source rejects direct HTTP/HTTPS transcription inputs and requires a local file path, matching ReelScribe's `ReelScribeManager.prepareMedia` boundary.
- Its transcription cancellation callback is asynchronous and must be awaited.
- The repository continues to allow only one resident ASR context/model at a time.
- No whisper.cpp or whisper.rn upgrade was made in this pass because the native build and 15-second, 15-minute, 60-minute and 3-hour physical-device matrices are incomplete.

Official upstreams:

- https://github.com/mybigday/whisper.rn
- https://github.com/ggml-org/whisper.cpp

## Candidate model findings

### Fun-ASR Nano 2512

- The official Hugging Face model card identifies Apache-2.0 metadata and the full repository is approximately 1.99 GB.
- The primary `model.pt` is approximately 1.97 GB and is a PyTorch pickle artifact. This is not an approved mobile production artifact.
- A separate reviewed mobile runtime, exact artifact set, commit pin, byte sizes, SHA-256 values, license-chain review and physical-device thermals/memory tests are still required.
- Status remains `research-candidate`; it was not added to the production download set.

Official source:

- https://huggingface.co/FunAudioLLM/Fun-ASR-Nano-2512

### sherpa-onnx, SenseVoice, WhisperKit, Qwen3-ASR, Omnilingual, Moonshine, NVIDIA Speech and Parakeet

- No candidate was promoted.
- Each remains subject to its existing catalog tier and requires fixed runtime/model revisions, commercial redistribution review, complete hashes, phone memory/battery/thermal evidence, CER/WER fixtures, timestamp validation, cancellation and long-media checkpoint tests.
- Moonshine multilingual remains excluded from the commercial store build under the current license assessment.
- Server-class Qwen3-ASR, Nemotron and Parakeet options must not be presented as on-device processing.

## Repository checks performed

Reviewed:

- `reelscribe-mobile/package.json`
- `reelscribe-mobile/src/native/NativeReelScribeEngine.ts`
- `reelscribe-mobile/scripts/bootstrap.sh`
- `reelscribe/models/mobile-model-catalog.json`
- `.github/workflows/reelscribe-mobile-check.yml`
- `.github/workflows/reelscribe-native-build.yml`
- `.github/workflows/reelscribe-model-integrity.yml`
- `reelscribe-mobile/MODEL-RESEARCH.md`
- `reelscribe-mobile/STORE-LAUNCH.md`

Confirmed from source review:

- canonical App path remains `reelscribe-mobile/`;
- React Native 0.86.0, React 19.2.3 and whisper.rn 0.6.0 are pinned as direct dependencies;
- Actions permissions are read-only and referenced third-party Actions are pinned to full commit SHAs;
- checkout does not persist credentials;
- the native workflow performs an unsigned Android debug build and unsigned iOS simulator build only;
- production model integrity remains blocked until exact bytes and SHA-256 values are reviewed and committed;
- App Store and Play submission remain human-controlled.

## Unresolved release blockers

1. No reviewed `package-lock.json` is committed, so transitive npm resolution is not yet reproducible enough for a store release.
2. Tiny/Base production byte sizes and SHA-256 values are not locked in the catalog.
3. The generated Android project has not yet produced retained evidence that target SDK 36 is used for the 2026 Play deadline.
4. Physical-device evidence is missing for 15 seconds, 15 minutes, 60 minutes and 3 hours on both iOS and Android.
5. Low-storage, interrupted-download, partial-file isolation, atomic install, delete, thermal throttling, memory warning, foreground/background exclusion, cancellation and checkpoint recovery still require device evidence.
6. The public resolver's production hosting/CDN log retention must be confirmed before final App Privacy and Google Data Safety answers.
7. Signing, store accounts, protected secrets and final listings remain intentionally absent from repository automation.

## Decision

No model or runtime was promoted and no store submission was attempted. The only repository change in this pass is this auditable policy/upstream review record. Production release remains blocked.
