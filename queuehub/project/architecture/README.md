# QueueHub System Architecture

Architecture v2 is now the active organization model. Historical phase documents remain as migration evidence, but new architecture work is grouped by runtime responsibility instead of chronological phase.

## Active architecture domains

1. `clients/` — Mobile Web, Mobile PWA, Desktop, Tablet Operator, Public Display, Kiosk, future Gateway Device.
2. `frontend/` — routing, state, commands, queries, providers, PWA shell.
3. `backend/` — public read, admin commands, secure QR, push, integrations.
4. `realtime/` — broadcast, reconnect, authoritative resync, stale detection.
5. `data/` — schema, migrations, RLS, indexes, retention, backup.
6. `auth/` — visitor, staff, RBAC, device authorization.
7. `network/` — normal online, weak network, offline, LAN/gateway.
8. `security/` — browser, DB, command, QR, push, device/gateway security.
9. `reliability/` — idempotency, retries, outbox, degraded mode, recovery.
10. `observability/` — logs, metrics, traces, lag, delivery health.
11. `deployment/` — dev/staging/production, CI/CD, migrations, rollback.
12. `scale/` — connection budgets, fanout, load testing, 3,000-user target.

See `ARCHITECTURE_V2.md` for dependency and migration rules.

## Client split

- `clients/mobile-web.md`
- `clients/mobile-pwa.md`
- `clients/desktop.md`
- `clients/tablet.md`
- `clients/public-display.md`
- `clients/kiosk.md`

Client-specific modules may depend on shared frontend/core services, but must not own database credentials, service-role secrets, production authorization, or vendor secrets.

## Core dependency direction

```text
Client / Device Adapter
        ↓
Frontend Commands + Queries
        ↓
Core Domain / Repositories / Providers
        ↓
Backend / Realtime / Data
```

## Current production capabilities retained during migration

- Supabase public read provider and Local fallback
- authoritative queue resync
- Supabase Broadcast realtime
- Admin JWT/RBAC remote commands
- idempotent queue command path
- secure QR issue/redeem/revoke
- Runtime Health
- PWA + service worker
- Web Push backend and partial browser subscription runtime

## Migration rule

Architecture v2 does not permit a big-bang rewrite. Each responsibility is mapped, moved/split, validated by Runtime CI and deployed before its old path can be removed.

Historical `PHASE*.md`, `CURRENT_RUNTIME.md`, and load-test documents are evidence and must not be treated as the active ownership map when they conflict with Architecture v2.
