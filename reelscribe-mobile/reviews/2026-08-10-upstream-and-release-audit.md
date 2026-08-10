# ReelScribe upstream and release audit — 2026-08-10

This record captures primary-source checks relevant to the canonical `reelscribe-mobile/` app. It is an audit record, not a declaration that a candidate is production-ready.

## Release policy result

No new ASR model or mobile runtime is promoted to production in this review. `whisper-tiny` and `whisper-base` remain the first mobile core; Small/Turbo remain conditional manual downloads; Qwen3-ASR, Fun-ASR Nano, SenseVoice, Omnilingual ASR, Moonshine, Nemotron and Parakeet stay candidate/server/research until artifact integrity and physical-device evidence exist.

## React Native

Primary source checked: React Native Releases Overview.

- React Native 0.86.x remains an Active line.
- The official schedule lists 0.87.x for 2026-08-10, but the current public release records checked during this run still expose 0.87 release candidates rather than a production 0.87.0 release.
- The canonical app therefore remains pinned to React Native 0.86.0 for this run. Do not advance on calendar date alone.
- The upstream release list also exposes a 0.86.2 patch. A patch upgrade is not applied until `whisper.rn`, the app-owned ReelScribeManager, Android API 36 and both native builds pass together.

Sources:
- https://reactnative.dev/releases/
- https://github.com/facebook/react-native/releases

## Apple App Store

Primary sources checked: Apple App Review Guidelines and App Store Connect screenshot specifications.

- App Review Guidelines show Last Updated: 2026-06-08.
- Store privacy disclosure and actual SDK/runtime behavior must continue to match.
- App Store screenshots accept JPEG/JPG/PNG, one to ten per supported device group, and must not contain alpha channels or transparency.
- ReelScribe store assets must not claim 100% accuracy, universal-link success or complete music separation.

Sources:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/

## Google Play / Android

Primary sources checked: Google Play Target API Level Policy and the July 15, 2026 policy announcement.

- Starting 2026-08-31, new Android apps and app updates for ordinary mobile devices must target Android 16 / API 36 or higher.
- Existing apps must target Android 15 / API 35 or higher to remain available to new users on newer Android versions.
- The July 15, 2026 policy announcement clarifies that User Data requirements apply to third-party AI integrations as well; the developer remains responsible for disclosure, limited use and consent.
- ReelScribe must therefore treat any future server ASR as a separate consented mode and cannot silently upload media.

Sources:
- https://support.google.com/googleplay/android-developer/answer/16561298
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/17134731

## whisper.cpp / whisper.rn

Primary sources checked: upstream GitHub release records.

- Standalone whisper.cpp latest tagged release observed in the official release feed is v1.8.6.
- The app remains pinned to `whisper.rn` 0.6.0; the binding's embedded/runtime provenance must be judged from that package rather than by blindly replacing it with the standalone latest tag.
- No runtime swap is performed in this review.

Sources:
- https://github.com/ggml-org/whisper.cpp/releases
- https://github.com/mybigday/whisper.rn

## WhisperKit / Argmax OSS

Primary source checked: Argmax open-source release feed.

- WhisperKit has graduated into the Argmax Open-Source SDK 1.0.0 line.
- The 1.0.0 release is explicitly breaking and changes package/API surface.
- It remains an iOS-only candidate for ReelScribe; adding a second production ASR runtime would increase binary size, model duplication and regression surface.

Source:
- https://github.com/argmaxinc/argmax-oss-swift/releases

## sherpa-onnx

Primary source checked: official GitHub release feed.

- Latest release observed: v1.13.2.
- Official release assets include checksums and Android AAR artifacts.
- Recent releases add/adjust Parakeet Unified, SenseVoice options, Fun-ASR Nano and Qwen3-ASR support.
- This improves candidate-runtime maturity but does not establish ReelScribe phone memory, thermal, timestamp or long-media safety.

Source:
- https://github.com/k2-fsa/sherpa-onnx/releases

## Qwen3-ASR

Primary source checked: QwenLM/Qwen3-ASR.

- Apache-2.0 code/model family.
- Official series remains 0.6B / 1.7B with 52-language/dialect ASR and forced alignment support.
- Official examples remain Python/Transformers/vLLM-oriented.
- It remains an explicit server candidate, not a normal phone model.

Source:
- https://github.com/QwenLM/Qwen3-ASR

## Fun-ASR Nano 2512

Primary source checked: FunAudioLLM model card and repository tree.

- Model card license remains Apache-2.0.
- The current model card now explicitly advertises a CPU/edge GGUF path via llama.cpp-compatible tooling.
- The canonical Hugging Face repository is about 1.99 GB and its principal `model.pt` is about 1.97 GB, so the upstream default artifact is not a reasonable first-release phone download.
- The GGUF path is promising enough to keep in the research queue, but no community/prebuilt conversion is accepted without fixed upstream revision, exact artifact URL, byte size, SHA-256, reproducible conversion provenance and iOS/Android physical-device tests.

Source:
- https://huggingface.co/FunAudioLLM/Fun-ASR-Nano-2512

## Omnilingual ASR

Primary source checked: facebookresearch/omnilingual-asr.

- Code and released models are stated as Apache-2.0.
- The family targets 1,600+ languages.
- Broad coverage does not remove download, language-routing, memory, latency and QA costs, so the mobile INT8 variant remains research-only until ReelScribe-specific evidence exists.

Source:
- https://github.com/facebookresearch/omnilingual-asr

## Store and supply-chain checks

Repository review confirms the canonical mobile source remains `reelscribe-mobile/`; no parallel Capacitor/mobile prototype is introduced in this run.

The checked workflows continue to require read-only repository permissions, SHA-pinned third-party Actions and checkout with credentials disabled. `reelscribe-native-build.yml` already executes `npm run check` before native build jobs. `reelscribe-mobile-check.yml` executes the same component checks explicitly plus source/security assertions.

A local clone/install/check attempt was made in the automation execution environment, but DNS resolution for `github.com` failed before checkout. This is an execution-environment network failure and is not evidence of CI pass or failure. Do not mark release-ready from this run.

## Remaining production blockers

- exact byte size and SHA-256 for every downloadable production model artifact;
- reviewed lockfile / reproducible npm dependency installation;
- Android API 36 native-build evidence;
- 15-second, 15-minute, 60-minute and 3-hour physical-device evidence on both platforms;
- low-storage, partial-download, atomic-install, cancellation, resume, checkpoint, foreground/background, thermal and memory-warning evidence;
- final App Privacy / Google Data Safety verification against signed binaries;
- resolver hosting-log retention review and production-site/repository integrity evidence.

No signing, certificate/key generation, paid enrollment, legal-agreement acceptance, App Store/Play submission or production rollout is performed by this audit.
