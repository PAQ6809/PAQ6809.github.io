create or replace function public.queuehub_maintenance_service() returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_telemetry integer;v_rates integer;v_nonces integer;v_dead integer;v_visitors integer;
begin
  delete from public.queuehub_runtime_telemetry where received_at<now()-interval '30 days';get diagnostics v_telemetry=row_count;
  delete from public.queuehub_runtime_telemetry_rate where minute_bucket<now()-interval '10 minutes';get diagnostics v_rates=row_count;
  delete from public.queuehub_gateway_nonces where expires_at<now();get diagnostics v_nonces=row_count;
  delete from public.queuehub_gateway_dead_letters where resolved_at is not null and resolved_at<now()-interval '30 days';get diagnostics v_dead=row_count;
  delete from public.queuehub_visitor_sessions where expires_at<now() or (revoked_at is not null and revoked_at<now()-interval '30 days');get diagnostics v_visitors=row_count;
  return jsonb_build_object('telemetry',v_telemetry,'rate_rows',v_rates,'nonces',v_nonces,'dead_letters',v_dead,'visitor_sessions',v_visitors,'at',now());
end;$$;
revoke all on function public.queuehub_maintenance_service() from public,anon,authenticated;
grant execute on function public.queuehub_maintenance_service() to service_role;
select cron.schedule('queuehub-daily-maintenance','17 3 * * *','select public.queuehub_maintenance_service();');
