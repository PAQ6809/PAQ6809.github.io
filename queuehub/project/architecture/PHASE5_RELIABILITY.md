# Phase 5 — Reliability

## Queue command idempotency

Production queue mutations now require a browser-generated `commandId`. The Edge Function validates it and forwards it as `p_idempotency_key` to `queuehub_apply_queue_command_service_v2`.

The database implementation:
- authorizes the actor against `queuehub_staff_members`
- locks the restaurant queue row with `FOR UPDATE`
- checks the idempotency key after acquiring the lock
- returns `duplicate=true` for an already-committed command instead of mutating again
- rejects a key collision across a different actor or restaurant
- writes the command ID into `queuehub_queue_events.idempotency_key`

The browser implementation:
- generates one command ID before transport begins
- automatically retries at most once for a network failure or 5xx while preserving the same command ID
- refreshes the authoritative Supabase queue after an uncertain failure
- prevents a second live queue action for the same restaurant while one is in flight
- never retries a failed write by inventing a new command ID inside the same transport attempt

## Transactional verification — 2026-08-16

A rollback-only database test temporarily assigned an existing Auth user an admin role inside the transaction, called `next` twice using the same idempotency key, then rolled the entire transaction back.

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

## Edge Function

`queuehub-admin-command` version 2 is ACTIVE with JWT verification enabled. Queue requests require `commandId` and invoke the v2 service-only RPC. Requests carrying a browser Origin other than `https://paq6809.github.io` are rejected. Service-role credentials remain server-side only.

## Remaining reliability work

1. Deploy and verify the browser idempotency client checkpoint.
2. Remove the old service-only v1 queue RPC after the browser checkpoint is safely deployed.
3. Re-run QueueHub-specific security advisors.
4. Add stale-source / provider health UI and retry telemetry.
5. Test a deliberately assigned real staff account before switching Admin from Hybrid to strict Supabase mode.
