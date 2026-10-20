# Agent Skill Governance Contract

Status: experimental policy contract. Documentation only; no runtime behavior changes.

## Goal

Define a minimum trust gate before any third-party Agent Skill is installed, enabled, or synced into a PAQ project. Discovery or marketplace popularity is never treated as approval.

## Default policy

- Skills are disabled until reviewed.
- Prefer project-scoped skills over system-wide installation.
- Marketplace or Telegram discovery is only a candidate source.
- Never auto-install from a URL, archive, Git repository, or marketplace result.
- Security scanning is advisory evidence, not a sandbox or proof of safety.
- A skill may not weaken Defender, UAC, SmartScreen, Gatekeeper, Play Protect, browser security, or endpoint controls.

## Required provenance record

Every candidate skill must record:

- canonical project/repository URL;
- immutable commit or release identifier when available;
- license and redistribution constraints;
- maintainer/activity status;
- files and scripts included by the skill;
- requested tools, filesystem paths, network destinations, and credentials;
- whether installation uses copy, clone, symlink, package manager, or executable installer;
- review date and reviewer decision.

If provenance cannot be established, the skill remains rejected or quarantined.

## Risk review

Before enablement, inspect at minimum:

1. `SKILL.md` instructions and any referenced files.
2. Scripts, binaries, installers, shell commands, package hooks, and post-install actions.
3. Network calls, remote endpoints, telemetry, update channels, and download behavior.
4. Secret access, browser/session access, SSH, cloud credentials, API keys, and environment variables.
5. Filesystem scope, especially home-directory, repository, configuration, and destructive write access.
6. Tool permissions such as shell/exec, browser automation, Git write, deployment, messaging, or database mutation.
7. Persistence mechanisms such as startup entries, scheduled tasks, services, extensions, or symlinks.

Any request for unrestricted shell, broad filesystem write, browser cookies/session tokens, hidden telemetry, security-control bypass, credential harvesting, or destructive behavior is high risk and requires rejection or explicit human approval outside automated execution.

## Project isolation

Each approved skill must be mapped to a target project and an allowlist of capabilities.

Recommended structure:

`candidate -> provenance -> static review -> risk score -> project scope -> test workspace -> acceptance gate -> enabled`

A skill approved for one project is not automatically approved globally.

Examples:

- Lumen: read-only analysis helpers may be allowed, but no skill may bypass source-first market-data provenance, alter canonical data sources, fabricate missing values, or write secrets.
- Atlas Reader: local document-processing skills should be preferred; cloud processing must be explicit opt-in and must not silently upload private files.
- iRent / Edge AI: skills may operate on test images and artifacts only unless separately approved; production credentials and customer data are out of scope.
- Research / learning: citation, OCR, formula, translation, and diagram skills must preserve source material and expose uncertainty or verification status.

## Installation and sync rules

- Prefer pinned repository commits or signed/verified releases when available.
- Do not rely on star count, marketplace rank, or scanner score alone.
- Do not enable auto-update for high-privilege skills without re-review.
- Cross-agent synchronization must preserve the same approval state and project scope.
- Symlink-based sharing must not make an unreviewed skill visible to additional agents accidentally.
- Removing a skill must leave a clear audit record instead of erasing its prior approval/rejection history.

## Test workspace

First execution must occur in the narrowest practical environment:

- disposable branch or sandbox;
- non-sensitive test data;
- no production secrets;
- no irreversible external actions;
- bounded file writes and network destinations;
- explicit execution trace and generated artifact list.

## Acceptance Criteria

A skill can be marked `approved` only when all applicable criteria pass:

- canonical source verified;
- license reviewed;
- scripts and executable paths inspected;
- requested permissions documented;
- network behavior documented;
- no security-control bypass instructions;
- no unexplained credential/session access;
- project scope and allowed paths defined;
- test execution produces only expected artifacts;
- rollback/removal method verified;
- high-risk external actions still require human approval.

Possible final states:

- `approved-project-only`
- `approved-read-only`
- `quarantined`
- `rejected`
- `needs-human-review`

## Rollback

Disable the skill, remove its project mapping/symlink or installation, restore the repository/workspace from the pre-test state, revoke any credentials explicitly created for the test, and retain the provenance/review record for future duplicate detection.

## Non-goals

This contract does not authorize installation of Skills Desktop, skills.lc marketplace entries, or any third-party skill. It also does not modify authentication, database schema, production domains, secrets, CI policy, or existing project runtime behavior.
