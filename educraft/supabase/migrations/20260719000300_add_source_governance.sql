-- Phase 1 M5: keep source licensing decisions human-reviewed and lesson impacts private.
-- This migration is intentionally not applied by the GitHub Pages deployment.

create schema if not exists educraft_private;

revoke all on schema educraft_private from public, anon, authenticated;
grant usage on schema educraft_private to service_role;

-- Membership is service-managed. Authorization never depends on editable auth metadata.
create table educraft_private.educraft_source_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

alter table educraft_private.educraft_source_reviewers enable row level security;
alter table educraft_private.educraft_source_reviewers force row level security;

revoke all on table educraft_private.educraft_source_reviewers
  from public, anon, authenticated;
grant select, insert, update, delete
  on table educraft_private.educraft_source_reviewers to service_role;

create table public.educraft_source_observations (
  id uuid primary key default gen_random_uuid(),
  source_id text not null
    check (source_id ~ '^[a-z0-9][a-z0-9-]{2,127}$'),
  observed_digest text not null
    check (observed_digest ~ '^[0-9a-f]{64}$'),
  title text not null check (char_length(title) between 1 and 200),
  canonical_url text not null
    check (canonical_url ~ '^https://'),
  observed_license text not null default 'unknown'
    check (char_length(observed_license) between 1 and 160),
  rights_url text check (rights_url is null or rights_url ~ '^https://'),
  observed_at timestamptz not null default now(),
  unique (source_id, observed_digest)
);

comment on table public.educraft_source_observations is
  'Service-recorded source versions. Browser roles have read-only, allowlisted access.';

alter table public.educraft_source_observations enable row level security;
alter table public.educraft_source_observations force row level security;

create policy educraft_source_observations_read
  on public.educraft_source_observations
  for select
  to anon, authenticated
  using (true);

create table public.educraft_source_reviews (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null
    references public.educraft_source_observations(id) on delete cascade,
  decision text not null
    check (decision = any (array[
      'approved_metadata_only',
      'approved_reusable',
      'rejected',
      'needs_changes'
    ])),
  reason text not null check (char_length(reason) between 1 and 2000),
  confirmed_license text not null default 'unknown'
    check (char_length(confirmed_license) between 1 and 160),
  rights_url text check (rights_url is null or rights_url ~ '^https://'),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  is_reusable boolean generated always as (
    decision = 'approved_reusable'
    and lower(btrim(confirmed_license)) = any (array[
      'cc by 4.0',
      'cc by-sa 4.0',
      'cc by-nc 4.0',
      'cc by-nc-sa 4.0',
      'cc0 1.0',
      'public domain'
    ])
  ) stored,
  check (
    decision <> 'approved_reusable'
    or (
      lower(btrim(confirmed_license)) = any (array[
        'cc by 4.0',
        'cc by-sa 4.0',
        'cc by-nc 4.0',
        'cc by-nc-sa 4.0',
        'cc0 1.0',
        'public domain'
      ])
      and rights_url is not null
    )
  )
);

comment on table public.educraft_source_reviews is
  'Append-only human decisions. Metadata-only approval permits citation; reusable approval also requires confirmed open rights.';

alter table public.educraft_source_reviews enable row level security;
alter table public.educraft_source_reviews force row level security;

create policy educraft_source_reviews_read
  on public.educraft_source_reviews
  for select
  to anon, authenticated
  using (true);

-- The public projection excludes reviewer identity and internal review notes.
create view public.educraft_source_review_statuses
with (security_invoker = true, security_barrier = true)
as
select
  observation.source_id,
  observation.observed_digest,
  observation.title,
  observation.canonical_url,
  observation.observed_license,
  observation.rights_url as observed_rights_url,
  observation.observed_at,
  coalesce(review.decision, 'pending') as decision,
  coalesce(review.confirmed_license, 'unknown') as confirmed_license,
  review.rights_url as confirmed_rights_url,
  coalesce(review.is_reusable, false) as is_reusable,
  review.reviewed_at
from public.educraft_source_observations as observation
left join lateral (
  select
    source_review.decision,
    source_review.confirmed_license,
    source_review.rights_url,
    source_review.is_reusable,
    source_review.reviewed_at
  from public.educraft_source_reviews as source_review
  where source_review.observation_id = observation.id
  order by source_review.reviewed_at desc, source_review.id desc
  limit 1
) as review on true;

create table public.educraft_lesson_source_impacts (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null
    references public.educraft_lesson_plans(id) on delete cascade,
  source_id text not null
    check (source_id ~ '^[a-z0-9][a-z0-9-]{2,127}$'),
  previous_digest text
    check (previous_digest is null or previous_digest ~ '^[0-9a-f]{64}$'),
  current_digest text not null
    check (current_digest ~ '^[0-9a-f]{64}$'),
  impact_kind text not null
    check (impact_kind = any (array[
      'content_changed',
      'license_changed',
      'source_unavailable',
      'review_revoked'
    ])),
  summary text not null check (char_length(summary) between 1 and 1000),
  status text not null default 'pending'
    check (status = any (array['pending', 'acknowledged', 'resolved'])),
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  check (
    (status = 'pending' and acknowledged_at is null and resolved_at is null)
    or (status = 'acknowledged' and acknowledged_at is not null and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create unique index educraft_lesson_source_impacts_active_unique
  on public.educraft_lesson_source_impacts (
    lesson_plan_id,
    source_id,
    current_digest,
    impact_kind
  )
  where status <> 'resolved';

comment on table public.educraft_lesson_source_impacts is
  'Owner-only notices that a cited source changed, became unavailable, or changed review state.';

alter table public.educraft_lesson_source_impacts enable row level security;
alter table public.educraft_lesson_source_impacts force row level security;

create policy educraft_lesson_source_impacts_read_own
  on public.educraft_lesson_source_impacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.educraft_lesson_plans as plan
      where plan.id = lesson_plan_id
        and plan.user_id = auth.uid()
    )
  );

create or replace function public.educraft_can_review_sources()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from educraft_private.educraft_source_reviewers as reviewer
      where reviewer.user_id = auth.uid()
        and reviewer.is_active
    );
$function$;

create or replace function public.educraft_review_source(
  p_source_id text,
  p_observed_digest text,
  p_decision text,
  p_reason text,
  p_license text,
  p_rights_url text
)
returns table(
  review_id uuid,
  source_id text,
  observed_digest text,
  decision text,
  reusable boolean,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_observation_id uuid;
  v_decision text := lower(btrim(p_decision));
  v_reason text := btrim(p_reason);
  v_license text := coalesce(nullif(btrim(p_license), ''), 'unknown');
  v_rights_url text := nullif(btrim(p_rights_url), '');
  v_review public.educraft_source_reviews%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;
  if not exists (
    select 1
    from educraft_private.educraft_source_reviewers as reviewer
    where reviewer.user_id = v_uid
      and reviewer.is_active
  ) then
    raise exception 'source_reviewer_required';
  end if;
  if p_source_id is null
     or p_source_id !~ '^[a-z0-9][a-z0-9-]{2,127}$'
     or p_observed_digest is null
     or p_observed_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_source_observation';
  end if;
  if v_decision is null
     or not (v_decision = any (array[
       'approved_metadata_only',
       'approved_reusable',
       'rejected',
       'needs_changes'
     ])) then
    raise exception 'invalid_review_decision';
  end if;
  if v_reason is null or char_length(v_reason) not between 1 and 2000 then
    raise exception 'review_reason_required';
  end if;
  if char_length(v_license) > 160 then
    raise exception 'invalid_confirmed_license';
  end if;
  if v_rights_url is not null and v_rights_url !~ '^https://' then
    raise exception 'invalid_rights_url';
  end if;
  if v_decision = 'approved_reusable' and (
    not (lower(v_license) = any (array[
      'cc by 4.0',
      'cc by-sa 4.0',
      'cc by-nc 4.0',
      'cc by-nc-sa 4.0',
      'cc0 1.0',
      'public domain'
    ]))
    or v_rights_url is null
  ) then
    raise exception 'confirmed_license_and_rights_required';
  end if;

  select observation.id
  into v_observation_id
  from public.educraft_source_observations as observation
  where observation.source_id = p_source_id
    and observation.observed_digest = p_observed_digest
  for share;

  if not found then
    raise exception 'source_observation_not_found';
  end if;

  insert into public.educraft_source_reviews as source_review (
    observation_id,
    decision,
    reason,
    confirmed_license,
    rights_url,
    reviewed_by
  ) values (
    v_observation_id,
    v_decision,
    v_reason,
    v_license,
    v_rights_url,
    v_uid
  )
  returning source_review.* into v_review;

  review_id := v_review.id;
  source_id := p_source_id;
  observed_digest := p_observed_digest;
  decision := v_review.decision;
  reusable := v_review.is_reusable;
  reviewed_at := v_review.reviewed_at;
  return next;
end;
$function$;

create or replace function public.educraft_acknowledge_lesson_source_impact(
  p_impact_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_changed boolean;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  update public.educraft_lesson_source_impacts as impact
  set
    status = 'acknowledged',
    acknowledged_at = clock_timestamp()
  where impact.id = p_impact_id
    and impact.status = 'pending'
    and exists (
      select 1
      from public.educraft_lesson_plans as plan
      where plan.id = impact.lesson_plan_id
        and plan.user_id = v_uid
    )
  returning true into v_changed;

  if coalesce(v_changed, false) then
    return true;
  end if;

  if exists (
    select 1
    from public.educraft_lesson_source_impacts as impact
    join public.educraft_lesson_plans as plan
      on plan.id = impact.lesson_plan_id
    where impact.id = p_impact_id
      and plan.user_id = v_uid
      and impact.status = any (array['acknowledged', 'resolved'])
  ) then
    return true;
  end if;

  raise exception 'lesson_source_impact_not_found';
end;
$function$;

-- Data API exposure is explicit and read-only for browser roles.
revoke all on table public.educraft_source_observations
  from public, anon, authenticated;
grant select (
  id,
  source_id,
  observed_digest,
  title,
  canonical_url,
  observed_license,
  rights_url,
  observed_at
) on table public.educraft_source_observations to anon, authenticated;
grant select, insert, update, delete
  on table public.educraft_source_observations to service_role;

revoke all on table public.educraft_source_reviews
  from public, anon, authenticated;
grant select (
  id,
  observation_id,
  decision,
  confirmed_license,
  rights_url,
  is_reusable,
  reviewed_at
) on table public.educraft_source_reviews to anon, authenticated;
grant select, insert, update, delete
  on table public.educraft_source_reviews to service_role;

revoke all on table public.educraft_source_review_statuses
  from public, anon, authenticated;
grant select on table public.educraft_source_review_statuses
  to anon, authenticated, service_role;

revoke all on table public.educraft_lesson_source_impacts
  from public, anon, authenticated;
grant select on table public.educraft_lesson_source_impacts to authenticated;
grant select, insert, update, delete
  on table public.educraft_lesson_source_impacts to service_role;

revoke all on function public.educraft_can_review_sources()
  from public, anon, authenticated;
grant execute on function public.educraft_can_review_sources()
  to authenticated;

revoke all on function public.educraft_review_source(
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.educraft_review_source(
  text, text, text, text, text, text
) to authenticated;

revoke all on function public.educraft_acknowledge_lesson_source_impact(uuid)
  from public, anon, authenticated;
grant execute on function public.educraft_acknowledge_lesson_source_impact(uuid)
  to authenticated;
