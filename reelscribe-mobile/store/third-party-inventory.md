# Third-Party Component Inventory

Review this list against the generated lockfile, CocoaPods lockfile and Gradle dependency graph before each release.

| Component | Planned version | Purpose | License | Network/data behavior |
|---|---:|---|---|---|
| React Native | 0.86.0 | iOS/Android application framework | MIT | No app data collection by itself; review bundled platform dependencies. |
| React | 19.2.3 | UI runtime | MIT | No app data collection by itself. |
| React Native Community CLI | 20.2.0 | Local build tooling | MIT | Development only; do not expose Metro outside trusted network. |
| whisper.rn | 0.6.0 | React Native binding for whisper.cpp | MIT | Local inference; model path must be local. |
| whisper.cpp | 1.9.1 through binding | Native Whisper inference | MIT | Local inference. |
| react-native-fs | 2.20.0 | App-private model and temporary file management | MIT | Performs only URLs explicitly supplied by ReelScribe allowlist logic. |
| @react-native-documents/picker | 12.0.1 | System media/file picker | MIT | User-selected local files only. |
| react-native-safe-area-context | 5.8.0 | Safe-area layout | MIT | No network behavior. |
| Async Storage | 3.1.1 | Preferences/project metadata | MIT | Local storage only. |
| Apple Vision | OS framework | On-device OCR on iOS | Apple platform terms | Local processing. |
| Google ML Kit Text Recognition | Pin before Android build | On-device OCR on Android | Google terms / model terms | Determine bundled/downloaded model behavior and disclose accurately. |
| sherpa-onnx | Not approved | Candidate SenseVoice/VAD runtime | Apache-2.0 | Disabled until version, model license, SHA and device tests pass. |
| Qwen3-ASR | Not included | Optional self-hosted server candidate | Apache-2.0 | Disabled in first release; would require explicit upload consent and server privacy policy. |

## Release checks

- Generate npm lockfile and run vulnerability audit.
- Review all CocoaPods and Gradle transitive dependencies.
- Generate an SBOM.
- Confirm each license permits commercial App Store and Google Play distribution.
- Include required notices and attribution.
- Remove unused SDKs and permissions.
- Verify no SDK adds analytics, advertising, device identifiers or background network activity.
- Keep multilingual Moonshine community-license models excluded from the commercial build.
