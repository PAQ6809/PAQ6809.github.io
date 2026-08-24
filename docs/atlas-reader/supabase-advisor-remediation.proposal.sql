-- Atlas Reader / Telegram Supabase advisor remediation proposal
-- Generated 2026-08-25.
--
-- IMPORTANT: This file is intentionally NOT an auto-applied migration.
-- It contains schema/RLS/security changes and must only be promoted after
-- authenticated-owner, non-owner, anonymous, and service-role regression tests.
-- Run against a disposable/dev branch first and re-run Supabase advisors.

begin;

-- 1) Fix mutable search_path warnings without changing trigger bodies.
alter function public.atlas_touch_telegram_post_updated_at()
  set search_path = pg_catalog, public;

alter function public.atlas_prepare_telegram_post()
  set search_path = pg_catalog, public;

alter function public.atlas_touch_telegram_channel()
  set search_path = pg_catalog, public;

-- 2) Remove unnecessary elevated execution from the authenticated search RPC.
-- Current function already derives ownership from auth.uid() and the underlying
-- Atlas Telegram tables have owner-scoped RLS policies. SECURITY INVOKER makes
-- those RLS rules authoritative instead of executing with function-owner rights.
alter function public.atlas_search_telegram_posts(text, integer)
  security invoker;

-- Preserve the existing caller surface explicitly.
revoke execute on function public.atlas_search_telegram_posts(text, integer) from public, anon;
grant execute on function public.atlas_search_telegram_posts(text, integer) to authenticated, service_role;

-- 3) Avoid per-row auth.uid() re-evaluation while preserving policy semantics.
alter policy "atlas telegram channel owner all"
  on public.atlas_telegram_channels
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy "atlas telegram rule owner all"
  on public.atlas_telegram_classification_rules
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy "atlas telegram owner read"
  on public.atlas_telegram_posts
  using (
    exists (
      select 1
      from public.atlas_telegram_channels c
      where c.id = atlas_telegram_posts.channel_ref
        and c.owner_id = (select auth.uid())
    )
  );

alter policy "atlas telegram sync owner read"
  on public.atlas_telegram_sync_runs
  using (
    exists (
      select 1
      from public.atlas_telegram_channels c
      where c.id = atlas_telegram_sync_runs.channel_id
        and c.owner_id = (select auth.uid())
    )
  );

alter policy "atlas telegram sync owner insert"
  on public.atlas_telegram_sync_runs
  with check (
    exists (
      select 1
      from public.atlas_telegram_channels c
      where c.id = atlas_telegram_sync_runs.channel_id
        and c.owner_id = (select auth.uid())
    )
  );

-- Mandatory validation before promotion:
--   A. authenticated owner can read own channels/posts/rules/sync runs.
--   B. authenticated non-owner cannot read or mutate another owner's rows.
--   C. anon cannot execute atlas_search_telegram_posts or access owner data.
--   D. authenticated search RPC returns only caller-owned allowed posts.
--   E. service_role operational path remains functional if it is still required.
--   F. trigger behavior (updated_at/searchable_text/media sanitization) is unchanged.
--   G. Supabase security advisor no longer reports the 3 mutable search_path lints
--      or the authenticated SECURITY DEFINER executable lint.
--   H. Supabase performance advisor no longer reports the 5 Atlas Telegram
--      auth_rls_initplan lints.
--
-- Do not remove any advisor-reported unused index based solely on idx_scan=0.

-- Safety default: running this proposal as-is changes nothing.
rollback;
