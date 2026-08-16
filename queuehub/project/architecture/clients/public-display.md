# Public Display Architecture

## Scope
Large shared screens in service areas, food courts, malls and event venues.

## Responsibilities
- read-only queue board
- multi-restaurant layout
- 1080p/4K long-distance readability
- automatic realtime reconnect/resync
- full-screen/kiosk browser behavior
- stale/offline/degraded status
- no consumer personal order data

## Reliability rules
- public display never sends queue commands
- display payload is public/read-only
- stale data must be visually identified rather than silently shown as current
- reconnect must use backoff/jitter to avoid venue-wide reconnect storms

## Current completion
Estimated 55%.

## Remaining
- dedicated 1080p/4K layout contracts
- watchdog/fullscreen recovery
- burn-in-safe motion strategy
- reconnect-storm controls
- emergency/venue message layer
