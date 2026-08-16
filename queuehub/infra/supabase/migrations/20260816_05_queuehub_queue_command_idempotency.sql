create or replace function public.queuehub_apply_queue_command_service_v2(
  p_actor_user_id uuid,
  p_restaurant_id uuid,
  p_action text,
  p_number integer default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_venue_id uuid;v_role text;v_status public.queuehub_queue_status%rowtype;v_existing public.queuehub_queue_events%rowtype;
  v_event text;v_number integer;v_state text;v_recent integer[];v_version bigint;
begin
  if p_actor_user_id is null then raise exception 'actor required' using errcode='22023';end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>128 then raise exception 'valid idempotency key required' using errcode='22023';end if;
  select venue_id into v_venue_id from public.queuehub_restaurants where id=p_restaurant_id and is_active=true;if v_venue_id is null then raise exception 'restaurant not found' using errcode='P0002';end if;
  select role into v_role from public.queuehub_staff_members where user_id=p_actor_user_id and venue_id=v_venue_id and is_active=true;if v_role not in('operator','manager','admin')then raise exception 'insufficient queue permission' using errcode='42501';end if;
  select * into v_status from public.queuehub_queue_status where restaurant_id=p_restaurant_id for update;if not found then raise exception 'queue status not found' using errcode='P0002';end if;
  select * into v_existing from public.queuehub_queue_events where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.actor_user_id is distinct from p_actor_user_id or v_existing.restaurant_id is distinct from p_restaurant_id then raise exception 'idempotency key collision' using errcode='23505';end if;
    return jsonb_build_object('ok',true,'duplicate',true,'restaurant_id',p_restaurant_id,'current_number',v_status.current_number,'state',v_status.state,'version',v_status.version,'event_type',v_existing.event_type,'idempotency_key',p_idempotency_key);
  end if;
  v_number:=v_status.current_number;v_state:=v_status.state;v_recent:=v_status.recent_numbers;
  if p_action='next'then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+1;v_state:='open';v_event:='called';
  elsif p_action='skip'then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+2;v_state:='open';v_event:='skipped';
  elsif p_action='toggle'then if v_status.state='paused'then v_state:='open';v_event:='resumed';else v_state:='paused';v_event:='paused';end if;
  elsif p_action='set'then if p_number is null or p_number<=0 then raise exception 'invalid number' using errcode='22023';end if;v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=p_number;v_state:='open';v_event:='reset';
  else raise exception 'unsupported action' using errcode='22023';end if;
  v_version:=v_status.version+1;
  update public.queuehub_queue_status set current_number=v_number,recent_numbers=v_recent,state=v_state,version=v_version,updated_at=now() where restaurant_id=p_restaurant_id;
  insert into public.queuehub_queue_events(restaurant_id,queue_session_id,sequence,event_type,number,source,actor_user_id,idempotency_key)values(p_restaurant_id,v_status.queue_session_id,v_version,v_event,v_number,v_status.source,p_actor_user_id,p_idempotency_key);
  return jsonb_build_object('ok',true,'duplicate',false,'restaurant_id',p_restaurant_id,'current_number',v_number,'state',v_state,'version',v_version,'event_type',v_event,'idempotency_key',p_idempotency_key);
end;$$;
revoke all on function public.queuehub_apply_queue_command_service_v2(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.queuehub_apply_queue_command_service_v2(uuid,uuid,text,integer,text) to service_role;
