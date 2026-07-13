# Google Play Data Safety Draft

This document is a submission worksheet, not a final declaration. The final answers must match the exact release binary, resolver logs and SDK inventory.

## Planned first release

- Account: none.
- Advertising: none.
- Analytics SDK: none approved.
- Local media processing: on device.
- Optional server ASR: disabled.
- Public-link resolver: public URL and requested language only.

## Data categories

### Photos and videos

Local mode:
- Collected: no.
- Shared: no.
- Processing: on-device, user-initiated.

Public Instagram mode:
- The public URL is sent to the resolver.
- Temporary public media may be streamed to the device for the requested task.
- Confirm backend access-log and temporary-object retention before final submission.

### Audio files and voice recordings

Local file transcription:
- Collected: no.
- Shared: no.
- Processing: on-device.

Microphone/live transcription:
- Not approved for the first release unless the feature and permission flow are completed and reviewed.

### App activity

- No advertising or cross-app tracking.
- No analytics SDK approved.
- App preferences, model state, checkpoints and transcripts stay in app-private local storage.

### Device or other identifiers

- Advertising ID: not accessed.
- Device serial/IMEI: not accessed.
- Installation identifier: not intentionally created for tracking.
- Ordinary network logs may contain IP address at the hosting provider; document retention before final declaration.

### User-generated content

- Transcripts are generated and stored locally.
- Not uploaded or shared by the app unless a future explicit export/share action is used.

## Security practices

- HTTPS for public-link and model requests.
- Model artifacts require SHA-256 verification in release builds.
- Temporary media uses app-private storage and is deleted after processing.
- No social password, cookie, session or private token.
- No login bypass, private-account scraping or DRM circumvention.

## Final submission verification

Before answering the Play Console questionnaire:

1. Inventory all release dependencies and transitive SDKs.
2. Inspect Android manifest permissions after merge.
3. Confirm resolver/Vercel logging and retention.
4. Confirm crash-reporting or diagnostics are absent or disclosed.
5. Verify privacy policy wording matches runtime behavior.
6. Run a packet capture in local mode and confirm no media or transcript leaves the device.
