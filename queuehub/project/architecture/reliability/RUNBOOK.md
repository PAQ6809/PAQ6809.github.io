# QueueHub Failure-Mode Runbook

## Realtime degraded / disconnected
1. Client reconnect controller coalesces duplicate failures and applies exponential backoff + jitter.
2. After reconnect, perform authoritative REST resync before trusting incremental events.
3. If REST is also failing, circuit breaker opens and UI remains degraded instead of request-storming the backend.
4. Check `queuehub_runtime_telemetry` for reconnect/resync/provider events and Supabase Realtime/API logs.

## Public REST failure
1. Confirm circuit state and provider telemetry.
2. Check Supabase API status/logs and database health.
3. Do not bypass RLS or switch clients to service-role credentials.
4. Roll back the last QueueHub frontend change if the failure correlates with a release.

## Admin queue-command failure
1. Preserve the same command ID for retry.
2. Never create a new command ID merely because the response was lost.
3. Confirm authoritative queue status after retry.
4. Investigate rejected commands using Edge Function/Postgres logs.

## Gateway offline
1. Gateway keeps commands in local outbox.
2. Confirm local private key permissions and device key/key version.
3. Restore WAN, send heartbeat, then flush outbox.
4. If device is revoked, do not reactivate the old private key; rotate/register a new key through an authorized manager/admin.
5. Review `queuehub_gateway_dead_letters` for cloud-side processing rejection.

## Web Push
1. Confirm push watch exists and delivery job/outbox is progressing.
2. Remove permanently invalid subscriptions.
3. Browser/OS delivery is best effort; do not mark a queue command failed because a push notification was not displayed.

## Deployment rollback
Use the manual `QueueHub Rollback` GitHub Actions workflow with a known-good commit SHA. It validates QueueHub runtime tests before committing the restored `queuehub/` tree back to `main`.

## Database recovery
DDL is tracked as migrations. A real point-in-time/off-site restore drill requires a dedicated Supabase recovery/staging target and is not considered verified until that separate environment is provisioned and tested.
