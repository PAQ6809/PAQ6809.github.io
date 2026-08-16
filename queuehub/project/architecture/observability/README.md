# Observability Architecture

## Signals
- structured runtime logs
- client diagnostics counters
- API latency/error rate
- realtime connection/channel status
- authoritative resync latency/failure
- queue event lag
- push delivery attempts/results
- command idempotency/retry outcomes

## Privacy rule
Operational telemetry must not require third-party consumer tracking. Personal order data should be minimized and not emitted into broad logs.

## Current completion
Basic runtime diagnostics exist; complete centralized metrics/traces/dashboarding remains incomplete (~45–55%).
