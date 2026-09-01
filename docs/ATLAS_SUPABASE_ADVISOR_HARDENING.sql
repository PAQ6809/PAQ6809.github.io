-- Atlas Reader Supabase advisor hardening proposal
-- STATUS: REVIEW-ONLY. Do not run directly against production.
-- Target project: goedzzhhvvnfczgnkqlv
-- Scope: Atlas Telegram functions and RLS policies only.
-- Intentionally excludes index drops, Auth settings, unrelated schemas, and production data changes.

-- 1) Pin search_path for trigger functions flagged by function_search_path_mutable.
ALTER FUNCTION public.atlas_touch_telegram_post_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.atlas_prepare_telegram_post()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.atlas_touch_telegram_channel()
  SET search_path = pg_catalog, public;

-- 2) Remove elevated SECURITY DEFINER execution from the authenticated search RPC.
-- Read-only inspection confirmed authenticated already has SELECT privileges and the
-- referenced Atlas Telegram tables are protected by owner RLS policies.
-- The function retains its existing SET search_path = public, extensions.
ALTER FUNCTION public.atlas_search_telegram_posts(text, integer)
  SECURITY INVOKER;

-- 3) Avoid per-row auth.uid() re-evaluation while preserving existing policy semantics.
ALTER POLICY "atlas telegram channel owner all"
  ON public.atlas_telegram_channels
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

ALTER POLICY "atlas telegram rule owner all"
  ON public.atlas_telegram_classification_rules
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

ALTER POLICY "atlas telegram owner read"
  ON public.atlas_telegram_posts
  USING (
    EXISTS (
      SELECT 1
      FROM public.atlas_telegram_channels AS c
      WHERE c.id = atlas_telegram_posts.channel_ref
        AND c.owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "atlas telegram sync owner insert"
  ON public.atlas_telegram_sync_runs
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.atlas_telegram_channels AS c
      WHERE c.id = atlas_telegram_sync_runs.channel_id
        AND c.owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "atlas telegram sync owner read"
  ON public.atlas_telegram_sync_runs
  USING (
    EXISTS (
      SELECT 1
      FROM public.atlas_telegram_channels AS c
      WHERE c.id = atlas_telegram_sync_runs.channel_id
        AND c.owner_id = (SELECT auth.uid())
    )
  );

-- Post-change verification queries (read-only).
SELECT
  n.nspname AS schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'atlas_touch_telegram_post_updated_at',
    'atlas_prepare_telegram_post',
    'atlas_touch_telegram_channel',
    'atlas_search_telegram_posts'
  )
ORDER BY p.proname;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'atlas_telegram_posts',
    'atlas_telegram_channels',
    'atlas_telegram_classification_rules',
    'atlas_telegram_sync_runs'
  )
ORDER BY tablename, policyname;

-- Required behavioral acceptance before production application:
-- A. anonymous requests cannot obtain Atlas Telegram rows or execute the search RPC.
-- B. authenticated owner can read own channels/rules/posts/sync runs.
-- C. authenticated non-owner cannot read another user's rows.
-- D. atlas_search_telegram_posts rejects null auth and queries shorter than 2 chars.
-- E. search RPC returns only rows belonging to the current auth.uid().
-- F. Supabase advisors no longer report the three mutable search_path warnings,
--    the Atlas authenticated SECURITY DEFINER warning, or the five Atlas auth_rls_initplan warnings.
-- G. No Atlas index is dropped solely because pg_stat_user_indexes currently reports idx_scan=0.

-- Rollback guidance (review and adapt to the pre-change snapshot before use):
-- ALTER FUNCTION public.atlas_search_telegram_posts(text, integer) SECURITY DEFINER;
-- Restore the five policy expressions from the captured pre-change pg_policies snapshot.
-- RESET search_path on the three trigger functions only if reverting to the previous state is explicitly required.
