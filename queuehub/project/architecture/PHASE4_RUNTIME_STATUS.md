# Phase 4 Runtime Status — 2026-08-16

## Live backend
- Supabase venue/public queue read: enabled with local fallback.
- QueueHub tables: 7 isolated `queuehub_*` tables.
- Venue seed: `beichen`; restaurants: 8; queue status rows: 8.
- RLS enabled on every QueueHub table.
- Edge Function `queuehub-admin-command`: ACTIVE, JWT required.

## Realtime
- Queue status UPDATE/INSERT has a database trigger calling public `realtime.send` on topic `queuehub:venue:<venue_uuid>:queue`.
- Browser uses pinned `@supabase/supabase-js@2.111.0` Broadcast client.
- Broadcast payload is intentionally treated as untrusted invalidation only. It never directly changes the displayed number.
- After an event, clients coalesce/throttle with jitter and re-fetch the authoritative Supabase venue snapshot; reconnect/visibility/online also resync.
- The old `queuehub_queue_status` Postgres Changes publication was removed.
- Supabase creates `realtime.messages` daily partitions when the first WebSocket client connects. A missing partition before any client connects is documented platform behavior, not a reason to hand-edit the managed realtime schema.

## Admin checkpoint
- Browser Auth provider supports password sign-in, refresh, session restore and local-scope sign-out.
- Auth tokens are kept in `sessionStorage`.
- Staff role is loaded from `queuehub_staff_members` for the current venue.
- A signed-in user with a QueueHub role uses the JWT Edge Function for queue/integration writes.
- Without a QueueHub role, Hybrid mode stays Demo Local; no existing Auth user has been auto-promoted.

## Remaining
1. Deliberately assign one existing Auth user to a QueueHub staff role.
2. Verify live staff login + remote write, then switch `adminAuthMode` from `hybrid` to `supabase`.
3. Verify browser WebSocket subscription from a real client and observe Realtime partition creation.
4. Run staged load tests before claiming 3,000 concurrent capacity. Public Broadcast is more scalable than Postgres Changes, but this application still adds authoritative REST resyncs and must be benchmarked as a whole.
