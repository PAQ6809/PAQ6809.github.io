# Atlas Reader Supabase Advisor Hardening Review

Status: **Draft / review only — not applied to production**

## Current read-only evidence

Supabase security advisors currently flag three Atlas trigger functions with mutable `search_path` and flag `public.atlas_search_telegram_posts(text, integer)` because it is `SECURITY DEFINER` and executable by `authenticated`.

Read-only catalog inspection confirmed:

- `atlas_touch_telegram_post_updated_at()`, `atlas_prepare_telegram_post()`, and `atlas_touch_telegram_channel()` are ordinary trigger functions with no fixed `proconfig` search path.
- `atlas_search_telegram_posts(text, integer)` is `SECURITY DEFINER`, already pins `search_path=public, extensions`, explicitly rejects missing `auth.uid()`, limits query length/results, and filters channels/rules by the current `auth.uid()`.
- `authenticated` already has SELECT privileges on the Atlas Telegram tables referenced by the RPC.
- Those tables have owner-scoped RLS policies, so converting the RPC to `SECURITY INVOKER` is a plausible least-privilege replacement, but it must be validated with real authenticated owner/non-owner test identities before production use.

Performance advisors flag per-row `auth.uid()` evaluation in five Atlas Telegram policies. The proposed SQL changes only the expression shape to `(SELECT auth.uid())`; it does not intentionally broaden role or row scope.

## Index evidence

`pg_stat_user_indexes` currently shows real Atlas index activity on several indexes (for example `atlas_resources_source_idx`, Atlas resource/source primary keys, classification keys, and `atlas_telegram_posts_channel_ref_idx`) while many other Atlas indexes remain at `idx_scan=0`.

`pg_stat_database.stats_reset` currently reports `NULL`, so the observation window is not sufficiently bounded for destructive index decisions. Therefore **no index deletion is proposed**. Unused-index advisor entries stay informational until workload/query-plan evidence exists.

## Proposed changes

See `docs/ATLAS_SUPABASE_ADVISOR_HARDENING.sql`.

The proposal is limited to:

1. Pin `search_path` on the three trigger functions.
2. Convert the Atlas search RPC from `SECURITY DEFINER` to `SECURITY INVOKER`.
3. Rewrite the five owner RLS expressions to use `(SELECT auth.uid())`.

It intentionally does not alter Auth configuration, tables/columns, indexes, Edge Functions, Secrets, production data, or non-Atlas objects.

## Required staging acceptance

Before any production migration:

- Capture `pg_get_functiondef`, `proconfig`, `proacl`, and `pg_policies` snapshots for rollback.
- Use at least two authenticated test users with separate Atlas ownership.
- Verify owner CRUD/read behavior is unchanged for channels/rules/sync runs.
- Verify post reads and search RPC never return cross-owner rows.
- Verify anonymous access stays denied.
- Verify the search RPC still rejects unauthenticated calls and too-short queries.
- Re-run Supabase security/performance advisors.
- Compare representative query plans/latency before and after the RLS expression change.
- Stop and roll back on any authorization difference.

## Remediation references

- Function search path: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- Authenticated SECURITY DEFINER: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- RLS init plan: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
