# Apple App Privacy Draft

This worksheet is for App Store Connect. Final answers must match the exact signed build and backend retention.

## Planned first release

- No account.
- No advertising.
- No cross-app tracking.
- No analytics SDK approved.
- Local speech recognition and OCR are performed on device.
- Optional server ASR is disabled.

## Data linked to the user

Planned answer: none, because the first release has no account and local projects are not uploaded.

Reconfirm before submission:

- no hidden analytics or crash-reporting identifier;
- no persistent resolver identifier;
- no advertising identifier;
- no account or cloud synchronization SDK.

## Data not linked to the user

Potential resolver/network data:

- public video URL submitted by the user;
- requested language;
- IP address or standard request metadata in hosting-provider logs.

The final declaration depends on whether these logs are retained, used for security, or discarded. Verify the hosting configuration and retention before selecting App Store Connect categories.

## User content

Local video, audio, OCR frames and transcripts:

- processed on device;
- not collected by ReelScribe in local mode;
- user may export through the system share sheet.

Public Instagram/YouTube URL:

- transmitted only to provide the requested public-link function;
- no social password, cookie, session or private token.

## Diagnostics

No diagnostics SDK is approved for the first release. Native OS crash reports or TestFlight diagnostics must be handled according to Apple's platform behavior and disclosure requirements.

## Tracking

- App Tracking Transparency prompt: not required for the planned first release because no tracking is performed.
- IDFA: not accessed.
- Data broker or advertising network: none.

## Privacy manifest review

Before archive upload:

1. Generate the privacy report for all third-party SDKs.
2. Verify required-reason APIs used by React Native, filesystem, document picker and model runtime.
3. Add accurate `PrivacyInfo.xcprivacy` entries.
4. Confirm no SDK sends data unexpectedly.
5. Update `PRIVACY.md` and the public privacy URL if runtime behavior changes.
