# Phase 3 Provider Boundary

## Goal

Remove direct browser persistence and realtime transport details from application state so the same User/Admin runtime can later run on Local demo providers or Supabase production providers.

## Current providers

```text
QueueHubStorage
└─ LocalStorage provider

QueueHubRealtime
└─ BroadcastChannel provider
```

`local-state.js` now depends on the provider contracts rather than directly calling `localStorage` or constructing `BroadcastChannel`.

## Preserved behavior

- Storage key remains `queuehub-v3`.
- Channel name remains `queuehub-v3`.
- Existing local orders remain readable.
- Same-browser tab sync remains available.
- User/Admin code does not need to know which storage or realtime transport is active.

## Production replacement path

```text
LocalStorageProvider      → SupabaseRepository / session cache
BroadcastProvider        → Supabase Realtime / WebSocket transport
```

The next step is to isolate mutations behind repository/command APIs so `state` is no longer written directly across User/Admin modules.
