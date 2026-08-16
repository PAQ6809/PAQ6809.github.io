# Realtime Architecture

## Event path
Database queue change → Broadcast signal → client debounce/jitter → authoritative REST resync → state update.

## Design rule
Broadcast payload is a change signal, not trusted authoritative queue state. Clients resync from RLS-protected public read APIs.

## Responsibilities
- channel lifecycle
- reconnect/backoff/jitter
- stale detection
- authoritative resync
- version/sequence handling
- reconnect-storm protection
- degraded/fallback mode

## Current completion
Broadcast + authoritative resync about 90%; reconnect behavior about 75%; reconnect-storm protection about 35%.
