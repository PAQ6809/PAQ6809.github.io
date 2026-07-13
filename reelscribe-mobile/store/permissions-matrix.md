# Minimum Permission Matrix

## iOS

| Capability / key | First release | Purpose |
|---|---:|---|
| System document/photo picker | Yes | User selects one media item without broad library access. |
| Microphone usage description | No by default | Add only when live recording ships. |
| Notifications | No by default | Add only when background-completion notifications ship. |
| Background processing | Candidate | Only for user-started model download or checkpointed work after physical-device validation. |
| Extended Virtual Addressing | Candidate | Consider only for large models after review; Tiny/Base should not require it. |
| App Tracking Transparency | No | No tracking or IDFA in the planned first release. |

## Android

| Permission / capability | First release | Purpose |
|---|---:|---|
| INTERNET | Yes | Public links and explicit model downloads. |
| System Photo Picker / ACTION_OPEN_DOCUMENT | Yes | User selects media without broad storage permission. |
| READ_MEDIA_VIDEO / READ_MEDIA_AUDIO | Avoid | Request only if a picker-only design is insufficient and after review. |
| RECORD_AUDIO | No by default | Add only when live recording ships. |
| POST_NOTIFICATIONS | No by default | Add only for a visible user-started long-job notification. |
| FOREGROUND_SERVICE / mediaProcessing type | Candidate | Only for long user-started transcription when Android policy requires it. |
| Advertising ID | No | No ads or cross-app tracking. |

## Rules

- Never request a permission on first launch unless the first screen cannot function without it.
- Ask immediately before the user starts the related feature.
- Explain the purpose in plain language.
- A denial must keep link captions and other unrelated functions usable.
- Remove unused permissions from the merged release manifest.
