# Data Architecture

## Core entities
- Venue
- Restaurant
- QueueSession
- QueueStatus
- QueueEvent
- VisitorSession / TrackedOrder
- StaffMember / Role
- IntegrationConfig
- GatewayDevice / GatewayNonce / GatewayDeadLetter
- Secure QR Token hash vault
- PushDevice / PushWatch / PushDeliveryJob
- RuntimeTelemetry / TelemetryRate

## Principles
- PostgreSQL/Supabase is authoritative for shared venue/queue state.
- Queue identity is Restaurant + QueueSession + TicketNumber; ticket number alone is never globally unique.
- Mutable queue state and append-only/audit events remain distinct.
- Browser access is constrained by RLS and explicit grants.
- private operational tables use explicit restrictive deny policies for anon/authenticated roles and service-only access behind Edge Functions.
- secrets belong in Vault/server environment; Gateway cloud storage contains only public keys.

## Cross-device visitor persistence
- `queuehub_visitor_sessions` stores only a SHA-256 sync-token hash, expiry and revoke state.
- `queuehub_tracked_orders` stores at most the server contract's 10 order records per sync batch and references authoritative Restaurant/QueueSession UUIDs.
- `queuehub-visitor-sync` issues a 256-bit opaque token and is the only public browser boundary for create/pull/push/revoke.
- frontend `QueueHubVisitorCloudSync` provides create/import/export/push/pull/revoke contracts without changing the frozen consumer UI.
- server-side create/push/pull behavior was smoke-tested and test data removed.

## Data lifecycle
Daily `pg_cron` maintenance removes expired nonces, 30-day telemetry, resolved dead letters and expired/revoked visitor sessions. Push completed/dead-letter jobs are retained for 30 days before cleanup.

## Current completion
Shared data/runtime capability: ~97%.

## Remaining product UX
The secure mechanism for handing a visitor sync token from one physical device to another is deliberately not placed in a URL and has no visible UI while UI/UX is frozen. The backend/client capability is present; a future authenticated or explicit transfer UX can consume it.
