# Phase 3 Provider, Command and Query Boundaries

## Completed

### Provider boundary
- `QueueHubStorage`: persistence transport.
- `QueueHubRealtime`: realtime transport.

### Repository boundary
- `QueueHubStateRepository`: central mutation/persistence boundary.

### Command boundary
- `QueueHubOrderCommands`
- `QueueHubQueueCommands`
- `QueueHubIntegrationCommands`

### Query / Read Model boundary
`QueueHubQueries` centralizes reads for restaurants, visitor state, active/ordered orders, integrations and QueueEvents. Base User views now consume the Read Model instead of traversing the full state object directly.

## Compatibility
Storage/channel names, hash routes, QR links and presentation override callbacks remain unchanged.

## Remaining direct state reads
Some v4/v5 presentation override scripts still read state directly. They are intentionally isolated under `legacy/` and will be removed during the UI component consolidation phase; domain writes are already command-controlled.

## Next architecture boundary
Separate local visitor/order state from shared venue/queue state, then introduce a production provider contract for Supabase without exposing Admin writes directly to the browser.
