# Phase 5 — Runtime Health and Local Diagnostics

QueueHub now exposes local-only runtime health state without adding third-party analytics.

## Consumer behavior

No banner is shown while the runtime is healthy. A compact banner appears only for:
- browser offline state
- production provider fallback to local demo data
- production provider load/error state
- Realtime `channel_error`, `timed_out`, `closed`, SDK unavailable or resync error
- production snapshot older than three minutes while Realtime is not subscribed

A degraded state can expose a `重新同步` action. Manual recovery re-fetches the authoritative venue snapshot and restarts Realtime when needed.

## Diagnostics

`QueueHubDiagnostics.snapshot()` returns current-tab diagnostics only:
- provider attempt/success/error/fallback counts
- provider refresh count
- Realtime status transitions
- Broadcast received count
- resync scheduled/coalesced/success/error counts
- admin command retry/success/duplicate/error counts
- recent timestamped event categories

No email, password, access token, service-role secret, order token or third-party analytics payload is recorded.

## UI safety

The health banner owns only `#runtimeHealthSlot`, so a Realtime status change does not rerender the search field or staff forms. Full app rerender occurs only after an explicit successful/manual authoritative resync or normal application state change.
