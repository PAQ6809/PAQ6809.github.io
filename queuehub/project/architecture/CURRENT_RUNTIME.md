# QueueHub Current Runtime

Current architecture checkpoint after Phase 3 state-domain separation.

```text
Browser UI
  ↓
User / Admin adapters
  ↓
Commands + Read Model
  ↓
VisitorRepository | VenueRepository
  ↓
StateRepository
  ↓
Storage Provider | Realtime Provider
```

## Current providers
- Storage: LocalStorage (`queuehub-v3`)
- Realtime: BroadcastChannel (`queuehub-v3`)

## Current logical domains
- Visitor: session, tracked orders, notification preference, last route.
- Venue: restaurants, queue state, QueueEvents, integration configuration.

## Production boundary still pending
- Supabase/Postgres shared venue state.
- Supabase Realtime or equivalent shared transport.
- Auth/RBAC for Admin commands.
- Server-side integration adapters.
- Real Web Push backend.
- Load-test validation up to the 3,000-user engineering target.

This checkpoint intentionally does not provision or claim a production backend.
