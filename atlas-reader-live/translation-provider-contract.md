# Atlas Reader — Translation Provider Contract

Status: experimental design contract (no runtime integration)

## Goal

Define a minimal, local-first translation and review boundary for Atlas Reader before adding any translation engine or model dependency.

This contract borrows two proven ideas from external open-source projects without copying their code:

- **Wenyi**: evidence-based review loops, shadow revisions, conflict arbitration, traceable review evidence, and explicit loop termination.
- **SoloMD**: local-first data handling, read-only-by-default MCP/tool surfaces, workspace containment, per-run write limits, Git-backed reviewability, and accept/reject gates before writes reach the canonical workspace.

## Non-goals

- No model installation.
- No API-key storage.
- No database/schema changes.
- No automatic overwrite of source documents.
- No cloud relay requirement.
- No translation quality claim without evidence.

## Provider interface

A translation provider SHOULD expose the following logical operations:

1. `detectLanguage(text)`
2. `translate(text, context, options)`
3. `review(source, translation, evidence, options)`
4. `health()`

A provider MUST declare:

- `providerId`
- `mode`: `local` | `direct-cloud`
- `networkRequired`: boolean
- `dataLeavesDevice`: boolean
- `supportsStreaming`: boolean
- `supportsGlossary`: boolean
- `supportsReview`: boolean

## Trust boundary

### Local provider

Preferred when available.

Requirements:

- Bind only to loopback (`127.0.0.1` / `localhost`) if a local service is used.
- No remote telemetry by default.
- No hidden model download after first-run consent.
- File content MUST NOT leave the device.

### Direct-cloud provider

Allowed only as an explicit opt-in.

Requirements:

- Requests go directly to the selected provider; Atlas MUST NOT introduce an unknown relay.
- The UI MUST show that selected text may leave the device.
- Secrets must be stored by an OS/provider-safe mechanism, never committed to the repository.
- Sensitive-document mode MUST be able to disable all cloud providers.

## Review loop

Translation review MUST be evidence-based and bounded.

Suggested state machine:

`draft -> review -> shadow_fix -> re_review -> accepted | rejected | needs_user`

Rules:

- Review never edits the source document.
- Candidate fixes are applied only to a shadow translation.
- Each finding records source span, translated span, rule/category, evidence, and proposed fix.
- Conflicting fixes are arbitrated before acceptance.
- The loop stops on any of:
  - two consecutive clean review rounds;
  - no-progress detection;
  - configured maximum rounds;
  - provider/tool failure.
- A final accept/reject action is required before replacing any saved translation.

## Audit trace

Each run SHOULD produce a compact local trace containing:

- run id
- provider id and mode
- source document id/path hash (not raw private path when avoidable)
- timestamps
- translation chunks processed
- review findings count
- accepted/rejected fixes
- retry count
- stop reason
- token/cost metrics when applicable

The trace MUST NOT contain API keys, cookies, passwords, or unrelated document content.

## Failure behaviour

- Provider timeout -> keep source readable; show translation unavailable.
- Partial translation -> mark incomplete; never present as complete.
- Review failure -> preserve draft translation and expose the failure state.
- Network loss -> local provider continues if possible; cloud provider fails closed.
- Unsupported file/segment -> skip with explicit reason, never fabricate output.

## Acceptance criteria for a future implementation

A runtime implementation is acceptable only when all of the following pass:

- [ ] Existing Atlas Reader open/read flows remain unchanged when translation is disabled.
- [ ] No new secret is committed to Git.
- [ ] Local mode can operate without sending document content off-device.
- [ ] Cloud mode requires an explicit user action and visibly marks the trust boundary.
- [ ] Source text is never overwritten by translation or review.
- [ ] Review edits occur only in a shadow copy until accepted.
- [ ] Review loop has a maximum round limit and no-progress detection.
- [ ] Every provider reports health/failure deterministically.
- [ ] Every incomplete/failed output is clearly labeled.
- [ ] The feature can be removed by reverting a single integration commit/PR.

## Rollback

This document is design-only. Revert or close the associated branch/PR to remove it; production behaviour is unaffected.
