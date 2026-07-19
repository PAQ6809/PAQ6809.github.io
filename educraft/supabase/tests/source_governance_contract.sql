-- Run after the M5 migration on a disposable local/staging database.
-- This contract is metadata-only and rolls back its own transaction.

begin;

do $contract$
declare
  v_observations oid := 'public.educraft_source_observations'::regclass;
  v_reviews oid := 'public.educraft_source_reviews'::regclass;
  v_impacts oid := 'public.educraft_lesson_source_impacts'::regclass;
  v_reviewers oid := 'educraft_private.educraft_source_reviewers'::regclass;
  v_status_view oid := 'public.educraft_source_review_statuses'::regclass;
  v_can_review oid := 'public.educraft_can_review_sources()'::regprocedure::oid;
  v_review_source oid := 'public.educraft_review_source(text,text,text,text,text,text)'::regprocedure::oid;
  v_ack_impact oid := 'public.educraft_acknowledge_lesson_source_impact(uuid)'::regprocedure::oid;
begin
  assert (
    select bool_and(relation.relrowsecurity and relation.relforcerowsecurity)
    from pg_class as relation
    where relation.oid = any (array[v_observations, v_reviews, v_impacts, v_reviewers])
  ), 'source governance tables must enable and force RLS';

  assert (
    select relation.reloptions @> array['security_invoker=true']::text[]
    from pg_class as relation
    where relation.oid = v_status_view
  ), 'source status view must use security_invoker';

  assert not has_schema_privilege(
    'authenticated',
    'educraft_private',
    'USAGE'
  ), 'authenticated users must not access reviewer membership';

  assert not (
    has_table_privilege('anon', v_observations, 'INSERT')
    or has_table_privilege('anon', v_observations, 'UPDATE')
    or has_table_privilege('anon', v_observations, 'DELETE')
    or has_table_privilege('authenticated', v_observations, 'INSERT')
    or has_table_privilege('authenticated', v_observations, 'UPDATE')
    or has_table_privilege('authenticated', v_observations, 'DELETE')
  ), 'browser roles must not write source observations';

  assert not (
    has_table_privilege('anon', v_reviews, 'INSERT')
    or has_table_privilege('anon', v_reviews, 'UPDATE')
    or has_table_privilege('anon', v_reviews, 'DELETE')
    or has_table_privilege('authenticated', v_reviews, 'INSERT')
    or has_table_privilege('authenticated', v_reviews, 'UPDATE')
    or has_table_privilege('authenticated', v_reviews, 'DELETE')
  ), 'browser roles must not write source reviews directly';

  assert has_table_privilege(
    'authenticated',
    v_impacts,
    'SELECT'
  ), 'authenticated teachers must be able to read impact notices through RLS';

  assert not (
    has_table_privilege('authenticated', v_impacts, 'INSERT')
    or has_table_privilege('authenticated', v_impacts, 'UPDATE')
    or has_table_privilege('authenticated', v_impacts, 'DELETE')
  ), 'teachers must acknowledge impacts through the owner-checking RPC only';

  assert not has_table_privilege(
    'anon',
    v_impacts,
    'SELECT'
  ), 'anonymous users must not read lesson impact notices';

  assert exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'educraft_lesson_source_impacts'
      and policy.cmd = 'SELECT'
      and policy.roles = array['authenticated']::name[]
      and policy.qual ~ 'educraft_lesson_plans'
      and policy.qual ~ 'auth\.uid\(\)'
  ), 'impact SELECT policy must derive ownership from the private lesson plan';

  assert not exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'educraft_lesson_source_impacts'
      and policy.cmd <> 'SELECT'
  ), 'impact notices must have no direct browser write policy';

  assert (
    select column_info.is_generated = 'ALWAYS'
    from information_schema.columns as column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'educraft_source_reviews'
      and column_info.column_name = 'is_reusable'
  ), 'review reuse state must be generated, not supplied by a client';

  assert (
    select pg_get_expr(attribute_default.adbin, attribute_default.adrelid) ~ 'approved_reusable'
      and pg_get_expr(attribute_default.adbin, attribute_default.adrelid) ~ 'cc by 4.0'
    from pg_attribute as attribute
    join pg_attrdef as attribute_default
      on attribute_default.adrelid = attribute.attrelid
      and attribute_default.adnum = attribute.attnum
    where attribute.attrelid = v_reviews
      and attribute.attname = 'is_reusable'
  ), 'reuse must require an allowlisted reusable license, not merely an approval label';

  assert exists (
    select 1
    from pg_constraint as constraint_info
    where constraint_info.conrelid = v_reviews
      and constraint_info.contype = 'c'
      and pg_get_constraintdef(constraint_info.oid) ~ 'approved_reusable'
      and pg_get_constraintdef(constraint_info.oid) ~ 'confirmed_license'
      and pg_get_constraintdef(constraint_info.oid) ~ 'rights_url'
      and pg_get_constraintdef(constraint_info.oid) !~ 'approved_metadata_only'
  ), 'reusable approval must require a confirmed license and rights URL';

  assert exists (
    select 1
    from pg_constraint as constraint_info
    where constraint_info.conrelid = v_reviews
      and constraint_info.contype = 'c'
      and pg_get_constraintdef(constraint_info.oid) ~ 'approved_metadata_only'
      and pg_get_constraintdef(constraint_info.oid) ~ 'approved_reusable'
  ), 'metadata-only and reusable approval must remain distinct states';

  assert (
    select bool_and(procedure.prosecdef)
    from pg_proc as procedure
    where procedure.oid = any (array[v_can_review, v_review_source, v_ack_impact])
  ), 'governance RPCs must be SECURITY DEFINER';

  assert (
    select bool_and(procedure.proconfig @> array['search_path=""']::text[])
    from pg_proc as procedure
    where procedure.oid = any (array[v_can_review, v_review_source, v_ack_impact])
  ), 'governance RPCs must pin an empty search_path';

  assert (
    select bool_and(
      lower(pg_get_functiondef(procedure.oid)) !~ '(raw_user_meta_data|user_metadata)'
    )
    from pg_proc as procedure
    where procedure.oid = any (array[v_can_review, v_review_source])
  ), 'review authorization must not trust user-editable metadata';

  assert pg_get_functiondef(v_can_review) ~ 'educraft_private\.educraft_source_reviewers',
    'review capability must use the service-managed membership table';

  assert pg_get_functiondef(v_review_source) ~ 'educraft_private\.educraft_source_reviewers',
    'source review RPC must independently verify active reviewer membership';

  assert pg_get_functiondef(v_review_source) ~ 'confirmed_license_and_rights_required',
    'review RPC must reject approval without confirmed rights';

  assert pg_get_functiondef(v_ack_impact) ~ 'plan\.user_id = v_uid',
    'impact acknowledgement must verify lesson-plan ownership';

  assert has_function_privilege(
    'authenticated',
    v_can_review,
    'EXECUTE'
  ), 'authenticated users must be able to test reviewer capability';

  assert has_function_privilege(
    'authenticated',
    v_review_source,
    'EXECUTE'
  ), 'authenticated reviewers must be able to call the protected review RPC';

  assert has_function_privilege(
    'authenticated',
    v_ack_impact,
    'EXECUTE'
  ), 'authenticated teachers must be able to acknowledge an owned impact';

  assert not (
    has_function_privilege('anon', v_can_review, 'EXECUTE')
    or has_function_privilege('anon', v_review_source, 'EXECUTE')
    or has_function_privilege('anon', v_ack_impact, 'EXECUTE')
  ), 'anonymous users must not execute governance RPCs';
end;
$contract$;

rollback;
