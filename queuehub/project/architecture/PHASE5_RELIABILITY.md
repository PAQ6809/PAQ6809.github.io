# Phase 5 — Reliability

## Queue command idempotency — DEPLOYED

Production queue mutations require a browser-generated `commandId`. The Edge Function validates it and forwards it as `p_idempotency_key` to `queuehub_apply_queue_command_service_v2`.

Database guarantees:
- actor authorization against `queuehub_staff_members`
- per-restaurant row serialization with `FOR UPDATE`
- idempotency check after the lock is acquired
- duplicate request returns `duplicate=true` without a second mutation
- key collision across a different actor or restaurant is rejected
- `commandId` is persisted in `queuehub_queue_events.idempotency_key`

Browser guarantees:
- one command ID is generated before transport begins
- network/5xx transport retries at most once with the same command ID
- live queue controls are locked per restaurant while a command is in flight
- an uncertain failure triggers authoritative Supabase resync before another action is allowed
- successful duplicate responses are surfaced as confirmed, not executed again

## Transactional verification — PASS

A rollback-only database test temporarily assigned an existing Auth user an admin role inside the transaction, called `next` twice using the same idempotency key, then rolled back the entire transaction.

Observed inside the transaction:
- before number: 152
- after number: 153
- net increment: 1
- first call: `duplicate=false`
- second call: `duplicate=true`
- first version: 2
- second version: 2
- final in-transaction version: 2

After rollback, production remained unchanged at number 152 / version 1 and no test staff membership persisted.

## Edge Function — v2 ACTIVE

`queuehub-admin-command` version 2 is ACTIVE with JWT verification enabled. Queue requests require `commandId` and invoke the v2 service-only RPC. Requests carrying a browser Origin other than `https://paq6809.github.io` are rejected. Service-role credentials remain server-side only.

## Legacy path removal — COMPLETE

After the idempotent browser client was deployed successfully on GitHub Pages run #612:
- legacy `queuehub_apply_queue_command_service(uuid,uuid,text,integer)` was dropped
- only `queuehub_apply_queue_command_service_v2(...)` remains for queue writes
- v2 ACL: `postgres` + `service_role`
- Broadcast trigger function direct-execute ACL: `postgres` only

## Advisor verification

QueueHub-specific Security Advisor warnings were cleared after revoking direct execution of the SECURITY DEFINER broadcast trigger function. Remaining security/performance notices in the shared project belong to other applications or project-wide Auth configuration.

Performance Advisor currently reports QueueHub indexes as unused INFO entries. They are newly created / low-traffic and include FK/query support indexes, so they are intentionally retained until meaningful production statistics exist.

## Remaining reliability work

1. Add stale-source / provider health UI and lightweight retry telemetry.
2. Test a deliberately assigned real staff account before switching Admin from Hybrid to strict Supabase mode.
3. Add server-verified signed/opaque order QR redemption.
4. Add Web Push subscription/delivery for browser-closed notifications.
5. Stage a 25–50 connection sustained test before considering the 150-connection Free-plan-safe profile.
6. 3,000 concurrent verification requires a separate approved target with sufficient Supabase quota.
