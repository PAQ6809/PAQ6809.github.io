# ReelScribe Store Launch Workflow

## Product decision

First release:

- Free download.
- No account required.
- No advertising.
- No subscription or in-app purchase.
- Local processing is the default.
- Optional server ASR remains disabled.
- Traditional Chinese is the primary store language; English metadata is prepared next.

Provisional identifiers:

```text
iOS bundle ID: io.github.paq6809.reelscribe
Android applicationId: io.github.paq6809.reelscribe
SKU: REELSCRIBE-IOS-001
```

Confirm that the identifier is available before signing. Once a released identifier is used, changing it creates a different app.

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
- Privacy policy URL.
- Support URL.
- Marketing URL.

Recommended screenshot sequence:

1. Paste a public video link.
2. Choose local media and language.
3. Select a device-appropriate model.
4. Show local processing and privacy notice.
5. Edit timeline and export SRT/VTT.
6. Show on-device OCR for burned-in captions.

Do not place unsupported claims such as "all links work" or "100% accurate" in images or metadata.

## iOS release flow

1. Enroll in the Apple Developer Program.
2. Confirm legal name, tax/contact details and the annual membership.
3. Register the bundle ID.
4. Create the App Store Connect app record.
5. Configure signing, capabilities and privacy manifest.
6. Build an archive with the release Xcode version.
7. Run static analysis, unit tests and TestFlight internal testing.
8. Test model downloads, airplane mode, low storage, memory warnings, background/foreground transitions and long-media resume on physical iPhones.
9. Complete App Privacy answers for the app and every third-party SDK.
10. Upload screenshots, description, support/privacy URLs and review notes.
11. Explain in review notes that public-link resolution handles public content only and that local mode keeps media on device.
12. Submit for review.
13. Use phased release after approval.

Review notes draft:

```text
ReelScribe is an offline-first transcription utility. No login is required. Reviewers may select a local sample video through the system document picker. The default Tiny/Base model is downloaded only after an explicit user action and is verified before use. Public YouTube captions use public caption data; public Instagram media is best-effort and does not use account cookies. Private or restricted content is unsupported. OCR and speech transcription run on device.
```

## Android release flow

1. Create and verify a Google Play developer account.
2. Confirm the provisional application ID.
3. Generate and securely back up the upload key; enable Play App Signing.
4. Target the current required Android API level.
5. Add app-private model storage or Play Asset Delivery packs.
6. Build a signed Android App Bundle (`.aab`).
7. Run unit tests, lint, dependency review and pre-launch report.
8. Complete Data Safety, content rating, ads declaration, app access and privacy policy fields.
9. Use internal testing, then closed testing when required for the account type.
10. Verify low-memory devices, Android background restrictions, WorkManager resume and notification behavior.
11. Upload store listing assets and release notes.
12. Roll out in stages rather than immediately to 100%.

Data Safety draft for the planned first release:

- Data collected: none by the app in local mode.
- Data shared: none in local mode.
- Public-link resolver: public URL is processed to deliver the requested feature; verify hosting logs and retention before final declaration.
- Encryption in transit: yes for resolver/model downloads.
- Account deletion: not applicable because the first release has no account.

## Pre-submission release gates

### Product

- No placeholder screens or buttons.
- Native inference module works on both platforms.
- Public resolver failures have clear fallbacks.
- Copy, edit, TXT, SRT and VTT work.
- Accessibility labels and Dynamic Type/font scaling are usable.
- Phone and tablet layouts do not clip controls.

### Accuracy

- Repeated-symbol, repeated-word and OCR-gibberish fixtures are rejected.
- Language selection changes model behavior.
- Music/no-speech does not produce a false successful transcript.
- OCR requires script match and adjacent-frame agreement when confidence is not very high.

### Stability

- 60-minute transcription completes on the minimum supported phone.
- Three-hour task resumes from checkpoint after process termination.
- Only one heavy model/OCR task runs at a time.
- Low storage prevents optional model download.
- Memory warning releases optional buffers without deleting transcript text.

### Security and privacy

- Release model catalog has exact SHA-256 values.
- No unreviewed CDN, dynamic library or arbitrary model URL.
- No social cookies or private tokens.
- Temporary Instagram media is deleted.
- Privacy policy, store declarations and actual SDK behavior match.
- Software bill of materials and license notices are included.

## CI/CD plan

The repository workflow validates TypeScript, the model catalog, prohibited model licenses, store documents and privacy/security requirements. Native builds are added when macOS and Android signing environments are connected.

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
