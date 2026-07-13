# ReelScribe Mobile Release Status

Updated: 2026-07-13

## Completed in the repository

- React Native iOS/Android application UI and task orchestration.
- Public YouTube/Instagram resolver client.
- `whisper.rn` native ASR binding.
- Curated model catalog and deployment policy.
- Secure local model manager with HTTPS allowlist, partial files, storage checks and SHA-256 enforcement.
- Autolinkable Swift/Kotlin `ReelScribeManager` source package.
- iOS AVFoundation media preparation and Apple Vision OCR source.
- Android MediaExtractor/MediaCodec media preparation and ML Kit OCR source.
- Native capability reporting, cleanup and basic checkpoint save/resume.
- Traditional Chinese and English store metadata.
- Public privacy, terms and support URLs.
- App Privacy and Google Data Safety working drafts.
- Store preflight, model-catalog audit and mobile CI.
- Manual unsigned Android/iOS native build-validation workflow.

## Not yet verified

- Successful Xcode compilation of the generated iOS project.
- Successful Gradle compilation of the generated Android project.
- React Native autolinking in the generated native projects.
- Physical-device inference, OCR, memory, thermal and battery behavior.
- Full long-media process-death resume with media/model fingerprint enforcement.
- Exact release model byte sizes and SHA-256 values.
- Final app icon, native screenshots and store feature graphics.
- Final signed IPA/AAB.
- Store-account identity, agreements, bundle/application ID registration and signing material.
- Final resolver log-retention review and store privacy answers.
- TestFlight, Play Internal/Closed testing and store review.

## Release blockers

1. Run the manual native-build workflow and fix all native compiler errors.
2. Lock Tiny/Base model hashes and exact sizes; keep release preflight red until complete.
3. Complete physical-device matrix and long-media interruption tests.
4. Finalize privacy manifests, Android permissions and third-party SDK inventory.
5. Produce release-build screenshots and icons.
6. Account holder completes developer enrollment, identifiers, signing and legal questionnaires.
7. Submit staged test releases before public production rollout.

## Truthful product status

The source is an advanced native-app candidate with implemented mobile architecture. It is not yet a signed, installed, store-submitted or store-approved product. No release claim may omit this distinction.
