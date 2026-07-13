# ReelScribe Store Release Checklist

Last reviewed: 2026-07-13

This is the end-to-end release gate. Code preparation can be automated; account ownership, identity verification, legal agreements, signing, payment and final submission require the developer-account holder.

## 0. Product gate

- [ ] App provides meaningful native value beyond a website wrapper: native file export/share, deep-link/share intake, on-device media processing, offline/local workflow and device-aware model management.
- [ ] No store text claims every social link or every video will succeed.
- [ ] Optional model downloads show estimated size and ask for consent before downloading.
- [ ] The app remains usable with the default small model path.
- [ ] Model-license review is complete for every activated downloadable pack.
- [ ] Privacy policy and support URL are publicly accessible.

## 1. Developer accounts

### Apple

- [ ] Enroll the legal seller in the Apple Developer Program.
- [ ] Complete identity, agreements, tax and banking setup where required.
- [ ] Create App Store Connect access roles for release operators.
- [ ] Protect the Apple account with two-factor authentication.

### Google Play

- [ ] Create and verify the Play Console developer account.
- [ ] Pay the registration fee and complete identity/contact verification.
- [ ] For a new personal account, complete required device and closed-testing requirements shown by Play Console.
- [ ] Enable strong account security and restrict access by role.

## 2. Product identifiers

- [ ] Confirm final brand name: ReelScribe.
- [ ] Confirm bundle/application ID: `io.github.paq6809.reelscribe` or replace it before first store record creation.
- [ ] Reserve the App Store bundle ID and Play package name.
- [ ] Define semantic marketing version and monotonically increasing iOS build/Android version code.
- [ ] Configure universal links/app links only for owned HTTPS domains.

## 3. Native project generation

```bash
cd mobile
npm install
npm run verify
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

- [ ] Commit generated platform projects only after reviewing generated permissions and build settings.
- [ ] Verify release builds do not enable WebView debugging.
- [ ] Confirm cleartext network traffic remains disabled.
- [ ] Confirm Service Worker is disabled inside native bundle.
- [ ] Confirm native export/share and app-link intake work.

## 4. iOS build and signing

- [ ] Use a supported macOS/Xcode version.
- [ ] Set team, bundle ID, deployment target, version and build number.
- [ ] Add purpose strings only for permissions actually used, including microphone when optional recording is enabled.
- [ ] Configure App Store distribution signing through Xcode/App Store Connect.
- [ ] Archive Release configuration.
- [ ] Run Xcode validation and inspect privacy-manifest warnings.
- [ ] Upload to App Store Connect.
- [ ] Test through TestFlight on at least one current iPhone and one older supported iPhone.

## 5. Android build and signing

- [ ] Use a Play-supported target API level confirmed at release time.
- [ ] Generate and protect the upload keystore outside Git.
- [ ] Enable Play App Signing.
- [ ] Configure release signing through environment-protected CI or local secure storage.
- [ ] Build an Android App Bundle (`.aab`).
- [ ] Run Android lint and inspect the merged manifest for unnecessary permissions.
- [ ] Test internal/closed tracks on high-, mid- and low-memory devices.

## 6. Required functional test matrix

- [ ] Public Instagram link: resolver success and truthful fallback.
- [ ] Public YouTube manual caption.
- [ ] Public YouTube automatic caption.
- [ ] Local MP4/MOV/WebM and common audio formats.
- [ ] Mandarin, Taiwan Mandarin, English, Japanese, Korean and code-switching.
- [ ] Loud background music and no-speech rejection.
- [ ] Burned-in subtitle OCR with clean text and false-positive rejection.
- [ ] 15-second, 1-minute, 10-minute and 30-minute media.
- [ ] Incoming app/deep link.
- [ ] TXT/SRT/VTT native export and share.
- [ ] Offline reopening after the selected model has been cached.
- [ ] Low-storage, low-memory, interrupted download and app-background recovery.
- [ ] No duplicate background/foreground model loading.

## 7. Model-pack release gate

For each optional native model:

- [ ] Exact upstream version and source pinned.
- [ ] License and redistribution terms approved.
- [ ] SHA-256 checksum recorded.
- [ ] Download size and minimum free-space requirement shown before download.
- [ ] Wi-Fi default and explicit cellular override.
- [ ] Resumable or safely restartable download.
- [ ] Atomic install: partial files never become active.
- [ ] Delete-model control works.
- [ ] Peak memory, battery and thermal tests passed.
- [ ] Fallback model remains usable after failure.

## 8. Privacy, legal and content

- [ ] Public privacy policy matches the exact binary and backend configuration.
- [ ] App Store App Privacy answers reviewed.
- [ ] Google Play Data safety answers reviewed.
- [ ] Content-rights language tells users to process only content they are authorized to use.
- [ ] No promise to bypass private accounts, login, DRM, region restrictions or platform controls.
- [ ] Terms/support contact published.
- [ ] Exported subtitles are user-controlled and removable.

## 9. Store listing assets

### Required source assets

- [ ] Master square app icon without transparency or embedded store badge.
- [ ] iPhone screenshots for required display sizes.
- [ ] iPad screenshots only when iPad is supported.
- [ ] Android phone screenshots.
- [ ] Google Play feature graphic.
- [ ] Optional preview video showing a truthful successful workflow and fallback state.

### Copy

- [ ] Product title, subtitle/short description and long description.
- [ ] Keywords/categories.
- [ ] Support URL and privacy-policy URL.
- [ ] Release notes.
- [ ] Reviewer notes explaining public-link resolver, local models, optional model downloads and no-account design.

## 10. Beta and staged rollout

- [ ] Internal developer test.
- [ ] TestFlight/internal Play test.
- [ ] Closed test with real users and multiple phones.
- [ ] Crash-free and completion-rate review.
- [ ] Store review submission.
- [ ] Google Play staged rollout rather than immediate 100% release.
- [ ] Monitor resolver health, model downloads, memory failures and false transcripts.
- [ ] Pause rollout when a release increases crash/reload or low-confidence-output rates.

## 11. Release automation secrets

Do not commit these values:

- Apple signing certificates/profiles or App Store Connect API private key.
- Android upload keystore, passwords or Play service-account key.
- Vercel resolver signing secrets.
- Any future model-download signing private key.

Use environment-protected CI secrets, least-privilege service accounts and manual approval for production publishing.

## 12. Final human actions that cannot be automated here

- Pay/enroll in Apple and Google developer programs.
- Accept legal agreements and complete identity/tax/banking forms.
- Own and protect signing identities.
- Review screenshots and listing claims.
- Submit the build and answer reviewer questions.
- Approve production rollout.
