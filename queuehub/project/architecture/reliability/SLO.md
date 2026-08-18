# QueueHub Engineering SLOs

These are engineering targets, not a contractual SLA.

## Public read path
- Authoritative REST snapshot availability target: >= 99.9% per rolling 30 days, excluding planned upstream maintenance.
- REST latency target: p95 < 800 ms, p99 < 1,500 ms.
- Current verified baseline (2026-08-17, 100 VUs): p95 196.85 ms, p99 419.60 ms, 0% failures.

## Realtime
- Realtime join success target: > 99%.
- Join latency target: p95 < 3,000 ms, p99 < 5,000 ms.
- Reconnect recovery target: p95 < 5 seconds after network becomes usable.
- Current verified baseline: 100/100 joins; 50/50 reconnects; 0% errors.

## Queue writes
- Accepted authenticated/gateway commands must be idempotent under retry.
- Duplicate command ID must produce one logical queue event.
- Server-side command processing availability target: >= 99.9%, excluding authorization/validation rejection.

## Gateway
- Heartbeat expected every <= 60 seconds in normal operation.
- Gateway is `stale` after 2 minutes without heartbeat.
- WAN outage must retain commands in local outbox; replay uses the original idempotency key.

## Push
- Push dispatch is asynchronous/best effort. The service guarantees durable server outbox/retry semantics, not end-device delivery, because browser/OS push services are outside QueueHub control.

## Error budget use
Any sustained threshold breach should block feature rollout until the cause is understood. Capacity claims are promoted only with stored test evidence; 3,000 concurrent users remain NOT VERIFIED.
