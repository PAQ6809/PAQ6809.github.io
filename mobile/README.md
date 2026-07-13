# ReelScribe Mobile

ReelScribe Mobile is the iOS and Android packaging workspace for the existing privacy-first ReelScribe web application.

## Current implementation

- Capacitor 8 native shell for iOS and Android.
- The tested web runtime is copied from `reelscribe/` into `mobile/www` by `npm run sync:web`.
- Local Whisper, speech enhancement, screen OCR and subtitle editing remain on-device.
- Native Filesystem and Share plugins export TXT, SRT and VTT through the operating-system share sheet.
- Native deep links can place a shared public video URL into the resolver.
- Service Worker registration is disabled inside the native shell because native bundles are versioned by the App Store or Play Store.
- HTTPS-only navigation and cleartext traffic disabled.

The first native release deliberately reuses the already-tested local browser inference path. The researched native engines and newer ASR models in `models/catalog.json` remain candidates until license review, phone benchmarks, thermal testing, memory testing and transcript-quality evaluation are complete.

## Prerequisites

- Node.js 22 or newer.
- Android Studio and a supported Android SDK for Android builds.
- macOS, Xcode and an Apple Developer account for signed iOS builds.
- Google Play Console access for Play Store release.

## Local setup

```bash
cd mobile
npm install
npm run verify
npm run sync:web
```

Create platform projects once:

```bash
npm run cap:add:android
npm run cap:add:ios
```

After changes to the web application or native bridge:

```bash
npm run cap:sync
```

Open native IDEs:

```bash
npm run open:android
npm run open:ios
```

Unsigned Android debug build:

```bash
npm run build:android:debug
```

Release signing, package names, version codes and store credentials are intentionally not committed to the repository.

## Model installation policy

1. Do not bundle hundreds of megabytes of model weights into the base application.
2. Tiny/Base are downloaded on demand for normal mobile use.
3. Larger or specialist packs require explicit user consent, Wi-Fi by default, an estimated download size, a checksum and a delete control.
4. Never download multiple large ASR models concurrently.
5. Each new model must pass license, security, memory, thermal, battery, latency and multilingual quality reviews before it can move from `native-candidate` to an active state.
6. A failed or unavailable optional model must fall back to the existing Whisper path without losing the user's media or transcript.

## Native-engine roadmap

The catalog currently tracks:

- Qwen3-ASR 0.6B INT8 through sherpa-onnx for high-accuracy multilingual and Chinese/dialect evaluation.
- FunASR Nano INT8 for Chinese-first speech, dialect and singing evaluation.
- Moonshine Chinese quantized for low-latency Chinese evaluation.
- SenseVoice INT8 for compact East-Asian multilingual evaluation.
- Omnilingual ASR 300M INT8 for long-tail language packs.
- whisper.cpp quantized models as a mature native offline fallback.

These are not all activated simultaneously. The product uses a curated router so the phone downloads only the model appropriate to its language, storage, memory and performance profile.

## Security boundary

- No social account password, browser cookie or private session is accepted.
- Local files, decoded audio and OCR frames remain on the device.
- Public Instagram media can use the existing short-lived signed public resolver; the backend does not persist the media.
- Public YouTube caption lookup sends only the public URL and optional language preference.
- Export files are written to the application cache and handed to the native share sheet.
- No production signing key, App Store credential or Play Console service account belongs in Git.

## Release documents

- `MODEL_RESEARCH.md`
- `PRIVACY_DATA_MAP.md`
- `STORE_RELEASE_CHECKLIST.md`
- `store/app-store-zh-TW.md`
- `store/google-play-zh-TW.md`
