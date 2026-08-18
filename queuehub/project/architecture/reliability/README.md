# Reliability Architecture

## Active controls
- idempotent production queue commands
- in-flight client command locks
- retry with the same command ID
- authoritative resync after error
- centralized Realtime reconnect controller with exponential backoff, jitter and coalescing
- 50-client reconnect-storm verification
- public REST circuit breaker with half-open recovery
- push outbox + lease + bounded retry
- Push dead-letter after 8 failed attempts with exponential backoff
- Gateway local outbox + retry plus cloud dead-letter
- invalid push-subscription cleanup
- degraded/fallback runtime health state
- first-party runtime telemetry and operational health aggregation
- automatic data lifecycle maintenance via `pg_cron`
- manual-trigger, validation-first GitHub rollback workflow
- failure-mode runbook (`RUNBOOK.md`)
- engineering SLOs (`SLO.md`)

## Recovery model
Frontend/runtime rollback is automated through the `QueueHub Rollback` workflow and only restores the `queuehub/` tree after behavior tests pass. Database changes are tracked as additive migrations and service functions are mirrored in the repository.

## Current completion
Software reliability controls: ~96%.

## External recovery acceptance remaining
- a real point-in-time / off-site database restore drill against a separate Supabase recovery or staging project
- production incident exercise with the real kiosk/gateway hardware

Those require a separate recovery target and/or physical devices. They are intentionally not represented as completed by unit/smoke tests.
