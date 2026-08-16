# Network Architecture

## Modes
1. Normal Online — browser/PWA → GitHub Pages + Supabase.
2. Weak Network — timeout, stale-last-known data, bounded retry, explicit degraded state.
3. Offline — PWA shell + last-known state; never pretend cached queue state is live.
4. Local LAN/Gateway — future POS/local gateway path for venue operation during WAN outage.

## Rules
- Stale data is visibly marked.
- Reconnect uses backoff/jitter.
- Realtime reconnect does not immediately cause every client to refetch simultaneously.
- Consumer read path may fail open to last-known/local state; production staff write path fails closed if authorization/authoritative backend is unavailable.

## Current completion
Online ~90%, weak-network ~65%, offline ~55%, LAN/Gateway ~10%.
