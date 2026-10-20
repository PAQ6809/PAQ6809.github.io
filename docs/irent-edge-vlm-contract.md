# iRent Edge VLM Secondary-Review Contract

Status: experimental design contract only. No production runtime, model weights, secrets, database, auth, or deployment changes.

## Goal

Use a compact on-device multimodal model (candidate: MiniCPM-V 4.6) only as a **secondary semantic reviewer** behind the deterministic iRent inspection pipeline. It must not replace YOLO/object detection, camera-position validation, geometric calibration, plate checks, blur/distance/angle checks, or deterministic damage-difference logic.

## Pipeline boundary

1. Capture-quality gate
   - required view / vehicle region present
   - blur / exposure / obstruction / dirt checks
   - distance and perspective within configured limits
   - plate/vehicle identity evidence present when required
2. Deterministic geometry
   - landmarks / ROI detection
   - perspective correction into canonical view
   - scale and orientation normalization
3. Damage candidate generation
   - YOLO / segmentation / image-difference candidates
   - preserve bounding boxes, masks, scores, thresholds and source image IDs
4. Edge VLM secondary review (optional)
   - receives only an approved crop or downsampled frame
   - returns structured semantic observations, not a final authoritative damage decision
5. Decision gate
   - deterministic evidence remains primary
   - VLM disagreement or low confidence routes to `needs_review`, never silently overrides primary evidence
6. Artifact trace
   - preserve original image hash/ID, normalized image reference, model/version, prompt/schema version, outputs, thresholds and reviewer result

## Provider interface

An EdgeVLM provider should expose at minimum:

- `health()`
- `capabilities()`
- `reviewFrame(input)`
- `reviewDamageCandidate(input)`

Each response must include:

- `provider`
- `model`
- `model_version`
- `local_only`
- `input_scope`
- `observations[]`
- `confidence` or calibrated score when available
- `limitations[]`
- `latency_ms`
- `status: ok | uncertain | failed`

## Safety and privacy rules

- Local inference is preferred for return-car images.
- No cloud fallback is allowed unless explicitly enabled by a separate user/operator policy.
- Never include API keys or credentials in repository files, prompts or artifacts.
- Vehicle images must not be uploaded to an unknown relay or third-party inference endpoint.
- OCR/plate text, faces and other personal data must be minimized to what the task actually requires.
- Model output must be treated as probabilistic evidence and may hallucinate; it cannot invent missing visual facts.

## Decision rules

The VLM may help classify or explain an already detected region, e.g. `scratch-like`, `dent-like`, `reflection-like`, `dirt-like`, or `uncertain`.

It must **not**:

- declare a new chargeable damage event without primary visual evidence;
- override an invalid capture-quality gate;
- infer a missing vehicle side/plate/image as present;
- fill missing geometry, timestamps or source metadata;
- convert low-confidence evidence into a pass/fail result.

Recommended combined state:

- `pass`: deterministic checks pass and no unresolved material candidate remains;
- `retake`: capture-quality/geometry gate fails;
- `needs_review`: model disagreement, low confidence, ambiguous reflection/dirt/damage, or unsupported scene;
- `fail`: only when deterministic rule thresholds support the failure condition.

## Acceptance criteria for a future prototype

- Existing YOLO/geometry pipeline behavior is unchanged when EdgeVLM is disabled.
- All EdgeVLM calls can run on a local test image without transmitting it off-device in local mode.
- Every VLM result is traceable to model/version, input image/crop and schema version.
- Low-confidence or failed VLM inference fails closed to `needs_review` rather than approving a result.
- A replay test with fixed images produces reproducible deterministic gates even if VLM wording varies.
- The integration can be removed by reverting a single isolated PR.
- Performance, memory and thermal tests are recorded before any mobile/edge production use.

## Candidate note: MiniCPM-V 4.6

MiniCPM-V 4.6 is considered only because its upstream project publishes mobile/edge adaptation paths and a 1.3B-parameter vision-language model. Before implementation, verify the exact model artifact license, device memory/latency on the target hardware, quantization accuracy, OCR/privacy behavior, and whether its edge runtime is compatible with the selected iRent device stack.
