# ReelScribe Model Research — 2026-07-13

## Decision

ReelScribe will not install every newly released model into every phone. That would increase application size, memory pressure, battery use, supply-chain exposure, license risk and store-review failure. The product uses a curated registry with production mobile, optional mobile, server-only, research and excluded tiers.

The first store build uses one cross-platform native engine: `whisper.rn` backed by whisper.cpp. New engines are promoted only when they materially improve measured quality or latency on supported physical devices.

## Production mobile core

### whisper.cpp 1.9.1 through whisper.rn 0.6.0

- Primary native multilingual ASR engine for iOS and Android.
- React Native binding is already installed in `package.json`.
- Default models: Tiny and Base.
- Optional models after device tests: Small and Large-v3-turbo.
- One engine and one active model at a time.
- Model downloads require explicit consent, allowlisted HTTPS, exact size and SHA-256 before a release build accepts them.

Upstream:
- https://github.com/ggml-org/whisper.cpp
- https://github.com/mybigday/whisper.rn

### Native OCR

- iOS: Apple Vision text recognition.
- Android: Google ML Kit Text Recognition v2.
- OCR reads only local frames selected by the app.
- No frame or recognized text is uploaded in local mode.

## Platform-specific candidates

### WhisperKit / Argmax OSS for iOS

- MIT-licensed Apple Silicon/Core ML stack.
- Current open-source line reached 1.0.0 in 2026.
- Upstream recommends a compressed Large v3 model for maximum multilingual accuracy on supported Apple devices.
- Not shipped beside whisper.cpp in version 1.0 because two full ASR runtimes increase binary size, model duplication and regression surface.
- Promotion gate: demonstrate a material accuracy/latency advantage on supported iPhones without increasing crash rate or model-management complexity.

Upstream:
- https://github.com/argmaxinc/argmax-oss-swift

### Apple SpeechAnalyzer

- System-framework candidate for supported iOS versions.
- Must be availability-gated and remain an optional local fallback.
- The first release cannot depend on it because older supported devices and OS versions need the same core workflow.

Upstream:
- https://developer.apple.com/documentation/speech/speechanalyzer

## Production candidates

### SenseVoice Small through sherpa-onnx or the 2026 GGUF runtime

Strengths:
- Fast non-autoregressive recognition.
- Chinese, Cantonese, English, Japanese and Korean path.
- Audio-event and emotion metadata may help reject music/no-speech regions.
- 2026 edge/GGUF work adds a self-contained CPU path with built-in VAD.

Release gates:
- Pin sherpa-onnx or the selected native runtime release.
- Confirm the exact model license permits App Store and Google Play redistribution.
- Lock URL, byte size and SHA-256 for every artifact.
- Compare CER/WER, memory, thermals and battery against Whisper Base.
- Verify timestamps, long-media chunking and cancellation on both platforms.

Upstream:
- https://github.com/FunAudioLLM/SenseVoice
- https://github.com/k2-fsa/sherpa-onnx

### Moonshine English models

- The framework supports iOS and Android and is designed for low-latency on-device speech.
- English models are MIT-licensed and may be evaluated for live English transcription.
- Non-English models use the Moonshine Community License and remain excluded from the planned commercial store build.
- A second mobile ASR runtime is not added until it passes binary-size, stability and accuracy comparisons.

Upstream:
- https://github.com/moonshine-ai/moonshine

## Optional self-hosted server models

These models are not silently used and are not described as on-device. A future server mode requires explicit consent, a self-hosted endpoint, retention/deletion controls and updated store privacy declarations.

### Qwen3-ASR 0.6B / 1.7B

- Apache-2.0.
- 52 languages and dialects.
- Supports speech, singing voice and songs with background music.
- 0.6B targets the accuracy/efficiency trade-off; 1.7B targets higher quality.
- Official runtime is Python/Transformers/vLLM and GPU-oriented.
- Not treated as a mobile model.

Upstream:
- https://github.com/QwenLM/Qwen3-ASR
- https://huggingface.co/Qwen/Qwen3-ASR-0.6B

### NVIDIA Nemotron 3.5 ASR Streaming 0.6B

- 2026 multilingual streaming server candidate.
- Supports 40 languages according to NVIDIA's current Speech repository announcement.
- Requires NVIDIA/PyTorch deployment and model-card license review.
- Not bundled into a phone application.

### NVIDIA Parakeet Unified EN 0.6B

- English offline/streaming server candidate with punctuation and capitalization.
- Not a Chinese/Japanese/Korean mobile default.

### NVIDIA Parakeet TDT 0.6B v3

- Candidate for high-throughput server transcription in supported European languages.
- Not appropriate for the primary Traditional-Chinese product path.

Upstream:
- https://github.com/NVIDIA-NeMo/Speech

### Distil-Whisper Large v3.5

- English-only candidate for optional high-throughput server use.
- Not selected as a multilingual mobile default.

## Excluded from commercial mobile build

### Moonshine multilingual models

The non-English model terms use a non-commercial community license. They are not included in a commercial App Store or Google Play build. Only English MIT variants may be evaluated separately.

### Unverified community conversions

Random ONNX, Core ML, GGUF or mobile model conversions are not accepted merely because they are smaller. Every release artifact needs a known upstream, license, exact size, SHA-256, reproducible conversion information and physical-device tests.

## Research watchlist

### NPUsper

A July 2026 research system proposes Whisper optimization for mobile NPUs with reduced redundant computation. It remains a research watch item until implementation, device coverage, licensing, reproducibility and store-grade stability are verified.

### Qwen3 Forced Aligner

Potential server-side timestamp-refinement candidate. It is not loaded on mobile because it adds another 0.6B model and increases memory and download cost.

## Required evaluation matrix

Every model promoted to a higher tier must be tested on:

- iPhone with 4 GB-class memory.
- Current high-end iPhone.
- Mid-range Android with 4–6 GB RAM.
- Current flagship Android.
- Wi-Fi, constrained network and offline-after-install.
- 30-second, 15-minute, 60-minute and 3-hour media.
- Mandarin, Taiwanese-accented Mandarin, Cantonese, English, Japanese and Korean.
- Clean speech, street noise, background music, multiple speakers and burned-in subtitles.

Measurements:

- Character/word error rate.
- Hallucination and repeated-token rate.
- Time to first transcript.
- Real-time factor.
- Peak resident memory.
- Model download size and first-run time.
- Battery and thermal state.
- Resume after interruption.
- Timestamp drift.
- App binary-size impact and model-cache eviction behavior.

No model is enabled for store release solely because its upstream benchmark is strong or because it is newer.