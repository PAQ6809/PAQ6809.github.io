# Frontend Architecture

## Purpose
Shared browser application architecture used by all clients. Client-specific layouts must not duplicate business rules.

## Modules
- `routing` — route parsing, deep links, sensitive-route sanitization.
- `state` — visitor, venue, UI, admin and runtime-health state boundaries.
- `commands` — order, queue and integration mutations.
- `queries` — read model and derived views.
- `repositories` — visitor/venue persistence boundaries.
- `providers` — local, Supabase, realtime and future adapter providers.
- `notifications` — foreground notification and Web Push subscription coordination.
- `pwa` — registration, cache/update lifecycle.

## Dependency rule
Views call Commands/Queries. Views must not mutate repositories directly. Repositories must not depend on device-specific UI.

## Current completion
Estimated 90% for core boundaries; lower for complete legacy-view removal.

## Migration target
Current `src/core` largely maps here. `src/user` and `src/admin` remain client/interface adapters and should progressively stop owning shared state/business logic.
