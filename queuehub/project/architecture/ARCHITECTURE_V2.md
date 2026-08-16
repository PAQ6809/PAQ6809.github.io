# QueueHub Architecture v2

Architecture v2 replaces the old phase-centric organization with runtime responsibility domains.

## Top-level domains

1. `clients/` — device/client-specific runtime architecture.
2. `frontend/` — shared browser application architecture.
3. `backend/` — server-side read, command, QR, push, and integration services.
4. `realtime/` — event transport, reconnect, authoritative resync.
5. `data/` — PostgreSQL/Supabase schema, retention, indexes, RLS.
6. `auth/` — anonymous visitor, staff auth, RBAC, device auth.
7. `network/` — online, weak-network, offline, LAN/Gateway modes.
8. `security/` — browser, database, command, push, gateway security.
9. `reliability/` — idempotency, retry, outbox, degraded mode, recovery.
10. `observability/` — logs, metrics, tracing, delivery and event lag.
11. `deployment/` — environments, CI/CD, migration, rollback.
12. `scale/` — connection budgets, fanout, load-test stages, 3,000-user target.

## Client domains

- Mobile Web
- Mobile PWA
- Desktop Web
- Tablet Operator
- Public Display
- Kiosk
- Gateway Device

Client domains may use shared frontend/core services but must not own backend business rules.

## Dependency rule

```text
Client UI / Device Adapter
        ↓
Frontend Commands + Queries
        ↓
Core Domain / Repositories / Providers
        ↓
Backend APIs / Realtime / Data
```

No client-specific module may directly own database credentials, service-role secrets, vendor secrets, or production command authorization.

## Current baseline

Production runtime already includes Supabase public reads, authoritative resync, Broadcast realtime, admin JWT/RBAC, idempotent queue commands, secure QR issue/redeem/revoke, runtime health, PWA, and partial Web Push. Architecture v2 does not remove these capabilities; it reorganizes ownership and migration boundaries around them.

## Migration principle

1. Document responsibility first.
2. Map current files to target domains.
3. Move or split only one responsibility set at a time.
4. Preserve runtime behavior.
5. Require Runtime CI and Pages deploy success before deleting legacy paths.
