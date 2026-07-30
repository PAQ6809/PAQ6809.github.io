# ReelScribe Store Launch Workflow

Last reviewed against official store documentation: 2026-07-30

## Current engineering status

Completed in the repository:

- React Native iOS/Android application UI.
- Native Whisper path through whisper.rn/whisper.cpp.
- App-owned iOS AVFoundation/Vision and Android MediaCodec/ML Kit manager.
- Streaming iOS/Android audio preparation rather than retaining a complete long soundtrack in memory.
- Public YouTube/Instagram resolver integration with local fallback.
- TXT, SRT and VTT serialization/share flow.
- Privacy, support, terms, App Privacy and Google Data Safety drafts.
- Store listing drafts in Traditional Chinese and English.
- Model catalog, integrity-report workflow, source preflight, Android debug build and iOS simulator build workflows.

Not completed and intentionally blocked:

- signed iOS archive and signed Android App Bundle;
- Tiny/Base final byte sizes and SHA-256 values in the production catalog;
- physical-device 15/60/180-minute test evidence;
- developer-account enrollment, identity verification and store app records;
- final screenshots and reviewer demo;
- App Store/Play submission and production rollout.

## Product decision

First release:

- Free download.
- No account required.
- No advertising.
- No subscription or in-app purchase.
- Local processing is the default.
- Optional server ASR remains disabled.
- Traditional Chinese is the primary store language; English metadata is prepared.
- Tiny and Base are the initial mobile model set. Newer models stay candidate/server/research until the release gates pass.

Provisional identifiers:

```text
iOS bundle ID: io.github.paq6809.reelscribe
Android applicationId: io.github.paq6809.reelscribe
SKU: REELSCRIBE-IOS-001
```

Confirm that the identifier is available before signing. Once a released identifier is used, changing it creates a different app.

## Developer accounts and current costs

### Apple

- Apple Developer Program membership is currently USD 99 per membership year, with regional pricing and possible waivers for qualifying entities.
- Individual enrollment requires legal identity and two-factor authentication; an organization also needs legal authority and normally a D-U-N-S Number.
- The Account Holder must accept the agreement and make the purchase.

### Google Play

- Play Console registration currently has a USD 25 one-time fee.
- The developer must accept the distribution agreement and complete identity verification.
- New personal accounts can have device-verification and testing requirements before production distribution.

These charges, account creation, identity checks and agreements cannot be completed by repository automation.

## Store listing draft

### Name

```text
ReelScribe－影片轉字幕
```

### Subtitle / short description

```text
貼連結或選影片，在手機本機產生可複製字幕
```

### Promotional text

```text
公開字幕優先；沒有字幕時使用手機本機 AI 與畫面 OCR。支援時間軸、TXT、SRT、VTT，預設不外傳影片。
```

### Full description

```text
ReelScribe 是一款離線優先的影片字幕工具。

你可以貼上公開 YouTube 或 Instagram 連結，或直接選擇手機裡的影片與音訊。系統會先使用平台公開字幕；沒有可用字幕時，再使用手機本機語音辨識與畫面文字辨識。

主要功能：
・公開字幕與時間軸讀取
・手機本機 Whisper 語音辨識
・背景音樂抑制與人聲區段偵測
・讀取影片畫面中已燒錄的字幕
・長影片分段、進度保存與中斷續跑
・可編輯全文與時間軸
・匯出 TXT、SRT、VTT
・多種模型依裝置能力選擇

隱私設計：
・本機模式不會上傳影片、音訊、畫面或字幕
・不要求社群帳號密碼、Cookie 或私人 Token
・不含廣告追蹤器
・模型可由使用者管理與刪除

部分社群平台或私人內容可能無法匿名解析。ReelScribe 不繞過登入、付費牆、地區限制或 DRM。
```

### Keywords

```text
字幕,影片轉文字,逐字稿,SRT,VTT,Whisper,OCR,Instagram,YouTube,離線辨識
```

### Category

Primary: Productivity
Secondary: Photo & Video

### Age rating

Target: 4+ / Everyone. Complete the platform questionnaires truthfully; the app does not provide unfiltered user-generated-content browsing.

## Required assets

- 1024×1024 App Store icon without transparency.
- Android adaptive foreground and background icons.
- iPhone screenshots for current required display sizes.
- iPad screenshots only if iPad distribution is enabled.
- Android phone screenshots and feature graphic.
- Optional 20–30 second preview showing link → local processing → editable subtitles.
- Active privacy policy URL.
- Active support URL.
- Marketing URL.

Recommended screenshot sequence:

1. Paste a public video link.
2. Choose local media and language.
3. Select a device-appropriate model.
4. Show local processing and privacy notice.
5. Edit timeline and export SRT/VTT.
6. Show on-device OCR for burned-in captions.

Do not place unsupported claims such as “all links work,” “perfectly removes music” or “100% accurate” in images or metadata.

## iOS release flow

1. Enroll in the Apple Developer Program.
2. Confirm legal name, tax/contact details, two-factor authentication and annual membership.
3. Register the bundle ID.
4. Create the App Store Connect app record.
5. Configure signing, capabilities, minimum OS and privacy manifest.
6. Lock model byte sizes/SHA-256 and run `npm run preflight:release`.
7. Build an archive with the current supported Xcode release.
8. Run static analysis, native-build CI and TestFlight internal testing.
9. Test model downloads, airplane mode, low storage, memory warnings, background/foreground transitions and long-media resume on physical iPhones.
10. Complete App Privacy answers for the binary, resolver and every third-party SDK.
11. Upload screenshots, description, support/privacy URLs and review notes.
12. Explain that public-link resolution handles public content only and local mode keeps selected media on device.
13. Submit for App Review.
14. Use phased release after approval.

Review notes draft:

```text
ReelScribe is an offline-first transcription utility. No login is required. Reviewers may select a local sample video through the system document picker. The default Tiny/Base model is downloaded only after an explicit user action and is verified before use. Public YouTube captions use public caption data; public Instagram media is best-effort and does not use account cookies. Private or restricted content is unsupported. OCR and speech transcription run on device.
```

## Android release flow

Current Google Play target API requirement, re-checked against the official Android/Play documentation on 2026-07-30:

- Starting **2026-08-31**, new apps and app updates must target **Android 16 / API level 36 or higher** for standard phone/tablet distribution.
- Existing apps must target Android 15 / API level 35 or higher to remain available to new users on devices running Android versions above the app's target level.
- Google documents an extension path to 2026-11-01, but ReelScribe must not rely on that extension as its normal release plan.
- Before signing a release AAB, CI and the generated Gradle project must provide evidence that `targetSdkVersion` is at least 36 and that all native/third-party SDKs remain compatible.

Official reference: https://developer.android.com/google/play/requirements/target-sdk

1. Create and verify a Google Play developer account.
2. Accept the distribution agreement and pay the one-time registration fee.
3. Complete personal/organization identity requirements and any required device/closed-testing steps.
4. Confirm the application ID.
5. Generate and securely back up the upload key; enable Play App Signing.
6. For submissions on or after 2026-08-31, target Android 16 / API 36 or higher; re-check the official requirement again immediately before submission.
7. Lock model byte sizes/SHA-256 and run `npm run preflight:release`.
8. Build a signed Android App Bundle (`.aab`).
9. Run unit tests, lint, dependency review and the Play pre-launch report.
10. Complete privacy policy, Data Safety, content rating, ads, target audience and app-access declarations.
11. Use internal testing, then closed testing when required for the account type.
12. Verify low-memory devices, Android background restrictions, checkpoint resume and notification behavior.
13. Upload store listing assets and release notes.
14. Roll out in stages rather than immediately to 100%.

Data Safety draft for the planned first release:

- Data collected by the local feature: none intentionally.
- Data shared by the local feature: none intentionally.
- Public-link resolver: public URL is processed to deliver the requested feature; hosting/CDN logs and retention must be checked before the final form.
- Encryption in transit: yes for resolver/model downloads.
- Account deletion: not applicable because the first release has no account.

Google requires an active privacy policy and accurate App content declarations. The final answer must reflect the exact signed AAB and production logging configuration, not only this draft.

## Pre-submission release gates

### Product

- No placeholder screens or buttons.
- Native inference module works on both platforms.
- Public resolver failures have clear fallbacks.
- Copy, edit, TXT, SRT and VTT work.
- Accessibility labels and font scaling are usable.
- Phone and tablet layouts do not clip controls.

### Models

- Tiny/Base URLs, exact byte sizes and SHA-256 are locked.
- Optional Small/Turbo downloads are device-gated and explicitly accepted.
- Fun-ASR Nano, SenseVoice, Omnilingual, Moonshine, Qwen3-ASR, Nemotron and Parakeet remain disabled until their own license/runtime/device gates pass.
- A model-integrity report is reviewed by a human before catalog changes.
- No phone downloads or retains every model.

### Accuracy

- Repeated-symbol, repeated-word and OCR-gibberish fixtures are rejected.
- Language selection changes model behavior.
- Music/no-speech does not produce a false successful transcript.
- OCR requires script match and adjacent-frame agreement when confidence is not very high.

### Stability

- 60-minute transcription completes on the minimum supported phone.
- Three-hour task resumes from checkpoint after process termination.
- iOS and Android audio preparation remain streaming/bounded.
- Only one heavy model/OCR task runs at a time.
- Low storage prevents optional model download.
- Memory warning releases optional buffers without deleting transcript text.

### Security and privacy

- Release model catalog has exact SHA-256 values.
- No unreviewed CDN, dynamic library or arbitrary model URL.
- No social cookies or private tokens.
- Temporary Instagram media is deleted.
- Privacy policy, store declarations and actual SDK/backend behavior match.
- Software bill of materials and license notices are included.
- Signing keys, provisioning profiles, upload keystores and store API credentials never enter Git.

## CI/CD plan

Automated now:

- TypeScript, model catalog, prohibited-license and store-document checks.
- App-owned native module and autolinking checks.
- Android unsigned debug APK build.
- iOS unsigned simulator build.
- Manual model artifact byte/SHA-256 report.
- Security checks for pinned Actions, read-only tokens and prohibited secrets.

Human-controlled release stage:

- App Store certificate/provisioning and signed archive.
- Android upload keystore and signed AAB.
- App Store Connect/Play Console API credentials.
- Environment-protected production approval.
- Final submission and staged/phased release.

Release CI must use environment-protected secrets and must never print certificates, provisioning profiles, keystore passwords or API keys.

## Items that require the account owner

These cannot be completed anonymously or through repository code:

- pay/approve developer-program enrollment;
- identity and legal verification;
- reserve bundle/application identifiers;
- create signing certificates and keys;
- accept store agreements;
- complete tax/banking details if monetization is added;
- upload and submit through App Store Connect / Play Console;
- answer final privacy/content questionnaires;
- approve public release.

No store submission should occur until the native release build passes physical-device tests and the account owner confirms the listing.
