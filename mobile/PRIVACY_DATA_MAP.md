# ReelScribe Mobile Privacy Data Map

Last reviewed: 2026-07-13

This document is the engineering source for App Store privacy answers, Google Play Data safety answers and the public privacy policy. Store declarations must be reviewed again against the exact release binary and hosting configuration before submission.

## Data-flow summary

| Feature | Data involved | Where processed | Stored by ReelScribe | Notes |
|---|---|---|---|---|
| Local file transcription | User-selected video/audio, decoded PCM, transcript | User device | Transcript may be saved locally; media is not uploaded | Whisper/ONNX models are downloaded from approved model/CDN hosts |
| Screen OCR | Sampled video frames and recognized text | User device | Transcript may be saved locally; frames are not persisted | Canvas frames are released after recognition |
| Speech enhancement/VAD | Decoded audio and speech regions | User device | Not separately stored | No cloud speech API |
| Instagram public-link resolver | Public Instagram URL, resolver request metadata, temporary public media stream | Vercel resolver and user device | ReelScribe backend is designed not to persist media or captions | Hosting/CDN providers may process IP address and operational logs under their own policies |
| YouTube public captions | Public YouTube URL and optional language | Vercel resolver | No video is downloaded; caption response is not intentionally persisted by ReelScribe | Hosting providers may process operational logs |
| Other public-caption providers | Public video ID/URL and caption request | Selected public provider and user device | Successful text may be cached locally | No account cookie or private session is sent |
| Model downloads | Device request metadata | Hugging Face/jsDelivr/approved model host | Browser/app cache on device | Optional large packs require explicit user consent |
| Export/share | Generated TXT/SRT/VTT | User device and chosen share destination | Temporary export file in app cache | User chooses the destination through the OS share sheet |
| Diagnostics | Console/runtime errors | User device unless future opt-in diagnostics are added | No analytics SDK currently included | Do not claim “no data collected” until release traffic/log configuration is reviewed |

## Data not requested

- Social-network passwords.
- Browser cookies or authenticated session exports.
- Private access tokens.
- Contact list.
- Precise location.
- Advertising identifier.
- Health or financial information.
- Cross-app tracking permission.

## Local storage

The application can store:

- the most recent transcript and timed segments;
- downloaded model files and OCR/VAD assets;
- App Shell/native bundle assets;
- short-lived generated export files in the application cache.

The user can clear AI/model caches. App uninstall removes app-private storage according to the operating system. The product must not describe cached models as permanently retained because mobile operating systems may reclaim cache storage.

## Network-security controls

- HTTPS only; Android cleartext traffic disabled.
- Content Security Policy retained for web runtime.
- Public resolvers use no account credentials.
- Short-lived signed Instagram media URLs and CDN allowlists.
- Finite request timeouts and response-size limits.
- No production signing keys, API signing secrets or store credentials in client code or Git.

## Store declaration review gates

Before each submission:

1. Inspect the exact IPA/AAB dependency tree for analytics, crash reporting and advertising SDKs.
2. Review Vercel, GitHub Pages, CDN and model-host logs and retention settings.
3. Confirm whether IP addresses, diagnostics or identifiers fall within current Apple/Google disclosure definitions.
4. Confirm that no new native plugin requests undeclared permissions.
5. Update the public privacy policy, App Privacy responses and Play Data safety form together.
6. Archive the completed declaration with the release tag.

## Planned permissions

Initial release should avoid sensitive runtime permissions. File selection uses the operating-system picker. Microphone recording remains optional and must request microphone permission only when the user invokes that feature. No photo-library-wide access is required when a system picker can be used.
