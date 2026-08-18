create or replace view public.queuehub_runtime_metrics_hourly as
select date_trunc('hour',received_at) as hour,client_kind,event_name,count(*)::bigint as event_count,avg(duration_ms)::numeric(12,2) as avg_duration_ms,percentile_cont(0.95) within group(order by duration_ms) filter(where duration_ms is not null) as p95_duration_ms,avg(value)::numeric(16,4) as avg_value
from public.queuehub_runtime_telemetry group by 1,2,3;
create or replace view public.queuehub_operational_health as
select now() as observed_at,
(select count(*) from public.queuehub_gateway_devices where status='active' and last_seen_at>=now()-interval '2 minutes')::integer as gateways_online,
(select count(*) from public.queuehub_gateway_devices where status='active' and (last_seen_at is null or last_seen_at<now()-interval '2 minutes'))::integer as gateways_stale,
(select count(*) from public.queuehub_gateway_dead_letters where resolved_at is null)::integer as gateway_dead_letters_open,
(select count(*) from public.queuehub_push_delivery_jobs where status='dead_letter')::integer as push_dead_letters_open,
(select count(*) from public.queuehub_push_delivery_jobs where status='pending' and next_attempt_at<=now())::integer as push_jobs_due,
(select count(*) from public.queuehub_queue_status where updated_at<now()-interval '5 minutes')::integer as queue_status_stale,
(select count(*) from public.queuehub_runtime_telemetry where received_at>=now()-interval '15 minutes')::integer as telemetry_events_15m;
revoke all on public.queuehub_runtime_metrics_hourly from anon,authenticated;revoke all on public.queuehub_operational_health from anon,authenticated;grant select on public.queuehub_runtime_metrics_hourly to service_role;grant select on public.queuehub_operational_health to service_role;
