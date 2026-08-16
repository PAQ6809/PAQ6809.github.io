# Phase 3 Provider and Command Boundaries

## Completed boundaries

### Storage
`QueueHubStorage` hides LocalStorage access.

### Realtime
`QueueHubRealtime` hides BroadcastChannel access.

### State repository
`QueueHubStateRepository` centralizes persistence, optional notification transition checks, and render-after-mutation behavior.

### Commands
- `QueueHubOrderCommands`: track / complete / remove order.
- `QueueHubQueueCommands`: next / skip / pause-resume / set queue number.
- `QueueHubIntegrationCommands`: persist per-restaurant integration config.

UI callback names are preserved as thin adapters for compatibility with current presentation scripts, but they no longer perform domain-state writes directly.

## Preserved invariants
- Storage key: `queuehub-v3`
- Realtime channel: `queuehub-v3`
- Existing tracked orders remain readable.
- Hash routes and QR deep links remain unchanged.

## Next
1. Replace global read access with query/repository APIs.
2. Separate visitor/order state from shared venue/queue state.
3. Add production provider contract for Supabase.
4. Add auth/RBAC boundary before enabling remote Admin mutations.
