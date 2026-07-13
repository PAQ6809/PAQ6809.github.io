# Android Native Manager

The bootstrap installer copies the Kotlin module and package into the generated application package and registers `ReelScribeManagerPackage()` in `MainApplication.kt`.

The current source handles allowlisted resumable model downloads, SHA-256 verification, local file/content URI import, media decoding and 16 kHz mono WAV generation. ML Kit OCR, durable checkpoint resume and release model hashes remain intentionally disabled until physical-device validation.

Run a Debug build first:

```bash
npm run android
```

Do not remove `../../.do-not-ship` until Gradle Release compilation, device tests, Data Safety declarations and owner signing are complete.
