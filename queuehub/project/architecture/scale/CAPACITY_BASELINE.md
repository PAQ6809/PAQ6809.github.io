# QueueHub Capacity Verification Baseline

## Rule
Capacity claims are evidence-based. A configured k6 profile is not a verified capacity result.

## Current production constraint
The current shared Supabase project is on a Free plan with a Realtime concurrent-connection quota below the QueueHub 3,000-user target. Production testing therefore stops well below the quota and leaves headroom for normal traffic.

## Verification ladder
1. 5-client protocol smoke — completed previously.
2. 100-VU authoritative REST recovery baseline — PASS.
3. 100 concurrent Realtime connection baseline — PASS.
4. 50-client disconnect/jitter/reconnect storm baseline — PASS.
5. 150-connection free-safe profile — available but not part of the default production baseline.
6. 500 / 1,000 / 3,000 — staging-only after quota and target approval.

## Verified baseline — 2026-08-17
GitHub Actions run: `32005625037`
Commit under test: `aea8bf92f4e10e49ee1a2ae1e81cfef8eb3263e7`
Result: PASS for all three baseline stages.

### REST authoritative recovery — 100 VUs
- requests: 1,072
- checks: 2,144 / 2,144 passed
- request failures: 0.00%
- QueueHub logical errors: 0.00%
- HTTP average: 146.01 ms
- HTTP p95: 196.85 ms
- HTTP p99: 419.60 ms
- authoritative queue snapshot average: 147.20 ms
- authoritative queue snapshot p95: 197.50 ms
- max observed HTTP/queue snapshot: 1.51 s

### Realtime steady connections — 100 concurrent clients
- WebSocket sessions: 100
- join success: 100 / 100 (100.00%)
- Realtime errors: 0.00%
- join average: 291.77 ms
- join p95: 299.20 ms
- join p99: 417.88 ms
- WebSocket connect average: 255.69 ms
- WebSocket connect p95: 264.55 ms
- connection hold: approximately 45 s per client
- one long-tail join/connect sample reached about 5.1 s, while p95/p99 remained inside thresholds

### Reconnect storm — 50 clients
Each client performed initial connect -> disconnect -> randomized jitter -> second connect.
- initial joins: 50 / 50 (100.00%)
- second joins: 50 / 50 (100.00%)
- reconnect errors: 0.00%
- initial join average: 211.04 ms
- initial join p95: 252.30 ms
- initial join p99: 333.39 ms
- second join average: 205.80 ms
- second join p95: 208.10 ms
- second join p99: 789.33 ms
- WebSocket connect p95 across reconnect test: 210.76 ms

## Current thresholds
### REST
- failed requests < 1%
- QueueHub logical errors < 1%
- HTTP p95 < 800 ms
- HTTP p99 < 1,500 ms
- authoritative queue snapshot p95 < 800 ms

### Realtime join
- join success > 99%
- Realtime errors < 1%
- join p95 < 3,000 ms
- join p99 < 5,000 ms
- WebSocket connect p95 < 3,000 ms

### Reconnect storm
- initial join success > 99%
- second join success > 99%
- reconnect errors < 1%
- initial and second join p95 < 3,000 ms
- initial and second join p99 < 5,000 ms

## Current verified claim
QueueHub has been verified at the current production target for:
- 100 concurrent Realtime clients
- 100-VU authoritative REST recovery traffic
- a 50-client reconnect storm with successful second joins

This evidence is not a linear proof for 500, 1,000 or 3,000 users.

## 3,000-user claim
Status: NOT VERIFIED.

The `target-3000` profiles remain hard-gated. They must not run against the current shared Free-plan project. Verification requires an approved staging/production target with sufficient Realtime quota plus database, Edge Function and network observability during the run.

## Evidence requirements for future tiers
Results from each approved run must record:
- GitHub Actions run ID
- exact commit SHA
- profile and VU/connection count
- p50/p95/p99 where available
- error/join success rates
- quota/plan context
- whether the run tested steady-state, broadcast delivery, or reconnect storm
