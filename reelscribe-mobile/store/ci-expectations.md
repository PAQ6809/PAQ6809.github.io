# Mobile Readiness CI Expectations

The validation workflow must fail when any of these occur:

- TypeScript application layer does not compile.
- Model catalog JSON is invalid or misses required tiers.
- A production release model lacks SHA-256 when `RELEASE_BUILD=1` is set.
- A non-commercial multilingual model is enabled for commercial distribution.
- Qwen3-ASR is presented as an on-device phone model.
- Privacy, terms, reviewer notes or store metadata are missing.
- Public resolver client sends credentials or permits insecure URLs.
- Third-party Actions are not pinned to full commit SHAs.
- Workflow permissions exceed read-only content access.
- `.do-not-ship` is absent before native/device/signing gates are complete.

The normal development workflow may pass while release hashes remain intentionally unset. Store submission remains blocked by `.do-not-ship` and the separate release audit.
