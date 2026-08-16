# QueueHub Current Runtime — Architecture v2

This file describes the active production-oriented runtime after the Architecture v2 reorganization.

```text
Client Profile / Device Adapter
        ↓
Consumer / Admin Views
        ↓
Commands + Queries
        ↓
VisitorRepository | VenueRepository
        ↓
StateRepository + Provider Registry
        ↓
Supabase Read / Realtime / Edge Functions / Local Fallback
```

## Active client architecture
- Runtime capability profile: `src/clients/runtime-profile.js`
- Public Display implementation: `src/clients/public-display/board.js`
- Mobile Web: existing consumer views + shared core; dedicated adapter migration pending
- Mobile PWA: root `sw.js` + manifest + PushManager runtime; dedicated device-lifecycle split pending
- Desktop: current consumer/admin layouts; dedicated desktop adapter pending
- Tablet: current Admin console reused; dedicated touch/operator adapter pending
- Kiosk: architecture only
- Gateway Device: architecture only

## Shared frontend/core
- Router and sensitive-route handling
- Commands: order, queue, integrations
- Queries/Read Model
- Visitor and Venue repositories
- Local/Supabase provider registry
- authoritative resync
- runtime health

## Production backend already present
- Supabase public venue/queue reads
- Supabase Broadcast realtime
- Admin JWT/RBAC remote commands
- idempotent production queue writes
- secure order QR issue/redeem/revoke
- Push subscription/delivery backend and outbox/retry architecture

## Platform runtime
- GitHub Pages static client deployment
- root Service Worker retained for QueueHub scope
- PWA manifest/icons
- Runtime CI for JavaScript syntax and local assets

## Current migration status
Architecture v2 documentation and responsibility map are active. Public Display is the first physical client migration. Remaining work is incremental: mobile/PWA lifecycle split, desktop/tablet presentation split, legacy view removal, reconnect-storm controls, observability, capacity validation, and vendor gateway/integration adapters.

## Non-claims
- 3,000 concurrent users remains an engineering target, not a currently verified production capacity claim.
- Kiosk/Gateway are not production implementations yet.
- Full real-device Web Push E2E is still pending.
