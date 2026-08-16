# Phase 4 Runtime Status — 2026-08-16

## Live backend
- Supabase project: existing project in `ap-northeast-1`
- QueueHub tables: 7 isolated `queuehub_*` tables
- Venue seed: `beichen`
- Restaurants: 8
- Queue status rows: 8
- RLS: enabled on every QueueHub table
- Realtime publication: `queuehub_queue_status`
- Edge Function: `queuehub-admin-command`, ACTIVE, JWT required

## Browser runtime
- Venue provider: `supabase`
- Public provider failure policy: fallback to local demo
- Visitor/order state: local device repository
- Admin auth mode: `demo` until a specific staff account is assigned

## Security
- Browser contains only project URL + publishable key.
- No service-role key or vendor credential is stored in GitHub Pages.
- Privileged DB functions are executable by `service_role` only.
- Admin Edge Function verifies JWT at the gateway before forwarding an actor ID to the service-only RPC.

## Intentional limitation
Admin UI is still demo-local in this checkpoint. Do not claim that staff queue buttons persist to Supabase until Supabase Auth login + staff membership + remote command adapter are enabled.
