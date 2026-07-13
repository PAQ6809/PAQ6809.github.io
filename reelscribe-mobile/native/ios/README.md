# iOS Native Manager

The bootstrap installer adds this directory to the generated Podfile as a local pod.

Before the first build:

```bash
cd ios
pod install
```

The current source handles secure model/media download, storage/thermal capabilities and 16 kHz mono WAV conversion. Vision OCR, checkpoint resume and release model hashes remain intentionally disabled until physical-device validation.

Do not remove `../..//.do-not-ship` until Xcode Release compilation, model integrity, device tests, privacy declarations and owner signing are complete.
