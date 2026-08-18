do $$
declare t text;
begin
  foreach t in array array['queuehub_gateway_devices','queuehub_gateway_nonces','queuehub_gateway_dead_letters','queuehub_runtime_telemetry','queuehub_runtime_telemetry_rate','queuehub_visitor_sessions','queuehub_tracked_orders'] loop
    execute format('drop policy if exists queuehub_explicit_private_deny on public.%I',t);
    execute format('create policy queuehub_explicit_private_deny on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',t);
  end loop;
end $$;
