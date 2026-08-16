# Data Architecture

## Core entities
- Venue
- Restaurant
- QueueSession
- QueueStatus
- QueueEvent
- Visitor/TrackedOrder (client-owned today)
- StaffMember/Role
- IntegrationConfig
- Secure QR Token hash vault
- PushDevice/PushWatch/PushDeliveryJob

## Principles
- PostgreSQL/Supabase is authoritative for shared venue/queue state.
- Queue identity is Restaurant + QueueSession + TicketNumber; ticket number alone is never globally unique.
- Mutable queue state and append-only/audit events remain distinct.
- Browser access is constrained by RLS and explicit grants.
- Secrets belong in Vault/server environment, not data rows exposed to clients.

## Current completion
Shared venue/queue schema ~95%; push/QR data ~85–95%; visitor cross-device persistence remains incomplete.
