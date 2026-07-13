# Native Manager Status

Updated: 2026-07-13

Implemented in source:

- React Native to `whisper.rn` transcription path.
- iOS Swift model/media manager and Objective-C bridge.
- Android Kotlin model/media manager and package registration.
- HTTPS host allowlists and redirect checks.
- Cookie-free iOS download session.
- Android resumable partial model downloads.
- SHA-256 verification with release builds failing closed while hashes are unset.
- Local file/content import and temporary working directories.
- Streaming conversion to 16 kHz mono WAV.
- Model/storage/thermal capability reporting.
- Automatic bootstrap registration and static CI audit.

Still intentionally blocked:

- Xcode and Android Gradle compilation from a clean generated project.
- Physical-device model, memory, thermal and long-file tests.
- Exact release SHA-256 and expected byte sizes for Tiny/Base artifacts.
- Apple Vision and ML Kit frame sampling/fusion.
- Durable atomic checkpoint resume.
- Developer-account identifiers, signing, privacy questionnaires and store submission.

`reelscribe-mobile/.do-not-ship` must remain until all release gates pass.
