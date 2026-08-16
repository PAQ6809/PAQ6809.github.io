# Reliability Architecture

## Controls
- idempotent production queue commands
- in-flight client command locks
- retry with same command ID
- authoritative resync after error
- push outbox + lease + retry
- invalid subscription cleanup
- degraded/fallback status
- runtime health diagnostics

## Required next controls
- reconnect-storm protection
- dead-letter handling
- explicit circuit breaker policies
- backup/restore drills
- failure-mode runbooks
- SLO/SLA targets

## Current completion
Idempotency 100%, retry/outbox 85–90%, health ~70%, dead-letter/recovery/SLO incomplete.
