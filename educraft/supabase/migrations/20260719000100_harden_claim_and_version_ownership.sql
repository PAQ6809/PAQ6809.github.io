-- Phase 1 M3: keep ChatGPT claims working and bind versions to their plan owner.
-- This migration is intentionally not applied by the GitHub Pages deployment.

create or replace function public.educraft_claim_chatgpt_transfer_draft(p_claim_code text)
returns table(plan_id uuid, client_id text, title text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_draft public.educraft_chatgpt_transfer_drafts%rowtype;
  v_plan_id uuid;
  v_client_id text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_claim_code is null or p_claim_code !~ '^[a-z0-9]{12}$' then raise exception 'invalid_claim_code'; end if;

  select * into v_draft
  from public.educraft_chatgpt_transfer_drafts
  where claim_code = p_claim_code
  for update;

  if not found then raise exception 'transfer_not_found'; end if;
  if v_draft.status = 'claimed' then
    if v_draft.claimed_by = v_uid and v_draft.claimed_plan_id is not null then
      return query select v_draft.claimed_plan_id, 'chatgpt-' || v_draft.id::text, v_draft.title;
      return;
    end if;
    raise exception 'transfer_already_claimed';
  end if;
  if v_draft.status <> 'pending' or v_draft.expires_at <= now() then
    update public.educraft_chatgpt_transfer_drafts set status='expired' where id=v_draft.id;
    raise exception 'transfer_expired';
  end if;

  v_client_id := 'chatgpt-' || v_draft.id::text;
  insert into public.educraft_lesson_plans(
    user_id,client_id,title,subject,grade,topic,language,content_markdown,plan_json,
    citations_json,tags,status,source_mode,visibility,license,teaching_style,
    output_language,originality_note,methodology_json,public_summary
  ) values (
    v_uid,v_client_id,left(v_draft.title,200),v_draft.subject,v_draft.grade,v_draft.topic,
    v_draft.language,v_draft.content_markdown,v_draft.plan_json,v_draft.citations_json,
    v_draft.tags,'draft','ai','private','CC BY-NC-SA 4.0',v_draft.teaching_style,
    v_draft.output_language,coalesce(v_draft.plan_json->>'originality_note',''),
    coalesce(v_draft.plan_json->'methodology','[]'::jsonb),''
  )
  on conflict on constraint educraft_lesson_plans_user_id_client_id_key do update set
    title=excluded.title, content_markdown=excluded.content_markdown, plan_json=excluded.plan_json,
    citations_json=excluded.citations_json, updated_at=now()
  returning id into v_plan_id;

  update public.educraft_chatgpt_transfer_drafts
  set status='claimed', claimed_by=v_uid, claimed_plan_id=v_plan_id, claimed_at=now()
  where id=v_draft.id;

  return query select v_plan_id, v_client_id, v_draft.title;
end;
$function$;

drop policy if exists educraft_versions_insert_own
  on public.educraft_lesson_plan_versions;

create policy educraft_versions_insert_own
  on public.educraft_lesson_plan_versions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.educraft_lesson_plans as plan
      where plan.id = lesson_plan_id
        and plan.user_id = auth.uid()
    )
  );
