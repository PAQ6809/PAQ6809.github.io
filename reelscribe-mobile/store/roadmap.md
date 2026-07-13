# Execution Roadmap

## Milestone 1 — Repository baseline

Status: substantially complete.

- React Native application layer.
- Public-link resolver client.
- whisper.rn integration layer.
- Device-aware model catalog.
- Verified model downloader with release SHA gate.
- Privacy, terms, store metadata and CI documents.

## Milestone 2 — Native media engine

Status: next.

- Generate pinned iOS and Android projects.
- Implement `ReelScribeManager` in Swift and Kotlin.
- Decode video/audio into bounded 16 kHz mono chunks.
- Add local speech enhancement/VAD path.
- Add Apple Vision and ML Kit OCR.
- Add task checkpoints and temporary-file cleanup.
- Handle memory warnings, low storage, low power and thermal pressure.

## Milestone 3 — Model release locking

- Download Tiny and Base from approved upstream.
- Record exact byte size and SHA-256.
- Verify clean download from a second environment.
- Run `RELEASE_BUILD=1` catalog audit.
- Keep Small/Turbo behind device and consent gates.
- Keep SenseVoice and all server models disabled until acceptance criteria pass.

## Milestone 4 — Physical-device QA

- Minimum supported iPhone.
- Current high-end iPhone.
- Mid-range Android with 4–6 GB RAM.
- Current flagship Android.
- 30-second, 15-minute, 60-minute and 3-hour media.
- Clean speech, road noise, music, multiple speakers and visible subtitles.
- Offline after model install, cancellation, relaunch, low storage and memory pressure.

## Milestone 5 — Store accounts and signing

Requires the account owner:

- Apple Developer enrollment.
- Google Play developer verification.
- Bundle/application ID reservation.
- Certificates, provisioning and Android signing keys.
- Store agreements and final privacy questionnaires.

## Milestone 6 — Internal distribution

- Signed IPA to TestFlight internal testing.
- Signed AAB to Google Play internal testing.
- Pre-launch report, crash/ANR review and reviewer walkthrough.
- Fix all release-blocking issues.

## Milestone 7 — Submission and phased rollout

- Final screenshots and listing copy from the signed build.
- Submit App Privacy/Data Safety declarations.
- Submit both stores.
- Respond to review questions.
- Release gradually with rollback build ready.

The repository must not mark the product as publicly released until signed builds are approved and visible in the intended storefronts.
