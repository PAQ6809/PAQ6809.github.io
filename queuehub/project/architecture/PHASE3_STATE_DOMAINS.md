# Phase 3 — State Domain Separation

QueueHub now has two logical repository domains while retaining the existing `queuehub-v3` browser payload for backward compatibility.

## Visitor domain
`QueueHubVisitorRepository`
- visitor session
- tracked orders
- completion/removal
- notification preference
- last route

This state is user/device scoped and can remain local/session-bound in production.

## Venue domain
`QueueHubVenueRepository`
- restaurants
- queue state
- QueueEvents
- integration configuration

This state is shared across visitors and should move to a server-authoritative production backend.

## Why logical separation first
Changing the physical localStorage schema now would risk losing existing demo orders. The repository boundary lets the runtime preserve the current payload while preparing two independent production data sources.

## Production direction
```text
VisitorRepository → local/session cache + secure anonymous session
VenueRepository   → Supabase/Postgres + Realtime
Admin commands    → authenticated server/Edge Function only
```

Next: define production provider contracts and environment configuration without provisioning a paid/external backend yet.
