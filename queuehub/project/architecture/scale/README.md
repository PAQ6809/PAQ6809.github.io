# Scale Architecture

## Product target
- 3,000 concurrent venue users
- 50–100 restaurants per large venue target
- up to 10 tracked orders per visitor

## Scale controls
- realtime broadcast fanout rather than per-client polling
- authoritative resync with debounce/jitter
- DB indexes and bounded public read payloads
- reconnect backoff/jitter
- push outbox and retry
- load-test profiles and staged capacity verification

## Verification stages
10 → 50 → 100 → free-plan-safe ceiling → 500 → 1,000 → 3,000 concurrent.

## Important limitation
3,000 concurrent is an engineering target, not a current verified production claim. Current Supabase plan/quota constrains full-scale Realtime validation.

## Current completion
Architecture ~65%; 3,000-user production proof ~10–15%.
