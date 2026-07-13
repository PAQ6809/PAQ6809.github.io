# Release Owner Checklist

## Accounts and legal

- [ ] Apple Developer Program enrollment is active.
- [ ] Google Play developer account is verified.
- [ ] `io.github.paq6809.reelscribe` is available on both stores.
- [ ] Legal entity/contact details are correct.
- [ ] Privacy policy and terms URLs are publicly reachable.
- [ ] Support email is confirmed.

## Signing

- [ ] iOS distribution certificate and provisioning are stored outside the repository.
- [ ] Android upload key is backed up securely.
- [ ] Play App Signing is enabled.
- [ ] No private key, certificate password, keystore or API token appears in Git history or CI logs.

## Models

- [ ] Tiny and Base model files have exact byte sizes and SHA-256 values in the release catalog.
- [ ] `RELEASE_BUILD=1 node scripts/audit-model-catalog.mjs` passes.
- [ ] Small/Turbo are disabled unless physical-device acceptance tests pass.
- [ ] SenseVoice remains disabled until license, runtime and device tests pass.
- [ ] Qwen3-ASR and other server models remain disabled in the first store release.
- [ ] Non-commercial multilingual Moonshine models are excluded.

## Native app

- [ ] iOS and Android native projects are generated from the pinned React Native version.
- [ ] `ReelScribeManager` performs bounded media decoding, cleanup and local OCR.
- [ ] `whisper.rn` transcribes from verified local model files only.
- [ ] Background/foreground transitions do not start duplicate jobs.
- [ ] Long jobs can stop, checkpoint and resume.
- [ ] Memory warning and serious thermal state release optional resources.
- [ ] OCR and ASR high-memory work are mutually exclusive on constrained devices.

## Quality matrix

- [ ] Mandarin, Taiwanese-accented Mandarin, English, Japanese and Korean samples.
- [ ] Clean speech, traffic noise, music, multiple speakers and burned-in captions.
- [ ] 30-second, 15-minute, 60-minute and 3-hour inputs.
- [ ] Minimum supported iPhone, current iPhone, mid-range Android and flagship Android.
- [ ] Low storage, low power, offline-after-model-install, cancellation and relaunch.
- [ ] Repeated words, repeated symbols and OCR gibberish are rejected.

## Store metadata

- [ ] Traditional Chinese and English metadata reviewed.
- [ ] Screenshots match the current build.
- [ ] No claim says every link works or transcription is 100% accurate.
- [ ] App Privacy and Data Safety answers match every linked SDK and resolver log.
- [ ] Review notes contain a reproducible local-file test path.
- [ ] Age/content rating questionnaires are completed truthfully.

## Distribution

- [ ] Internal iOS TestFlight testing completed.
- [ ] Google Play internal testing completed.
- [ ] Required closed-testing period completed for the account type.
- [ ] Crash-free and ANR metrics are acceptable.
- [ ] Phased rollout is selected.
- [ ] Rollback build and incident contact are ready.
