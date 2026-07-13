# Google Play Data Safety Draft

This draft must be reconciled with the final Android App Bundle, dependency inventory and backend log configuration before release.

## Planned version 1.0

### Does the app collect or share user data?

Local-only workflow:

- Selected video/audio: not collected; processed on device.
- OCR frames: not collected; processed on device.
- Transcript and subtitle files: not collected; stored/exported on device.
- Model files: downloaded from an allowlisted model host; contain no user content.
- Account data: none; version 1.0 has no account.
- Advertising ID / device identifiers: not used by the app.
- Precise location, contacts, SMS, call logs, health and financial data: not requested.

Public-link workflow requires final backend verification:

- Public URL submitted by the user may be transmitted to the ReelScribe resolver to deliver the requested feature.
- The hosting platform may process ordinary network metadata such as IP address in security/access logs.
- The app does not send social passwords, cookies, sessions or private tokens.

Do not submit “no data collected” until the final interpretation of ephemeral public-URL processing and host logs is confirmed in Play Console guidance.

## Data-sharing plan

- No sale of user data.
- No advertising or cross-app tracking.
- No third-party analytics in version 1.0.
- Hosting providers may act as service providers for public-link resolution; their role, retention and security must be documented before release.

## Security practices

- Network requests use HTTPS.
- Models are activated only after SHA-256 verification in release builds.
- Local files use app-private storage where possible.
- Temporary media and prepared audio are deleted after completion/cancellation unless the user saves a project.
- The app has no account, so account deletion is not applicable to version 1.0.

## Privacy policy

https://paq6809.github.io/reelscribe/privacy.html

## Required Play Console declarations

- Ads: No.
- App access: No login required.
- Content rating: answer based on utility-app functionality; the app does not provide a public content feed.
- Target audience: general audience; not designed specifically for children.
- Government app: No.
- News app: No.
- Health app: No.
- Financial features: None.
- AI-generated content: the app generates transcripts from user-selected media; descriptions must not claim perfect accuracy.

## Pre-submission checks

1. Scan the final `.aab` for permissions, SDKs and network endpoints.
2. Confirm no advertising ID or analytics dependency is transitively included.
3. Exercise local media, OCR, model download, public links, export and error flows while capturing network traffic.
4. Confirm resolver retention and deletion behavior.
5. Ensure the public privacy policy, Data Safety form and signed app behavior match.
6. Re-run this review whenever accounts, optional cloud ASR, sync, crash analytics, subscriptions or ads are introduced.
