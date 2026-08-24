# Atlas Reader maintenance — 2026-08-25

## Scope

This maintenance branch consolidates all currently actionable Atlas Reader issues without changing production application behavior or database permissions automatically.

## Low-risk fixes in this branch

- Add a 10-second client-side timeout to every production Edge smoke request.
- Record per-probe latency, average latency, maximum latency, and controlled known-hit/known-zero search quality.
- Migrate `actions/checkout` to the pinned Node.js 24-compatible v5.0.0 commit.
- Migrate `actions/upload-artifact` to the pinned Node.js 24-compatible v6.0.0 commit.
- Add a pull-request read-only production-browser job that verifies the current public Vercel entry after branch-local checks pass.
- Keep GitHub Actions permissions at `contents: read` and keep `persist-credentials: false`.

## Production checks

The CI matrix must cover:

1. static JavaScript / required Atlas feature checks;
2. production Supabase Edge health, controlled search quality, legal HTTPS metadata parsing, HTTPS enforcement, private-host/SSRF blocking, Telegram direct-fetch rejection, and browser-origin rejection;
3. branch-local mobile browser startup/search/import/readers;
4. current production GitHub Pages propagation and public Vercel mobile flow.

## Staged Supabase remediation

`supabase-advisor-remediation.proposal.sql` contains a rollback-by-default proposal for the current Atlas database advisor warnings. It is documentation/testing input, not a production migration. Promotion requires owner/non-owner/anonymous/service-role permission regression evidence and an advisor re-check.

Unused Atlas indexes are intentionally retained until workload evidence demonstrates that removal is safe.

## Rollback

Close the PR without merging, or revert the individual commits. No production schema/data/runtime changes are performed by this branch.
