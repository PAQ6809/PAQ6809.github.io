-- Applied after the core schema. Browser roles cannot execute privileged write RPCs.
create policy queuehub_staff_read_sessions on public.queuehub_queue_sessions for select to authenticated using(exists(select 1 from public.queuehub_restaurants r join public.queuehub_staff_members m on m.venue_id=r.venue_id where r.id=restaurant_id and m.user_id=auth.uid() and m.is_active));
grant select on public.queuehub_queue_sessions to authenticated;

create or replace function public.queuehub_apply_queue_command_service(p_actor_user_id uuid,p_restaurant_id uuid,p_action text,p_number integer default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_venue_id uuid;v_role text;v_status public.queuehub_queue_status%rowtype;v_event text;v_number integer;v_state text;v_recent integer[];v_version bigint;
begin
 if p_actor_user_id is null then raise exception 'actor required' using errcode='22023';end if;
 select venue_id into v_venue_id from public.queuehub_restaurants where id=p_restaurant_id and is_active=true;if v_venue_id is null then raise exception 'restaurant not found' using errcode='P0002';end if;
 select role into v_role from public.queuehub_staff_members where user_id=p_actor_user_id and venue_id=v_venue_id and is_active=true;if v_role not in('operator','manager','admin')then raise exception 'insufficient queue permission' using errcode='42501';end if;
 select * into v_status from public.queuehub_queue_status where restaurant_id=p_restaurant_id for update;if not found then raise exception 'queue status not found' using errcode='P0002';end if;
 v_number:=v_status.current_number;v_state:=v_status.state;v_recent:=v_status.recent_numbers;
 if p_action='next'then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+1;v_state:='open';v_event:='called';
 elsif p_action='skip'then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+2;v_state:='open';v_event:='skipped';
 elsif p_action='toggle'then if v_status.state='paused'then v_state:='open';v_event:='resumed';else v_state:='paused';v_event:='paused';end if;
 elsif p_action='set'then if p_number is null or p_number<=0 then raise exception 'invalid number' using errcode='22023';end if;v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=p_number;v_state:='open';v_event:='reset';
 else raise exception 'unsupported action' using errcode='22023';end if;
 v_version:=v_status.version+1;update public.queuehub_queue_status set current_number=v_number,recent_numbers=v_recent,state=v_state,version=v_version,updated_at=now() where restaurant_id=p_restaurant_id;
 insert into public.queuehub_queue_events(restaurant_id,queue_session_id,sequence,event_type,number,source,actor_user_id)values(p_restaurant_id,v_status.queue_session_id,v_version,v_event,v_number,v_status.source,p_actor_user_id);
 return jsonb_build_object('ok',true,'restaurant_id',p_restaurant_id,'current_number',v_number,'state',v_state,'version',v_version,'event_type',v_event);
end;$$;

create or replace function public.queuehub_save_integration_service(p_actor_user_id uuid,p_restaurant_id uuid,p_type text,p_enabled boolean,p_api_endpoint text default null,p_webhook_path text default null,p_polling integer default null,p_secret_name text default null,p_gateway_device_id text default null)returns jsonb language plpgsql security definer set search_path=public as $$
declare v_venue_id uuid;v_role text;
begin
 if p_actor_user_id is null then raise exception 'actor required' using errcode='22023';end if;if p_type not in('api','webhook','manual','gateway')then raise exception 'invalid integration type' using errcode='22023';end if;
 select venue_id into v_venue_id from public.queuehub_restaurants where id=p_restaurant_id;if v_venue_id is null then raise exception 'restaurant not found' using errcode='P0002';end if;
 select role into v_role from public.queuehub_staff_members where user_id=p_actor_user_id and venue_id=v_venue_id and is_active=true;if v_role not in('manager','admin')then raise exception 'insufficient integration permission' using errcode='42501';end if;
 insert into public.queuehub_integration_configs(restaurant_id,integration_type,enabled,api_endpoint,webhook_path,polling_interval_seconds,api_key_secret_name,gateway_device_id,updated_at)values(p_restaurant_id,p_type,coalesce(p_enabled,true),nullif(p_api_endpoint,''),nullif(p_webhook_path,''),p_polling,nullif(p_secret_name,''),nullif(p_gateway_device_id,''),now())on conflict(restaurant_id)do update set integration_type=excluded.integration_type,enabled=excluded.enabled,api_endpoint=excluded.api_endpoint,webhook_path=excluded.webhook_path,polling_interval_seconds=excluded.polling_interval_seconds,api_key_secret_name=excluded.api_key_secret_name,gateway_device_id=excluded.gateway_device_id,updated_at=now();return jsonb_build_object('ok',true,'restaurant_id',p_restaurant_id,'integration_type',p_type);
end;$$;
revoke all on function public.queuehub_apply_queue_command_service(uuid,uuid,text,integer) from public,anon,authenticated;revoke all on function public.queuehub_save_integration_service(uuid,uuid,text,boolean,text,text,integer,text,text) from public,anon,authenticated;grant execute on function public.queuehub_apply_queue_command_service(uuid,uuid,text,integer) to service_role;grant execute on function public.queuehub_save_integration_service(uuid,uuid,text,boolean,text,text,integer,text,text) to service_role;
