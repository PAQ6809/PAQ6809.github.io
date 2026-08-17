# QueueHub Capacity Verification Baseline

## Rule
Capacity claims are evidence-based. A configured k6 profile is not a verified capacity result.

## Current production constraint
The current shared Supabase project is on a Free plan with a Realtime concurrent-connection quota below the QueueHub 3,000-user target. Production testing therefore stops well below the quota and leaves headroom for normal traffic.

## Verification ladder
1. 5-client protocol smoke — completed previously.
2. 100-VU authoritative REST recovery baseline — running.
3. 100 concurrent Realtime connection baseline — running after REST.
4. 50-client disconnect/jitter/reconnect storm baseline — running after Realtime baseline.
5. 150-connection free-safe profile — available but not part of the default production baseline.
6. 500 / 1,000 / 3,000 — staging-only after quota and target approval.

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

## 3,000-user claim
Status: NOT VERIFIED.

The `target-3000` profiles remain hard-gated. They must not run against the current shared Free-plan project. Verification requires an approved staging/production target with sufficient Realtime quota plus database, Edge Function and network observability during the run.

## Evidence
Results from each approved run should record:
- GitHub Actions run ID
- exact commit SHA
- profile and VU/connection count
- p50/p95/p99 where available
- error/join success rates
- quota/plan context
- whether the run tested steady-state, broadcast delivery, or reconnect storm
