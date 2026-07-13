# Definition of Done

ReelScribe Mobile is considered complete only when all conditions below are true.

## Build

- iOS Release archive builds with the supported Xcode version.
- Android Release App Bundle builds with the required target API.
- Dependency lockfiles are committed and reproducible.
- No release secret is committed or printed in CI.

## Functionality

- Public YouTube captions work when publicly available.
- Public Instagram best-effort flow has a truthful local-file fallback.
- Local video/audio import works through system pickers.
- Tiny and Base on-device transcription work offline after installation.
- OCR works locally on both platforms.
- Transcript editing, timestamps and TXT/SRT/VTT export work.
- Model removal and project deletion work.

## Accuracy and safety

- Music-only/no-speech clips do not produce a false successful transcript.
- Repeated symbols, repeated words and OCR gibberish are blocked.
- Private/restricted content is not bypassed.
- Models are loaded only after exact integrity verification.
- One heavy task runs at a time on constrained devices.

## Stability

- 60-minute media completes on every minimum supported device.
- Three-hour media can resume from a checkpoint.
- Low storage prevents unsafe downloads.
- Memory and thermal warnings cause controlled downgrade or pause.
- Background/foreground transitions do not duplicate or corrupt tasks.

## Privacy and compliance

- Local mode network capture shows no media, frame or transcript upload.
- Privacy policy, App Privacy and Data Safety match the signed binary.
- Third-party licenses and notices are complete.
- Store screenshots and descriptions contain no unsupported claim.

## Distribution

- TestFlight internal testing passes.
- Google Play internal testing and pre-launch report pass.
- Store records, signing, owner agreements and questionnaires are complete.
- Both stores approve the build.
- The phased release is visible in the intended storefronts.

Repository documentation or an unsigned prototype does not count as store launch completion.
