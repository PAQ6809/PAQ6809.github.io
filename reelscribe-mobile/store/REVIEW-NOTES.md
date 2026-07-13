# Store Review Notes Draft

## Core behavior

ReelScribe is an offline-first transcription utility. No account is required. Reviewers may choose a local sample video or audio file through the operating-system document picker.

The selected Whisper model is downloaded only after a user action, stored in app-private storage and checked before use. Public YouTube captions use public caption data. Public Instagram processing is best-effort and does not use account cookies, passwords or private tokens. Private, restricted, paid or DRM content is unsupported.

## Review path

1. Open the app.
2. Select a local video or audio file.
3. Choose Whisper Tiny for the smallest first-run download.
4. Choose the spoken language or automatic detection.
5. Start local transcription.
6. Edit the transcript and review timestamped segments.
7. Export TXT, SRT or VTT when export is enabled in the release candidate.

## Network behavior

Local transcription works offline after the selected model is installed. Network access is used for explicit model downloads and public-link resolution. Local media, decoded audio, video frames and transcripts are not intentionally uploaded in local mode.

## Limitations disclosed to users

- Public-link availability depends on each platform.
- Recognition can contain errors and should be reviewed.
- The app does not bypass logins, private accounts, paid access, regional controls or DRM.
- Optional OCR remains disabled until physical-device false-positive tests pass.

## Release-only fields

Before submission, replace this section with:

- reviewer contact name and telephone;
- exact sample media instructions;
- final privacy-policy and support URLs;
- final model version and hash;
- any non-obvious permission explanation.
