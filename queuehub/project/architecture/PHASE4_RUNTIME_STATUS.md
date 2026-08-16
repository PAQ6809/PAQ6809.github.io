# Phase 4 Runtime Status — 2026-08-16

## Live backend
- Supabase venue/public queue read: enabled with local fallback.
- QueueHub tables: 7 isolated `queuehub_*` tables.
- Venue seed: `beichen`; restaurants: 8; queue status rows: 8.
- RLS enabled on every QueueHub table.
- `queuehub_queue_status` is in Realtime publication (browser Realtime subscription is a later checkpoint).
- Edge Function `queuehub-admin-command`: ACTIVE, JWT required.

## Admin checkpoint
- Browser Auth provider supports password sign-in, refresh, session restore and local-scope sign-out.
- Auth tokens are kept in `sessionStorage`, not in the QueueHub local venue/order payload.
- Staff role is loaded from `queuehub_staff_members` for the current venue.
- When a signed-in user has a QueueHub role, queue/integration actions use the JWT Edge Function and service-role-only RPC.
- Without a QueueHub role, Hybrid mode stays Demo Local; it does not grant production writes.
- No existing Supabase user has been auto-promoted to QueueHub staff.

## Security boundary
- Browser contains only Supabase URL + publishable key.
- Service role and vendor credentials remain server-side.
- Service-only RPCs independently validate actor membership and role.
- QueueHub-specific Security Advisor findings from the initial RPC version were removed.

## Remaining
1. Assign one explicit existing Auth user to a QueueHub staff role (only after identity is deliberately selected).
2. Switch `adminAuthMode` from `hybrid` to `supabase` after live staff login is verified.
3. Add browser Realtime subscription/resync for cross-device queue updates.
4. Run staged load tests before claiming 3,000 concurrent capacity.
