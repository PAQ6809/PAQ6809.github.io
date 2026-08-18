create table if not exists public.queuehub_gateway_devices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.queuehub_venues(id) on delete cascade,
  restaurant_id uuid references public.queuehub_restaurants(id) on delete cascade,
  device_key text not null unique,
  display_name text not null default 'QueueHub Gateway',
  public_key_pem text not null,
  key_version integer not null default 1 check (key_version > 0),
  status text not null default 'active' check (status in ('active','revoked')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  last_remote_addr text,
  metadata jsonb not null default '{}'::jsonb,
  constraint queuehub_gateway_device_key_format check (device_key ~ '^gw_[A-Za-z0-9_-]{12,80}$'),
  constraint queuehub_gateway_public_key_size check (length(public_key_pem) between 40 and 4096)
);
create index if not exists queuehub_gateway_devices_venue_status_idx on public.queuehub_gateway_devices(venue_id,status);
create index if not exists queuehub_gateway_devices_restaurant_idx on public.queuehub_gateway_devices(restaurant_id) where restaurant_id is not null;
create index if not exists queuehub_gateway_devices_last_seen_idx on public.queuehub_gateway_devices(last_seen_at desc);

create table if not exists public.queuehub_gateway_nonces (
  device_id uuid not null references public.queuehub_gateway_devices(id) on delete cascade,
  nonce text not null,
  seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  primary key(device_id,nonce),
  constraint queuehub_gateway_nonce_size check (length(nonce) between 12 and 160)
);
create index if not exists queuehub_gateway_nonces_expiry_idx on public.queuehub_gateway_nonces(expires_at);

create table if not exists public.queuehub_gateway_dead_letters (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.queuehub_gateway_devices(id) on delete set null,
  restaurant_id uuid references public.queuehub_restaurants(id) on delete set null,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  reason text not null,
  retry_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists queuehub_gateway_dead_letters_open_idx on public.queuehub_gateway_dead_letters(last_seen_at desc) where resolved_at is null;

alter table public.queuehub_queue_events add column if not exists gateway_device_id uuid references public.queuehub_gateway_devices(id) on delete set null;
create index if not exists queuehub_queue_events_gateway_idx on public.queuehub_queue_events(gateway_device_id,occurred_at desc) where gateway_device_id is not null;

alter table public.queuehub_gateway_devices enable row level security;
alter table public.queuehub_gateway_nonces enable row level security;
alter table public.queuehub_gateway_dead_letters enable row level security;
revoke all on public.queuehub_gateway_devices from anon, authenticated;
revoke all on public.queuehub_gateway_nonces from anon, authenticated;
revoke all on public.queuehub_gateway_dead_letters from anon, authenticated;

create or replace function public.queuehub_manage_gateway_device_service(
  p_actor_user_id uuid,p_action text,p_venue_id uuid,p_restaurant_id uuid default null,p_device_id uuid default null,p_device_key text default null,p_public_key_pem text default null,p_display_name text default null
) returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_role text;v_id uuid;v_row public.queuehub_gateway_devices%rowtype;
begin
  if p_actor_user_id is null then raise exception 'actor required' using errcode='22023'; end if;
  select role into v_role from public.queuehub_staff_members where user_id=p_actor_user_id and venue_id=p_venue_id and is_active=true;
  if v_role not in ('manager','admin') then raise exception 'insufficient gateway permission' using errcode='42501'; end if;
  if p_restaurant_id is not null and not exists(select 1 from public.queuehub_restaurants where id=p_restaurant_id and venue_id=p_venue_id) then raise exception 'restaurant outside venue' using errcode='42501'; end if;
  if p_action='register' then
    if p_device_key is null or p_public_key_pem is null then raise exception 'device key and public key required' using errcode='22023'; end if;
    insert into public.queuehub_gateway_devices(venue_id,restaurant_id,device_key,display_name,public_key_pem,created_by)
    values(p_venue_id,p_restaurant_id,p_device_key,coalesce(nullif(p_display_name,''),'QueueHub Gateway'),p_public_key_pem,p_actor_user_id) returning id into v_id;
  elsif p_action='rotate' then
    if p_device_id is null or p_public_key_pem is null then raise exception 'device id and public key required' using errcode='22023'; end if;
    update public.queuehub_gateway_devices set public_key_pem=p_public_key_pem,key_version=key_version+1,status='active',rotated_at=now(),revoked_at=null,updated_at=now() where id=p_device_id and venue_id=p_venue_id returning id into v_id;
    if v_id is null then raise exception 'gateway device not found' using errcode='P0002'; end if;
  elsif p_action='revoke' then
    if p_device_id is null then raise exception 'device id required' using errcode='22023'; end if;
    update public.queuehub_gateway_devices set status='revoked',revoked_at=now(),updated_at=now() where id=p_device_id and venue_id=p_venue_id returning id into v_id;
    if v_id is null then raise exception 'gateway device not found' using errcode='P0002'; end if;
  else raise exception 'unsupported gateway action' using errcode='22023'; end if;
  select * into v_row from public.queuehub_gateway_devices where id=v_id;
  return jsonb_build_object('ok',true,'id',v_row.id,'device_key',v_row.device_key,'venue_id',v_row.venue_id,'restaurant_id',v_row.restaurant_id,'key_version',v_row.key_version,'status',v_row.status);
end; $$;

create or replace function public.queuehub_gateway_register_nonce_service(p_device_id uuid,p_nonce text)
returns boolean language plpgsql security definer set search_path='public' as $$
begin
  delete from public.queuehub_gateway_nonces where expires_at < now();
  insert into public.queuehub_gateway_nonces(device_id,nonce) values(p_device_id,p_nonce);
  return true;
exception when unique_violation then return false;end; $$;

create or replace function public.queuehub_touch_gateway_service(p_device_id uuid,p_remote_addr text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_row public.queuehub_gateway_devices%rowtype;
begin
  update public.queuehub_gateway_devices set last_seen_at=now(),last_remote_addr=nullif(p_remote_addr,''),metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb),updated_at=now() where id=p_device_id and status='active' returning * into v_row;
  if v_row.id is null then raise exception 'active gateway device not found' using errcode='P0002'; end if;
  return jsonb_build_object('ok',true,'device_id',v_row.id,'last_seen_at',v_row.last_seen_at,'key_version',v_row.key_version);
end; $$;

create or replace function public.queuehub_apply_gateway_command_service(p_device_id uuid,p_restaurant_id uuid,p_action text,p_number integer default null,p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_device public.queuehub_gateway_devices%rowtype;v_status public.queuehub_queue_status%rowtype;v_existing public.queuehub_queue_events%rowtype;v_event text;v_number integer;v_state text;v_recent integer[];v_version bigint;
begin
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>128 then raise exception 'valid idempotency key required' using errcode='22023'; end if;
  select * into v_device from public.queuehub_gateway_devices where id=p_device_id and status='active';
  if v_device.id is null then raise exception 'active gateway device not found' using errcode='42501'; end if;
  if v_device.restaurant_id is not null and v_device.restaurant_id<>p_restaurant_id then raise exception 'restaurant outside device scope' using errcode='42501'; end if;
  if not exists(select 1 from public.queuehub_restaurants where id=p_restaurant_id and venue_id=v_device.venue_id and is_active=true) then raise exception 'restaurant outside venue scope' using errcode='42501'; end if;
  select * into v_status from public.queuehub_queue_status where restaurant_id=p_restaurant_id for update;
  if not found then raise exception 'queue status not found' using errcode='P0002'; end if;
  select * into v_existing from public.queuehub_queue_events where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.gateway_device_id is distinct from p_device_id or v_existing.restaurant_id is distinct from p_restaurant_id then raise exception 'idempotency key collision' using errcode='23505'; end if;
    return jsonb_build_object('ok',true,'duplicate',true,'restaurant_id',p_restaurant_id,'current_number',v_status.current_number,'state',v_status.state,'version',v_status.version,'event_type',v_existing.event_type,'idempotency_key',p_idempotency_key);
  end if;
  v_number:=v_status.current_number;v_state:=v_status.state;v_recent:=v_status.recent_numbers;
  if p_action='next' then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+1;v_state:='open';v_event:='called';
  elsif p_action='skip' then v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=v_status.current_number+2;v_state:='open';v_event:='skipped';
  elsif p_action='toggle' then if v_status.state='paused' then v_state:='open';v_event:='resumed';else v_state:='paused';v_event:='paused';end if;
  elsif p_action='set' then if p_number is null or p_number<=0 then raise exception 'invalid number' using errcode='22023';end if;v_recent:=(array_prepend(v_status.current_number,v_status.recent_numbers))[1:3];v_number:=p_number;v_state:='open';v_event:='reset';
  else raise exception 'unsupported action' using errcode='22023';end if;
  v_version:=v_status.version+1;
  update public.queuehub_queue_status set current_number=v_number,recent_numbers=v_recent,state=v_state,source='gateway',version=v_version,updated_at=now() where restaurant_id=p_restaurant_id;
  insert into public.queuehub_queue_events(restaurant_id,queue_session_id,sequence,event_type,number,source,actor_user_id,idempotency_key,gateway_device_id) values(p_restaurant_id,v_status.queue_session_id,v_version,v_event,v_number,'gateway',null,p_idempotency_key,p_device_id);
  update public.queuehub_gateway_devices set last_seen_at=now(),updated_at=now() where id=p_device_id;
  return jsonb_build_object('ok',true,'duplicate',false,'restaurant_id',p_restaurant_id,'current_number',v_number,'state',v_state,'version',v_version,'event_type',v_event,'idempotency_key',p_idempotency_key);
end; $$;

create or replace view public.queuehub_gateway_health as
select d.id,d.device_key,d.display_name,d.venue_id,d.restaurant_id,d.status,d.key_version,d.last_seen_at,d.updated_at,
case when d.status='active' and d.last_seen_at>=now()-interval '2 minutes' then 'online' when d.status='active' and d.last_seen_at is not null then 'stale' when d.status='active' then 'never_seen' else 'revoked' end as health
from public.queuehub_gateway_devices d;

revoke all on public.queuehub_gateway_health from anon,authenticated;
revoke all on function public.queuehub_manage_gateway_device_service(uuid,text,uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.queuehub_gateway_register_nonce_service(uuid,text) from public,anon,authenticated;
revoke all on function public.queuehub_touch_gateway_service(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.queuehub_apply_gateway_command_service(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.queuehub_manage_gateway_device_service(uuid,text,uuid,uuid,uuid,text,text,text) to service_role;
grant execute on function public.queuehub_gateway_register_nonce_service(uuid,text) to service_role;
grant execute on function public.queuehub_touch_gateway_service(uuid,text,jsonb) to service_role;
grant execute on function public.queuehub_apply_gateway_command_service(uuid,uuid,text,integer,text) to service_role;
grant select,insert,update,delete on public.queuehub_gateway_devices to service_role;
grant select,insert,delete on public.queuehub_gateway_nonces to service_role;
grant select,insert,update on public.queuehub_gateway_dead_letters to service_role;
grant select on public.queuehub_gateway_health to service_role;
