# Current State — 2026-07-13

## Implemented in repository

- React Native 0.86 application UI and task orchestration.
- `whisper.rn` 0.6.0 integration with local Whisper context management.
- Device-aware Tiny/Base/Small/Turbo model choices.
- App-private model download manager with HTTPS allowlist, partial files, storage check and SHA-256 release gate.
- Public YouTube captions and public Instagram resolver client with `credentials: omit`, `no-store` and no-referrer policy.
- Native media/OCR/checkpoint interface contract.
- Traditional Chinese and English store metadata.
- Public privacy policy and terms.
- App Privacy, Data Safety, permissions, reviewer, screenshot, incident and release checklists.
- Mobile CI workflow and scheduled maintenance policy.

## Not yet completed

- Generated and compiled `ios/` and `android/` projects.
- Swift/Kotlin implementation of media decoding, Apple Vision/ML Kit OCR and checkpoints.
- Locked Tiny/Base model byte sizes and SHA-256 values.
- Physical-device acceptance tests.
- Signed IPA/AAB.
- Apple Developer and Google Play owner registration/signing/submission.
- Store approval and public rollout.

The project is a serious native application baseline, but it is not yet a downloadable store product. Repository documentation must not claim otherwise.
