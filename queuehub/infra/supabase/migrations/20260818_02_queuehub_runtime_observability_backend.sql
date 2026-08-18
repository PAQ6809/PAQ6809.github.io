create table if not exists public.queuehub_runtime_telemetry (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  client_kind text not null,
  session_hash text not null,
  release text,
  event_name text not null,
  value double precision,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  constraint queuehub_runtime_telemetry_session_hash check (session_hash ~ '^[0-9a-f]{64}$'),
  constraint queuehub_runtime_telemetry_event_name check (event_name ~ '^[A-Za-z0-9_:.-]{1,96}$')
);
create index if not exists queuehub_runtime_telemetry_received_idx on public.queuehub_runtime_telemetry(received_at desc);
create index if not exists queuehub_runtime_telemetry_event_idx on public.queuehub_runtime_telemetry(event_name,received_at desc);
create index if not exists queuehub_runtime_telemetry_client_idx on public.queuehub_runtime_telemetry(client_kind,received_at desc);

create table if not exists public.queuehub_runtime_telemetry_rate (
  session_hash text not null,
  minute_bucket timestamptz not null,
  event_count integer not null default 0,
  primary key(session_hash,minute_bucket)
);

alter table public.queuehub_runtime_telemetry enable row level security;
alter table public.queuehub_runtime_telemetry_rate enable row level security;
revoke all on public.queuehub_runtime_telemetry from anon,authenticated;
revoke all on public.queuehub_runtime_telemetry_rate from anon,authenticated;

create or replace function public.queuehub_accept_telemetry_batch_service(p_session_hash text,p_client_kind text,p_release text,p_events jsonb)
returns integer language plpgsql security definer set search_path='public' as $$
declare v_len integer;v_bucket timestamptz;v_total integer;v_item jsonb;v_name text;v_meta jsonb;v_value double precision;v_duration integer;
begin
  if p_session_hash is null or p_session_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid session hash' using errcode='22023'; end if;
  if p_client_kind not in ('mobile-web','mobile-pwa','tablet','desktop','kiosk','unknown') then raise exception 'invalid client kind' using errcode='22023'; end if;
  if jsonb_typeof(p_events)<>'array' then raise exception 'events must be array' using errcode='22023'; end if;
  v_len:=jsonb_array_length(p_events);if v_len<1 or v_len>20 then raise exception 'invalid batch size' using errcode='22023'; end if;
  v_bucket:=date_trunc('minute',now());
  insert into public.queuehub_runtime_telemetry_rate(session_hash,minute_bucket,event_count) values(p_session_hash,v_bucket,v_len)
  on conflict(session_hash,minute_bucket) do update set event_count=public.queuehub_runtime_telemetry_rate.event_count+excluded.event_count returning event_count into v_total;
  if v_total>120 then raise exception 'telemetry rate limit exceeded' using errcode='54000'; end if;
  for v_item in select value from jsonb_array_elements(p_events) loop
    v_name:=left(coalesce(v_item->>'name',''),96);if v_name !~ '^[A-Za-z0-9_:.-]{1,96}$' then continue; end if;
    v_value:=case when jsonb_typeof(v_item->'value')='number' then (v_item->>'value')::double precision else null end;
    v_duration:=case when jsonb_typeof(v_item->'durationMs')='number' then greatest(0,least(600000,(v_item->>'durationMs')::integer)) else null end;
    v_meta:=coalesce(v_item->'meta','{}'::jsonb);if jsonb_typeof(v_meta)<>'object' or pg_column_size(v_meta)>4096 then v_meta:='{}'::jsonb;end if;
    insert into public.queuehub_runtime_telemetry(client_kind,session_hash,release,event_name,value,duration_ms,metadata) values(p_client_kind,p_session_hash,left(coalesce(p_release,''),80),v_name,v_value,v_duration,v_meta);
  end loop;
  delete from public.queuehub_runtime_telemetry_rate where minute_bucket<now()-interval '10 minutes';return v_len;
end; $$;
revoke all on function public.queuehub_accept_telemetry_batch_service(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.queuehub_accept_telemetry_batch_service(text,text,text,jsonb) to service_role;
grant select,insert,delete on public.queuehub_runtime_telemetry to service_role;
grant select,insert,update,delete on public.queuehub_runtime_telemetry_rate to service_role;
