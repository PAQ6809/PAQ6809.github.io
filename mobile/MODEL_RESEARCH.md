# ReelScribe Mobile Model Research

Research date: 2026-07-13

This document records the current model candidates and the product decision. “Latest” does not mean “safe to install by default.” A model enters the application only after its license, weight size, runtime, phone memory, battery, thermal behavior, language quality and fallback behavior are verified.

## Production models already active

| Model | Runtime | Product role |
|---|---|---|
| Whisper Tiny | Transformers.js ONNX | Mobile and long-video fallback |
| Whisper Base | Transformers.js ONNX | Balanced mobile and short-video mode |
| Whisper Small | Transformers.js ONNX | Desktop WebGPU accuracy mode |
| Whisper Large-v3-turbo | Transformers.js ONNX | High-end desktop WebGPU flagship mode |

These models are already routed by the existing web Worker. Mobile does not automatically download Small or Large-v3-turbo.

## Native candidates

### Qwen3-ASR 0.6B INT8 through sherpa-onnx

- Current sherpa-onnx pretrained package dated 2026-03-25.
- Strong candidate for Mandarin, Cantonese, several Chinese dialects and multilingual speech.
- The INT8 package is still close to 1 GB, so it must be an optional Wi-Fi download rather than part of the base app.
- Required before activation: upstream-model license review, iPhone/Android memory tests, 15/30/60-minute thermal tests, Chinese punctuation and timestamp evaluation.

### FunASR Nano INT8

- Current sherpa-onnx package dated 2025-12-30.
- Candidate for Chinese, English, Japanese, dialect and singing/noisy-audio use cases.
- Required before activation: license review, real short-video benchmark and hallucination comparison against Whisper Base.

### Moonshine Base Chinese Quantized

- Current sherpa-onnx package dated 2026-02-27.
- Candidate for low-latency Chinese transcription on constrained phones.
- Required before activation: accuracy comparison on Taiwan Mandarin, background music and colloquial speech.

### SenseVoice INT8

- Current sherpa-onnx package dated 2025-09-09.
- Candidate for compact Chinese, English, Japanese, Korean and Cantonese recognition.
- Required before activation: model-card license review, timestamp support review and local-device benchmark.

### Omnilingual ASR 1600+ Languages 300M INT8

- Current sherpa-onnx package dated 2025-11-12.
- Candidate as an optional long-tail language pack, not the default Taiwan/Chinese model.
- Required before activation: language-selection UX, model-license review and low-resource-language quality testing.

### whisper.cpp quantized models

- Mature native C/C++ implementation with iOS, Android, Core ML and quantized model support.
- Candidate as the first true native offline fallback because it has a clear mobile deployment path and can reuse familiar Whisper behavior.
- Required before activation: choose exact quantization, add Swift/Kotlin bridge or maintained Capacitor plugin, verify timestamps and prevent duplicate simultaneous model loads.

## Runtime candidates

### sherpa-onnx

Pros:

- Offline ASR across Android and iOS.
- Supports multiple current model families.
- A single runtime can power language-specific downloadable packs.

Risks:

- Native package size and ABI complexity.
- Each upstream model can have different license and memory requirements.
- A broad catalog must not become an uncontrolled “download every model” feature.

### whisper.cpp

Pros:

- Mature offline inference and quantization.
- iOS/Android examples and Apple Core ML acceleration path.
- Predictable fallback for the current Whisper-based product.

Risks:

- Native bridge maintenance.
- Large models remain unsuitable for many phones.
- Model files need integrity verification, download recovery and storage cleanup.

## Product routing decision

The mobile application uses a model router rather than installing every model:

1. Existing Tiny/Base browser models remain the stable first release path.
2. Native whisper.cpp is the preferred first native-engine proof of concept.
3. Qwen3-ASR and FunASR Nano enter controlled benchmarks next because they are relevant to Chinese and mixed-language short videos.
4. Moonshine and SenseVoice are evaluated as compact specialist alternatives.
5. Omnilingual is an optional language-expansion pack only.
6. A model is activated only after the test suite contains fixed audio fixtures and device results.

## Required benchmark matrix

For every candidate:

- iPhone: recent high-end device plus an older supported device.
- Android: high-end, mid-range and low-memory device.
- Audio: clean Mandarin, Taiwan Mandarin, Cantonese, English, Japanese, code-switching, street noise, background music, singing and silent sections.
- Duration: 15 seconds, 1 minute, 10 minutes, 30 minutes and 60 minutes.
- Metrics: first-load bytes, warm-load time, real-time factor, peak memory, battery delta, thermal throttling, word/character error, timestamp drift and hallucination rejection.

## Primary sources

- Capacitor: https://capacitorjs.com/docs
- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- sherpa-onnx: https://k2-fsa.github.io/sherpa/onnx/
- Qwen3-ASR sherpa packages: https://k2-fsa.github.io/sherpa/onnx/qwen3-asr/pretrained.html
- FunASR Nano sherpa packages: https://k2-fsa.github.io/sherpa/onnx/funasr-nano/pretrained.html
- Moonshine v2 sherpa packages: https://k2-fsa.github.io/sherpa/onnx/moonshine/models-v2.html
- Omnilingual ASR sherpa packages: https://k2-fsa.github.io/sherpa/onnx/omnilingual-asr/models.html
- SenseVoice sherpa packages: https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html
