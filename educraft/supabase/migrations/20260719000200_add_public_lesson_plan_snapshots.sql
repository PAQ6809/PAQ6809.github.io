-- Phase 1 M4: publish an allowlisted copy without changing the private lesson plan.
-- This migration is intentionally not applied by the GitHub Pages deployment.

create table public.educraft_lesson_plan_publications (
  id uuid primary key default gen_random_uuid(),
  source_plan_id uuid not null unique
    references public.educraft_lesson_plans(id) on delete cascade,
  owner_id uuid not null
    references auth.users(id) on delete cascade,
  public_slug text not null unique
    check (public_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  author_slug text not null
    check (author_slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  author_display_name text not null
    check (char_length(author_display_name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 200),
  subject text not null check (char_length(subject) <= 120),
  grade integer check (grade between 1 and 6),
  topic text not null check (char_length(topic) <= 500),
  language text not null check (char_length(language) between 1 and 80),
  output_language text not null check (char_length(output_language) between 1 and 80),
  content_markdown text not null check (char_length(content_markdown) <= 500000),
  license text not null check (license = any (array[
    'All rights reserved',
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC 4.0',
    'CC BY-NC-SA 4.0',
    'CC0 1.0'
  ])),
  teaching_style text not null check (char_length(teaching_style) between 1 and 80),
  originality_note text not null check (char_length(originality_note) <= 2000),
  methodology text[] not null default '{}'
    check (cardinality(methodology) <= 20),
  public_summary text not null check (char_length(public_summary) between 1 and 500),
  cover_emoji text not null default '📝' check (char_length(cover_emoji) <= 16),
  revision integer not null default 1 check (revision > 0),
  source_updated_at timestamptz not null,
  rights_confirmed_at timestamptz not null,
  privacy_confirmed_at timestamptz not null,
  published_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  snapshot_updated_at timestamptz not null default now()
);

comment on table public.educraft_lesson_plan_publications is
  'Allowlisted public copies of private EduCraft lesson plans. Writes are RPC-only.';

alter table public.educraft_lesson_plan_publications enable row level security;
alter table public.educraft_lesson_plan_publications force row level security;

create policy educraft_publications_read_active
  on public.educraft_lesson_plan_publications
  for select
  to anon, authenticated
  using (
    withdrawn_at is null
    and exists (
      select 1
      from public.educraft_public_profiles as profile
      where profile.user_id = owner_id
        and profile.is_listed
    )
  );

-- security_invoker keeps the view subject to the table's RLS policy.
create view public.educraft_public_lesson_plan_snapshots
with (security_invoker = true, security_barrier = true)
as
select
  publication.id,
  publication.public_slug,
  publication.author_slug,
  publication.author_display_name,
  publication.title,
  publication.subject,
  publication.grade,
  publication.topic,
  publication.language,
  publication.output_language,
  publication.content_markdown,
  publication.license,
  publication.teaching_style,
  publication.originality_note,
  publication.methodology,
  publication.public_summary,
  publication.cover_emoji,
  publication.revision,
  publication.published_at,
  publication.snapshot_updated_at
from public.educraft_lesson_plan_publications as publication
where publication.withdrawn_at is null;

create or replace function public.educraft_publish_lesson_plan_snapshot(
  p_plan_id uuid,
  p_public_slug text,
  p_public_summary text,
  p_license text,
  p_rights_confirmed boolean,
  p_privacy_confirmed boolean
)
returns table(snapshot_id uuid, slug text, snapshot_revision integer, snapshot_published_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_plan public.educraft_lesson_plans%rowtype;
  v_profile public.educraft_public_profiles%rowtype;
  v_slug text := lower(btrim(p_public_slug));
  v_summary text := btrim(p_public_summary);
  v_methodology text[] := '{}';
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;
  if not coalesce(p_rights_confirmed, false)
     or not coalesce(p_privacy_confirmed, false) then
    raise exception 'publication_confirmation_required';
  end if;
  if v_slug is null
     or v_slug <> p_public_slug
     or v_slug !~ '^[a-z0-9][a-z0-9-]{2,63}$' then
    raise exception 'invalid_public_slug';
  end if;
  if v_summary is null
     or char_length(v_summary) not between 1 and 500 then
    raise exception 'invalid_public_summary';
  end if;
  if p_license is null or not (p_license = any (array[
    'All rights reserved',
    'CC BY 4.0',
    'CC BY-SA 4.0',
    'CC BY-NC 4.0',
    'CC BY-NC-SA 4.0',
    'CC0 1.0'
  ])) then
    raise exception 'invalid_license';
  end if;

  select plan.*
  into v_plan
  from public.educraft_lesson_plans as plan
  where plan.id = p_plan_id
    and plan.user_id = v_uid
  for share;

  if not found then
    raise exception 'lesson_plan_not_found';
  end if;
  if char_length(v_plan.content_markdown) > 500000 then
    raise exception 'lesson_plan_content_too_large';
  end if;
  select profile.*
  into v_profile
  from public.educraft_public_profiles as profile
  where profile.user_id = v_uid
    and profile.is_listed;

  if not found then
    raise exception 'public_profile_required';
  end if;

  select coalesce(
    array_agg(method.value order by method.position)
      filter (where method.value <> ''),
    '{}'::text[]
  )
  into v_methodology
  from (
    select
      item.position,
      left(btrim(case
        when jsonb_typeof(item.value) = 'string' then item.value #>> '{}'
        when jsonb_typeof(item.value) = 'object' then coalesce(item.value ->> 'name', '')
        else ''
      end), 120) as value
    from jsonb_array_elements(case
      when jsonb_typeof(v_plan.methodology_json) = 'array' then v_plan.methodology_json
      else '[]'::jsonb
    end) with ordinality as item(value, position)
    order by item.position
    limit 20
  ) as method;

  insert into public.educraft_lesson_plan_publications as publication (
    source_plan_id,
    owner_id,
    public_slug,
    author_slug,
    author_display_name,
    title,
    subject,
    grade,
    topic,
    language,
    output_language,
    content_markdown,
    license,
    teaching_style,
    originality_note,
    methodology,
    public_summary,
    cover_emoji,
    source_updated_at,
    rights_confirmed_at,
    privacy_confirmed_at,
    published_at,
    snapshot_updated_at
  ) values (
    v_plan.id,
    v_uid,
    v_slug,
    v_profile.slug,
    v_profile.display_name,
    v_plan.title,
    v_plan.subject,
    v_plan.grade,
    v_plan.topic,
    v_plan.language,
    v_plan.output_language,
    v_plan.content_markdown,
    p_license,
    v_plan.teaching_style,
    v_plan.originality_note,
    v_methodology,
    v_summary,
    v_plan.cover_emoji,
    v_plan.updated_at,
    v_now,
    v_now,
    v_now,
    v_now
  )
  on conflict (source_plan_id) do update set
    title = excluded.title,
    author_slug = excluded.author_slug,
    author_display_name = excluded.author_display_name,
    subject = excluded.subject,
    grade = excluded.grade,
    topic = excluded.topic,
    language = excluded.language,
    output_language = excluded.output_language,
    content_markdown = excluded.content_markdown,
    license = excluded.license,
    teaching_style = excluded.teaching_style,
    originality_note = excluded.originality_note,
    methodology = excluded.methodology,
    public_summary = excluded.public_summary,
    cover_emoji = excluded.cover_emoji,
    revision = publication.revision + 1,
    source_updated_at = excluded.source_updated_at,
    rights_confirmed_at = excluded.rights_confirmed_at,
    privacy_confirmed_at = excluded.privacy_confirmed_at,
    published_at = excluded.published_at,
    withdrawn_at = null,
    snapshot_updated_at = excluded.snapshot_updated_at
  where publication.owner_id = excluded.owner_id
    and publication.public_slug = excluded.public_slug
  returning
    publication.id,
    publication.public_slug,
    publication.revision,
    publication.published_at
  into snapshot_id, slug, snapshot_revision, snapshot_published_at;

  if not found then
    raise exception 'public_slug_is_immutable';
  end if;

  return next;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'public_slug_taken';
end;
$function$;

create or replace function public.educraft_withdraw_lesson_plan_snapshot(p_plan_id uuid)
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

  update public.educraft_lesson_plan_publications as publication
  set
    withdrawn_at = clock_timestamp(),
    snapshot_updated_at = clock_timestamp()
  where publication.source_plan_id = p_plan_id
    and publication.owner_id = v_uid
    and publication.withdrawn_at is null
  returning true into v_changed;

  return coalesce(v_changed, false);
end;
$function$;

-- Data API access is explicit: clients may read active public columns only.
revoke all on table public.educraft_lesson_plan_publications
  from public, anon, authenticated;
grant select (
  id,
  public_slug,
  author_slug,
  author_display_name,
  title,
  subject,
  grade,
  topic,
  language,
  output_language,
  content_markdown,
  license,
  teaching_style,
  originality_note,
  methodology,
  public_summary,
  cover_emoji,
  revision,
  published_at,
  withdrawn_at,
  snapshot_updated_at
) on table public.educraft_lesson_plan_publications to anon, authenticated;
grant select, insert, update, delete
  on table public.educraft_lesson_plan_publications to service_role;

revoke all on table public.educraft_public_lesson_plan_snapshots
  from public, anon, authenticated;
grant select on table public.educraft_public_lesson_plan_snapshots
  to anon, authenticated, service_role;

revoke all on function public.educraft_publish_lesson_plan_snapshot(
  uuid, text, text, text, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.educraft_publish_lesson_plan_snapshot(
  uuid, text, text, text, boolean, boolean
) to authenticated;

revoke all on function public.educraft_withdraw_lesson_plan_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function public.educraft_withdraw_lesson_plan_snapshot(uuid)
  to authenticated;
