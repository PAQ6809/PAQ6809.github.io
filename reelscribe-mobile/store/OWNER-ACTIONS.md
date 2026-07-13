# ReelScribe Store Owner Actions

These steps require the legal account holder. Repository automation must never spend money, accept legal agreements, create signing identities, or submit a public release without explicit owner approval.

## 1. Accounts and identity

### Apple

- Enroll in the Apple Developer Program.
- Complete identity/legal-entity verification and agreements.
- Confirm the current annual fee before payment.
- Register `io.github.paq6809.reelscribe` only after confirming it is the permanent identifier.
- Create the App Store Connect app record and SKU `REELSCRIBE-IOS-001`.

### Google Play

- Create and verify the Google Play developer account.
- Complete identity/contact verification and any required testing eligibility steps.
- Confirm the current registration fee before payment.
- Reserve application ID `io.github.paq6809.reelscribe` before producing the release AAB.

## 2. Signing material

- iOS: create distribution certificate and App Store provisioning/profile through the approved Apple workflow.
- Android: generate an upload key, store it offline in an encrypted backup, and enable Play App Signing.
- Never commit certificates, `.p12`, provisioning profiles, keystores, passwords, API keys or service-account JSON.
- Store CI secrets only in protected environments with required manual approval.

## 3. Final product decisions

- Confirm minimum iOS version and supported iPhone/iPad devices.
- Confirm minimum Android SDK and current target API requirement.
- Confirm free/no-account/no-ad/no-IAP version 1.0 positioning.
- Confirm whether iPad distribution is enabled.
- Confirm support/privacy email and response process.
- Confirm public resolver hosting logs and retention.

## 4. Model release approval

Before release:

- Lock exact byte size and SHA-256 for every production-downloadable model.
- Approve only Tiny/Base for the initial universal device tier unless physical tests justify more.
- Enable Small only for devices that pass memory, thermal and long-task tests.
- Keep Large-v3-turbo as an explicit optional flagship download until store-grade testing passes.
- Do not enable SenseVoice, WhisperKit, Moonshine, Qwen3-ASR, Nemotron or Parakeet merely because the model is newer; follow the catalog status and license gates.

## 5. Physical-device release matrix

Required minimum tests:

- 4 GB-class iPhone and current flagship iPhone.
- Mid-range Android with 4–6 GB RAM and current flagship Android.
- 30-second, 15-minute, 60-minute and 3-hour media.
- Mandarin/Taiwanese-accented Mandarin, Cantonese, English, Japanese and Korean.
- Clean speech, music, street noise, multiple speakers and burned-in subtitles.
- Low storage, Low Power/Battery Saver, thermal throttling, background/foreground, incoming interruption and process termination.
- Airplane mode after model installation.
- Tampered/interrupted model download.
- OCR and ASR mutual exclusion.

Record CER/WER, time to first result, real-time factor, peak memory, battery, thermal state, crash rate and timestamp drift.

## 6. Store assets and metadata

- Approve final icon, screenshots and feature graphics.
- Capture screenshots from a release build, not the web page or a design mockup that differs from the app.
- Review `store/zh-TW.md` and `store/en-US.md`.
- Review privacy/data-safety answers against the final binary and actual resolver logs.
- Do not claim all links work, perfect music separation, real-time processing on every device or 100% accuracy.

## 7. Submission sequence

### iOS

1. Archive the release build with the selected Xcode version.
2. Validate the archive, privacy manifests and signing.
3. Upload to App Store Connect.
4. Use TestFlight internal testing, then a limited external test if appropriate.
5. Complete App Privacy, age rating, export compliance and review information.
6. Provide a local sample-video review path and public-link limitations in review notes.
7. Submit and use phased release after approval.

### Android

1. Produce a signed Android App Bundle.
2. Run lint, dependency/license review and Play pre-launch report.
3. Upload to Internal testing.
4. Complete Data Safety, ads, app access, target audience, content rating and privacy policy.
5. Complete any required closed testing for the account type.
6. Roll out gradually after acceptance.

## 8. Post-release

- Monitor crashes, ANRs, memory termination, model-download failures and resolver failures.
- Maintain a rollback plan and staged rollout.
- Re-run model/license/privacy review before each model or SDK addition.
- Update store declarations before enabling accounts, sync, analytics, cloud ASR, subscriptions or advertising.
