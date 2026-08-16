# Phase 2 Runtime Decomposition

## Completed

Core/User monolith and Admin monolith have been decomposed into responsibility-specific classic-script modules while preserving the existing browser runtime model and `queuehub-v3` local storage schema.

## Runtime load order

```text
config
→ state
→ router
→ queue domain
→ shared UI
→ notifications
→ user features
→ PWA
→ bootstrap
→ admin state / services / views / route bridge
→ presentation overrides
```

## Why classic scripts are kept for now

The current UI override layer reassigns shared render functions. Keeping classic scripts during this phase minimizes behavior changes while business logic is separated. The next cleanup can introduce explicit module boundaries or a bundler after the responsibilities are stable.

## Invariants preserved

- Storage key remains `queuehub-v3`.
- BroadcastChannel remains `queuehub-v3`.
- Existing tracked orders remain readable.
- Hash routes remain unchanged.
- QR deep links remain unchanged.
- Existing Admin and User presentation overrides remain compatible.
- Service Worker remains rooted at `/queuehub/sw.js`.

## Next boundary

Replace direct global state access with provider/repository contracts before wiring Supabase Realtime.
