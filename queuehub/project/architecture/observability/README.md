# Observability Architecture

## Active signals
- structured client runtime events
- diagnostics counters/gauges/timings
- public API latency/status
- Realtime connection/channel state
- reconnect/resync attempts and latency
- circuit-breaker open/half-open/closed transitions
- queue provider failure/degraded status
- Gateway heartbeat/stale state and open dead letters
- Push pending/dead-letter state
- command/QR/Push operational events

## Central backend
- `queuehub_runtime_telemetry` stores sanitized first-party operational events only.
- Browser telemetry is batched, rate-limited and sent through `queuehub-runtime-telemetry`.
- Session identifiers are random and SHA-256 hashed server-side.
- Event metadata has an explicit allowlist; ticket/order payload is not sent to broad telemetry.
- `queuehub_runtime_metrics_hourly` aggregates count/average/p95 duration.
- `queuehub_operational_health` aggregates Gateway, Push, stale queue status and recent telemetry health.
- `queuehub-ops-health` exposes the operational snapshot only to authorized manager/admin sessions.
- telemetry retention is 30 days and is cleaned by scheduled database maintenance.

## Privacy rule
Operational telemetry does not rely on third-party consumer tracking. Personal order contents are excluded from the telemetry contract.

## Current completion
Centralized operational metrics/health: ~92%.

## Remaining acceptance
- tune alert thresholds using real production traffic rather than synthetic/demo traffic
- optionally connect the first-party metrics contract to a dedicated external pager/dashboard if one is selected later
- full distributed tracing across third-party browser push infrastructure is outside QueueHub control
