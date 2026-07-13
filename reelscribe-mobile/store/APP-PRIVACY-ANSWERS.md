# App Store App Privacy Draft

This is a release-working document, not a substitute for inspecting the final signed binary and every SDK before submission.

## Planned version 1.0 answer

### Data used to track the user

- None.

The first release must not include an advertising identifier, cross-app tracking SDK, third-party advertising, data broker integration, or fingerprinting.

### Data linked to the user

- None in local mode.

The first release has no account. Local video, audio, OCR frames, transcripts, model files, preferences, checkpoints and exports remain in app-controlled device storage and are not transmitted by local processing.

### Data not linked to the user

Potential public-link resolver disclosure requires final confirmation from Vercel and the deployed backend configuration:

- User Content / Other User Content: the public URL submitted for caption resolution.
- Diagnostics or Other Data: ordinary server request metadata such as IP address may appear in hosting security/access logs.

Purpose:

- App Functionality.
- Security/Fraud Prevention only where the hosting platform automatically provides it.

The app must not claim “no data collected” until the final resolver log retention and the store definition of collection have been reviewed against the signed build.

## On-device processing clarification

Selected local media, decoded audio, OCR crops and generated transcripts processed only on the device are not treated as collected by ReelScribe. They still require secure local handling and truthful permission text.

## Permissions and purpose strings

Potential iOS usage descriptions:

- Microphone: only for user-started recording or live transcription.
- Photos / selected media: prefer PHPicker or document picker; request only when the user chooses media.
- Notifications: only for completion of a user-started long task, and only after a user-facing request.

Do not request contacts, location, Bluetooth, tracking, camera, health, financial or broad media-library permissions unless a future reviewed feature specifically requires them.

## Privacy policy URL

https://paq6809.github.io/reelscribe/privacy.html

## Required pre-submission verification

1. Generate the final dependency and privacy-manifest inventory from the release archive.
2. Inspect network traffic on first launch, model download, public-link resolution, local transcription, OCR, export and crash paths.
3. Confirm no analytics, advertising, tracking or unexpected telemetry SDK entered through a dependency.
4. Confirm resolver logs, retention, deletion and subprocessors.
5. Reconcile the answers with the public privacy policy and review notes.
6. Update this document when optional server ASR, accounts, sync, analytics or monetization are added.
