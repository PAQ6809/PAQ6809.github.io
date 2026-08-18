create or replace function public.queuehub_claim_push_job_service(p_job_id uuid,p_restaurant_id uuid,p_queue_version bigint)
returns boolean language plpgsql security definer set search_path='public' as $$
declare v_claimed uuid;
begin
  update public.queuehub_push_delivery_jobs set status='processing',lease_until=now()+interval '2 minutes',last_error=null,attempt_count=attempt_count+1
  where id=p_job_id and restaurant_id=p_restaurant_id and queue_version=p_queue_version and (status='pending' or (status='processing' and coalesce(lease_until,'epoch'::timestamptz)<now())) returning id into v_claimed;
  return v_claimed is not null;
end;$$;
create or replace function public.queuehub_complete_push_job_service(p_job_id uuid,p_retry boolean,p_error text default null)
returns void language plpgsql security definer set search_path='public' as $$
declare v_attempt integer;
begin
  select attempt_count into v_attempt from public.queuehub_push_delivery_jobs where id=p_job_id for update;if v_attempt is null then return;end if;
  if p_retry and v_attempt<8 then update public.queuehub_push_delivery_jobs set status='pending',lease_until=null,next_attempt_at=now()+make_interval(secs=>least(900,15*power(2,greatest(0,v_attempt-1))::integer)),last_error=left(coalesce(p_error,'transient push failure'),500) where id=p_job_id and status<>'completed';
  elsif p_retry then update public.queuehub_push_delivery_jobs set status='dead_letter',lease_until=null,completed_at=now(),last_error=left(coalesce(p_error,'push retry limit exceeded'),500) where id=p_job_id and status<>'completed';
  else update public.queuehub_push_delivery_jobs set status='completed',lease_until=null,completed_at=now(),last_error=case when p_error is null then null else left(p_error,500) end where id=p_job_id;end if;
end;$$;
create index if not exists queuehub_push_jobs_dead_letter_idx on public.queuehub_push_delivery_jobs(completed_at desc) where status='dead_letter';
create or replace function public.queuehub_maintenance_service() returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_telemetry integer;v_rates integer;v_nonces integer;v_dead integer;v_push integer;v_visitors integer;
begin
  delete from public.queuehub_runtime_telemetry where received_at<now()-interval '30 days';get diagnostics v_telemetry=row_count;delete from public.queuehub_runtime_telemetry_rate where minute_bucket<now()-interval '10 minutes';get diagnostics v_rates=row_count;delete from public.queuehub_gateway_nonces where expires_at<now();get diagnostics v_nonces=row_count;delete from public.queuehub_gateway_dead_letters where resolved_at is not null and resolved_at<now()-interval '30 days';get diagnostics v_dead=row_count;delete from public.queuehub_push_delivery_jobs where status in ('completed','dead_letter') and completed_at<now()-interval '30 days';get diagnostics v_push=row_count;delete from public.queuehub_visitor_sessions where expires_at<now() or (revoked_at is not null and revoked_at<now()-interval '30 days');get diagnostics v_visitors=row_count;return jsonb_build_object('telemetry',v_telemetry,'rate_rows',v_rates,'nonces',v_nonces,'gateway_dead_letters',v_dead,'push_jobs',v_push,'visitor_sessions',v_visitors,'at',now());
end;$$;
revoke all on function public.queuehub_claim_push_job_service(uuid,uuid,bigint) from public,anon,authenticated;revoke all on function public.queuehub_complete_push_job_service(uuid,boolean,text) from public,anon,authenticated;grant execute on function public.queuehub_claim_push_job_service(uuid,uuid,bigint) to service_role;grant execute on function public.queuehub_complete_push_job_service(uuid,boolean,text) to service_role;
