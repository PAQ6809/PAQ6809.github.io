# ReelScribe Mobile Privacy Specification

Effective draft date: 2026-07-13

## Local mode

ReelScribe is designed to process media on the user's device.

In local mode the app does not collect, sell or transmit:

- selected video or audio files;
- decoded audio samples;
- video frames or OCR crops;
- transcripts or subtitle files;
- social-account passwords, cookies, sessions or private tokens;
- contacts, precise location, advertising identifiers or browsing history.

Models are downloaded from an allowlisted HTTPS source only after the user selects or approves a model. Model downloads contain no user media.

## Public-link mode

When a user submits a public YouTube or Instagram URL, the resolver receives only:

- the public URL;
- optional requested language;
- ordinary network information required to deliver the request, such as IP address in hosting logs.

The resolver is configured for public content only, uses no social login cookie and does not intentionally retain user media or captions. Short-lived Instagram proxy URLs expire and temporary local media is deleted after processing.

## Optional server mode

Qwen3-ASR or other self-hosted server models are disabled by default. Before any cloud/server transcription feature is released, the app must show a separate consent screen describing:

- what media is uploaded;
- server operator and region;
- retention and deletion timing;
- encryption in transit and at rest;
- whether a processor/subprocessor is involved;
- how the user deletes the job.

The current store release plan does not enable this mode.

## Permissions

Use platform pickers instead of broad library access whenever possible.

Potential permissions:

- microphone: only for user-started recording/live transcription;
- photo/video selection: through limited system picker;
- notifications: only for completion of a user-started long job;
- network: public links and model downloads.

The app does not require contacts, SMS, call logs, precise location, Bluetooth or advertising tracking permissions.

## Local storage

The app may store:

- explicitly downloaded model files;
- model integrity metadata;
- transcription checkpoints;
- user-created transcripts and subtitle exports;
- preferences such as selected language and model.

Users can delete models, projects, checkpoints and exports from the app. Temporary media and checkpoints are removed after completion unless the user saves a project.

## Third-party components

Before release, all SDKs must be listed with version, purpose, license and data behavior. Current planned local components include React Native, whisper.cpp, optional sherpa-onnx, Apple Vision and Google ML Kit Text Recognition.

No advertising, cross-app tracking or analytics SDK is approved for the first release.

## Security

- Model artifacts are verified by SHA-256 before execution.
- App-private storage is used for temporary files and models.
- TLS validation is not disabled.
- Public-link requests do not include social cookies or private credentials.
- Security issues follow the repository's `SECURITY.md` process.

## Contact

Support and privacy contact draft:

```text
pinranchen6809@gmail.com
```

Replace or confirm this address before store submission.
