# QueueHub Production Baseline — 2026-08-16

These are measured results against the existing shared Supabase project. They are **not** a 3,000-concurrent-user certification.

## Environment

- Public frontend: GitHub Pages
- Backend: Supabase project in `ap-northeast-1`
- Organization plan at test time: Free
- Realtime plan connection quota at test time: 200 concurrent connections
- Test runner: GitHub Actions Ubuntu runner
- k6: `grafana/k6:2.1.0`

## Test 1 — Public REST recovery smoke

Workflow: `QueueHub Smoke` run #1

Profile:
- 5 VUs
- 25 seconds
- authoritative QueueHub REST snapshot endpoint

Measured:
- HTTP requests: 94
- HTTP failures: 0 / 94 (0.00%)
- checks: 188 / 188 passed
- HTTP duration avg: 384.85 ms
- HTTP p95: 705.49 ms
- HTTP p99: 781.56 ms
- queue snapshot latency avg: 375.24 ms
- queue snapshot p95: 702.79 ms
- max observed HTTP request: 1.37 s

Threshold result: PASS.

## Test 2 — Public Realtime channel smoke

Workflow: `QueueHub Smoke` run #1

Profile:
- 5 simultaneous WebSocket clients
- one connection per VU
- 20-second sessions

Measured:
- WebSocket handshake: 5 / 5 passed
- Realtime `phx_join`: 5 / 5 passed (100%)
- Realtime errors: 0%
- WebSocket connect p95: 88.51 ms
- channel join p95: 1.84 s
- WebSocket sessions: 5

Threshold result: PASS.

After this test Supabase created the managed `realtime.messages` partitions for 2026-08-16 and adjacent dates, confirming a real Realtime client connection reached the service.

## Test 3 — DB trigger → Broadcast → client E2E

Workflow: `QueueHub Broadcast E2E` run #1

An authorized SQL test updated only the `updated_at` field of `harbor-noodles`; the queue number, state and version were deliberately left unchanged. This fired the real production QueueHub database trigger.

Profile:
- 5 simultaneous public Realtime listeners
- 40-second sessions
- `EXPECT_BROADCAST=1`

Measured:
- DB-triggered queue broadcast received: 5 / 5 (100%)
- Realtime join success: 5 / 5 (100%)
- Realtime errors: 0%
- channel join average: 200 ms
- channel join p95: 226.2 ms
- WebSocket connect p95: 189.79 ms
- received WebSocket messages: 15

Threshold result: PASS.

This verifies the actual chain:

```text
queuehub_queue_status UPDATE
  -> queuehub_broadcast_queue_status trigger
  -> realtime.send(public queue_status broadcast)
  -> Supabase Realtime
  -> public WebSocket listeners
```

## Capacity boundary

The current Supabase organization is on Free plan, so QueueHub must not claim or test 3,000 concurrent Realtime connections on this project. The repository contains a hard-gated `target-3000` profile for a future approved staging target with sufficient quota.

Safe profiles currently available:
- `smoke`: 5 clients
- `free-safe`: 150 Realtime clients, deliberately below the 200-connection plan ceiling
- `target-3000`: locked unless an explicit environment gate is provided

## What this baseline proves

Proven:
- public Supabase REST path works from an external runner
- public Realtime WebSocket handshake and Phoenix channel join work
- QueueHub database trigger emits a Broadcast event that real clients receive
- the production read/realtime path has a repeatable CI smoke test

Not yet proven:
- 150-client sustained Realtime behavior
- multi-region latency
- 3,000 concurrent users
- live authenticated staff write flow, because no QueueHub staff membership has been deliberately assigned yet
- vendor POS/API integration
