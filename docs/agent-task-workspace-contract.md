# Agent Task Workspace Contract

Status: experimental design contract. This document does not grant runtime permissions and does not change production behavior.

## Goal

Define one reusable execution boundary for agentic work across PAQ projects so parallel tasks do not mix context, generated artifacts stay traceable, risky actions stop for approval, and every change remains reviewable and reversible.

## Core model

Each agent task MUST have a dedicated workspace with:

- a stable task ID;
- an isolated session/context scope;
- an explicit target project and allowed paths;
- a declared tool/capability allowlist;
- an artifact directory or equivalent durable output record;
- an append-only execution trace for tool calls and important decisions;
- acceptance criteria defined before any write action;
- a final disposition: accepted, rejected, needs_user, or failed.

Parallel tasks MUST NOT share mutable working state unless the shared resource is explicitly declared and read-only.

## Default permission posture

Read-only is the default.

Any write-capable task MUST declare:

- target repository/project;
- branch or other rollback boundary;
- maximum write scope;
- destructive actions that are forbidden;
- user approval points;
- rollback method.

Secrets, credentials, database schema/RLS/Auth, production domains, paid actions, external publishing, legal commitments, force-pushes, irreversible deletes, and major dependency upgrades are outside the default execution scope.

## Task lifecycle

1. **Plan** — resolve the goal, target project, inputs, risks, tools, and acceptance criteria.
2. **Isolate** — create or select a dedicated session/workspace and, for code changes, a non-production branch when available.
3. **Execute** — perform only allowlisted actions inside the declared scope.
4. **Trace** — retain evidence for tool calls, files changed, outputs produced, and important decisions.
5. **Verify** — re-run relevant tests/checks and compare results against the acceptance criteria.
6. **Critic** — inspect evidence, regressions, provenance, security/privacy boundaries, and incomplete assumptions.
7. **Optimize once** — apply at least one safe improvement when justified, then verify again.
8. **Gate** — mark the task accepted, rejected, needs_user, or failed. Do not treat missing CI/status as a pass.

## Artifact rules

Generated files MUST be attributable to a task and should include enough metadata to answer:

- who/what produced it;
- which inputs and source versions were used;
- which task/session produced it;
- whether it is draft or accepted;
- how it can be reverted or regenerated.

Artifacts from rejected or failed tasks MUST NOT silently replace accepted production artifacts.

## Approval gates

The executor MUST stop before any action that exceeds the declared write scope or introduces a new trust boundary. Examples include:

- enabling broader filesystem or shell access;
- sending private source/document content to a new cloud provider;
- changing authentication or secrets;
- merging to a production branch;
- deleting user data;
- bypassing Defender, UAC, SmartScreen, Play Protect, Gatekeeper, or equivalent safeguards.

## Project-specific minimums

### Lumen

- Canonical financial provenance rules remain authoritative.
- Agent workspace rules cannot override official-source, relay allowlist, snapshot, ETF, or CI contracts.
- Missing verified data must fail closed to an explicit empty state.

### Atlas Reader

- Reader behavior must remain unchanged when experimental agent features are disabled.
- Local-first processing is preferred; cloud processing requires explicit opt-in and disclosure that content leaves the device.
- Source documents are immutable; AI review edits only a shadow/output copy.

### iRent / vision prototypes

- Preserve original images and model outputs as evidence.
- Any geometry correction, damage comparison, or AI classification must record thresholds and confidence/quality gates.
- Human review remains available for uncertain or failed alignment cases.

### Research / learning workflows

- Generated explanations, translations, diagrams, and quizzes must preserve source references when available.
- AI-generated facts, formulas, citations, and OCR text require verification before being marked accepted.

## Acceptance criteria for this contract

This contract is considered safely integrated when:

- it is documentation-only;
- it introduces no runtime dependency, secret, permission, database, auth, domain, or production behavior change;
- it can be reverted by closing/reverting a single branch/PR;
- future agent changes can cite this contract for task isolation, approval, evidence, verification, and rollback requirements.

## Inspiration and boundary

This contract adopts the useful architectural ideas of task-isolated sessions, durable local artifacts, visible tool activity, and approval stops seen in ClawWork, while remaining implementation-independent. No ClawWork runtime, OpenClaw gateway, credentials, or dependency is introduced by this document.
