# ReelScribe Model Research — 2026-07-13

## Decision

ReelScribe will not install every newly released model into every phone. That would increase application size, memory pressure, battery use, supply-chain exposure and store-review risk. Models are separated into production mobile, optional mobile, server-only, research and excluded tiers.

## Production mobile core

### whisper.cpp 1.9.1

- Primary native multilingual ASR engine for iOS and Android.
- Supports Apple and Android targets and quantized Whisper models.
- Shipping policy: one engine and one active model at a time.
- Default models: Tiny and Base.
- Optional models after device tests: Small and Large-v3-turbo.

Upstream:
- https://github.com/ggml-org/whisper.cpp

### Native OCR

- iOS: Apple Vision text recognition.
- Android: Google ML Kit Text Recognition v2.
- OCR only reads frames explicitly selected from the local video.
- No frame or recognized text is uploaded in local mode.

## Production candidates

### SenseVoice Small through sherpa-onnx

Strengths:
- Fast non-autoregressive recognition.
- Chinese, Cantonese, English, Japanese and Korean path.
- Audio-event and emotion metadata may help reject music/no-speech regions.
- sherpa-onnx supports Swift, Kotlin, Java and mobile platforms.

Release gates:
- Pin sherpa-onnx release and model files.
- Confirm model license permits store distribution.
- Lock SHA-256 for every model artifact.
- Compare CER/WER, memory, thermals and battery against Whisper Base on target devices.

Upstream:
- https://github.com/FunAudioLLM/SenseVoice
- https://github.com/k2-fsa/sherpa-onnx

## Optional self-hosted server models

### Qwen3-ASR 0.6B / 1.7B

- Apache-2.0.
- 52 languages and dialects.
- Includes speech, singing voice and songs with background music.
- Official runtime is Python/Transformers/vLLM and GPU-oriented.
- Not treated as a mobile on-device model.
- May become an explicit opt-in self-hosted mode after privacy, cost, rate-limit and deletion-policy review.

Upstream:
- https://github.com/QwenLM/Qwen3-ASR
- https://huggingface.co/Qwen/Qwen3-ASR-0.6B

### Distil-Whisper Large v3.5

- English-only candidate for an optional high-throughput server.
- Not selected as the multilingual mobile default.

### NVIDIA Parakeet TDT 0.6B v3

- Candidate for high-throughput server transcription in supported European languages.
- Not appropriate for Chinese/Japanese/Korean mobile defaults.

## Excluded from commercial mobile build

### Moonshine multilingual models

The non-English model terms use a non-commercial community license. They are not included in the commercial store build. English MIT variants may be reviewed separately for live English dictation.

## Research watchlist

### NPUsper

A July 2026 research system proposes Whisper optimization for mobile NPUs with reduced redundant computation. It remains a research watch item until the implementation, device coverage, licensing, reproducibility and store-grade stability are verified.

### Qwen3 Forced Aligner

Potential server-side timestamp refinement candidate. It is not loaded on mobile because it adds another 0.6B model and increases memory and download cost.

## Required evaluation matrix

Every model promoted to a higher tier must be tested on:

- iPhone with 4 GB-class memory.
- Current high-end iPhone.
- Mid-range Android with 4–6 GB RAM.
- Current flagship Android.
- Wi-Fi, constrained network and offline-after-install.
- 30-second, 15-minute, 60-minute and 3-hour media.
- Mandarin, Taiwanese-accented Mandarin, English, Japanese and Korean.
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

No model is enabled for store release solely because its upstream benchmark is strong.
