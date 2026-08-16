# Phase 4 — Production Provider Architecture

## Runtime policy

QueueHub now separates runtime selection from business logic.

- `venueProvider: local | supabase`
- `visitorProvider: local` (production anonymous recovery can be added later)
- `adminAuthMode: demo | supabase`
- public venue reads may fail open to local demo data
- admin writes fail closed when production auth is enabled

## Provider flow

```text
Bootstrap
  -> QueueHubProviders
     -> LocalVenueProvider OR SupabaseVenueProvider
        -> State hydration
           -> existing Queries / Views
```

The public UI keeps its synchronous read model after startup hydration. This avoids rewriting every screen as async while still allowing the shared venue state to move server-side.

## Security boundary

Browser-safe configuration may contain only the Supabase project URL and publishable key. Service-role keys and vendor secrets must never be shipped to the browser.

Admin authorization is represented by `QueueHubAdminGuard` + `QueueHubRbac`. When `adminAuthMode` becomes `supabase`, queue mutation and integration configuration require an authenticated staff role. Actual production writes should be moved to authenticated Edge Functions rather than direct browser table updates.

## Next migration

1. Create isolated `queuehub_*` tables in the existing Supabase project.
2. Enable RLS and public SELECT only for venue / active restaurant / queue status.
3. Seed the demo venue without exposing secret material.
4. Enable Realtime on `queuehub_queue_status` after verification.
5. Configure runtime with project URL + publishable key and switch `venueProvider` to `supabase`.
6. Add staff membership + authenticated admin command Edge Function.
