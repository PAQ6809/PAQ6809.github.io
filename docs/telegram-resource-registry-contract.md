# Telegram Resource Registry Contract

Status: draft design contract
Scope: Telegram-discovered technical resources and prior legal resources under continued review

## Purpose

Turn recurring Telegram resource discovery into a local-first, auditable registry instead of a sequence of disconnected daily notes.

The registry is inspired by the low-friction local workspace pattern seen in Tab Harbor: keep state local, make sessions restorable, separate active items from archived items, and avoid requiring a backend or account for core organization.

## Non-goals

This contract does not install, execute, register, authenticate to, or download any Telegram-recommended software. It does not create production dependencies, external accounts, secrets, databases, auth flows, or network services.

## Resource lifecycle

Each discovered item must move through an explicit state machine:

`discovered -> source_verified -> risk_reviewed -> project_matched -> proposed -> integrated | archived | rejected | needs_human_review`

A repeated Telegram post must reuse the existing registry entry rather than create a new evaluation.

## Canonical record

Each resource record must include at least:

- `resource_id`: stable local identifier
- `name`
- `telegram_first_seen`
- `telegram_last_seen`
- `telegram_post_refs`
- `resource_type`: software / repository / website / bot / workflow / service / dataset / model
- `canonical_source`
- `official_repository`
- `publisher_or_owner`
- `license`
- `license_verified_at`
- `platforms`
- `purpose`
- `maintenance_state`
- `security_policy`
- `privacy_notes`
- `network_behavior`
- `credential_requirements`
- `safety_flags`
- `legal_flags`
- `project_matches`
- `integration_status`
- `acceptance_criteria`
- `rollback_plan`
- `last_verified_at`

## Trust rules

Telegram is discovery-only and never a trust anchor.

A resource is not eligible for project integration until its canonical source is verified independently. A GitHub repository must be checked for repository identity, license, maintenance state, security posture, dependency or execution behavior, and relevant release provenance.

The following are always excluded from integration and automation:

- cracked or pirated software and content
- malware or suspicious executables
- doxxing, social-engineering databases, identity lookup, leaked personal data
- smuggling, unapproved medicines, scams
- DRM, licensing, paywall, or authorization bypass
- instructions requiring Defender, UAC, SmartScreen, Play Protect, Gatekeeper, or equivalent protections to be disabled or bypassed
- unverified third-party API relays handling source code, credentials, private prompts, financial data, or research data

## Local-first behavior

Core registry organization must work without an account or backend.

The preferred initial representation is a version-controlled local text or JSON artifact. Remote sync is optional and must not be required for basic operation.

Archive is preferred over destructive deletion so that previously rejected, deprecated, or duplicate resources remain traceable and are not re-evaluated from scratch when reposted.

## Project matching

Every verified legal resource is evaluated against known project families, including:

- Lumen market analysis
- Atlas Reader and AI document/media reading
- AI/Coding Agent governance and anti-drift workflows
- research and learning platforms
- Raspberry Pi / Edge AI
- BCI / photoacoustic research
- personal website and productivity workflows

A match record must state why the resource fits, whether the match is architectural-only or implementation-ready, and what permissions or dependencies would be introduced.

## Integration gate

Before any actual modification, define a smallest reversible change and its Acceptance Criteria.

Preferred order:

1. documentation or interface contract
2. isolated branch
3. test artifact or prototype
4. Draft PR or equivalent reversible review surface
5. tests and read-back verification
6. human acceptance before risky merge or deployment

High-risk or irreversible changes remain blocked without explicit approval, including secrets, permissions, database schema/RLS/Auth, production domains, major dependency upgrades, payments, external posting, and legal commitments.

## Acceptance Criteria for this contract

- No runtime dependency is added.
- No external account, secret, database, auth flow, or production endpoint is introduced.
- Existing projects behave identically when this contract is ignored.
- Repeated resources can be recognized as duplicates using the canonical source and stable record ID.
- Every rejected resource keeps a reason and last-verified date.
- Every proposed project integration contains explicit Acceptance Criteria and a rollback plan.
- Telegram recommendations alone can never advance a resource beyond `discovered`.

## Rollback

This contract is documentation-only. Revert the single commit, close the Draft PR, or delete the branch. No production state is affected.
