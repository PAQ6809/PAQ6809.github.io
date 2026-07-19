-- Run after the M4 migration on a disposable local/staging database.
-- This contract is metadata-only and rolls back its own transaction.

begin;

do $contract$
declare
  v_relation oid := 'public.educraft_lesson_plan_publications'::regclass;
  v_view oid := 'public.educraft_public_lesson_plan_snapshots'::regclass;
begin
  assert (
    select relation.relrowsecurity and relation.relforcerowsecurity
    from pg_class as relation
    where relation.oid = v_relation
  ), 'publication table must enable and force RLS';

  assert (
    select relation.reloptions @> array['security_invoker=true']::text[]
    from pg_class as relation
    where relation.oid = v_view
  ), 'public snapshot view must use security_invoker';

  assert not exists (
    select 1
    from information_schema.columns as column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'educraft_public_lesson_plan_snapshots'
      and column_info.column_name = any (array[
        'source_plan_id',
        'owner_id',
        'plan_json',
        'rights_confirmed_at',
        'privacy_confirmed_at',
        'source_updated_at',
        'withdrawn_at'
      ])
  ), 'public view exposes an internal or unrestricted field';

  assert has_any_column_privilege(
    'anon',
    'public.educraft_lesson_plan_publications',
    'SELECT'
  ), 'anon must be able to read allowlisted publication columns';

  assert not (
    has_table_privilege('anon', 'public.educraft_lesson_plan_publications', 'INSERT')
    or has_table_privilege('anon', 'public.educraft_lesson_plan_publications', 'UPDATE')
    or has_table_privilege('anon', 'public.educraft_lesson_plan_publications', 'DELETE')
  ), 'anon must not write the publication table';

  assert not (
    has_table_privilege('authenticated', 'public.educraft_lesson_plan_publications', 'INSERT')
    or has_table_privilege('authenticated', 'public.educraft_lesson_plan_publications', 'UPDATE')
    or has_table_privilege('authenticated', 'public.educraft_lesson_plan_publications', 'DELETE')
  ), 'authenticated clients must publish through RPC only';

  assert not has_column_privilege(
    'anon',
    'public.educraft_lesson_plan_publications',
    'source_plan_id',
    'SELECT'
  ), 'anon must not read the private source plan id';

  assert not has_column_privilege(
    'authenticated',
    'public.educraft_lesson_plan_publications',
    'owner_id',
    'SELECT'
  ), 'authenticated clients must not read the internal owner id';

  assert not exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'educraft_lesson_plan_publications'
      and policy.cmd <> 'SELECT'
  ), 'publication table must not have a direct client write policy';

  assert has_function_privilege(
    'authenticated',
    'public.educraft_publish_lesson_plan_snapshot(uuid,text,text,text,boolean,boolean)',
    'EXECUTE'
  ), 'authenticated users must be allowed to call publish RPC';

  assert not has_function_privilege(
    'anon',
    'public.educraft_publish_lesson_plan_snapshot(uuid,text,text,text,boolean,boolean)',
    'EXECUTE'
  ), 'anon must not call publish RPC';

  assert has_function_privilege(
    'authenticated',
    'public.educraft_withdraw_lesson_plan_snapshot(uuid)',
    'EXECUTE'
  ), 'authenticated users must be allowed to call withdraw RPC';

  assert not has_function_privilege(
    'anon',
    'public.educraft_withdraw_lesson_plan_snapshot(uuid)',
    'EXECUTE'
  ), 'anon must not call withdraw RPC';

  assert (
    select bool_and(procedure.proconfig @> array['search_path=""']::text[])
    from pg_proc as procedure
    where procedure.oid = any (array[
      'public.educraft_publish_lesson_plan_snapshot(uuid,text,text,text,boolean,boolean)'::regprocedure::oid,
      'public.educraft_withdraw_lesson_plan_snapshot(uuid)'::regprocedure::oid
    ])
  ), 'security-definer RPCs must pin an empty search_path';

  assert (
    select count(*) = 2
    from pg_constraint as constraint_info
    where constraint_info.conrelid = v_relation
      and constraint_info.contype = 'u'
      and pg_get_constraintdef(constraint_info.oid) in (
        'UNIQUE (source_plan_id)',
        'UNIQUE (public_slug)'
      )
  ), 'source plan and public slug must each be unique';
end;
$contract$;

rollback;
