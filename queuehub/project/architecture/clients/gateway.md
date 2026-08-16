# Gateway Device Architecture

## Scope
Future local agent/device bridging legacy POS, queue controller, serial/LAN equipment, or vendor-local APIs into QueueHub.

## Responsibilities
- local vendor/device protocol adapter
- normalized queue event production
- local buffering during WAN outage
- authenticated upstream sync
- scoped device identity
- retry/idempotency
- health/heartbeat

## Security target
- unique device credential
- venue/restaurant scope
- credential rotation/revoke
- signed/authenticated upstream requests
- no broad service-role credential on device
- encrypted local secret storage

## Network target
POS/device → Local Gateway → QueueHub cloud; optional Local LAN display/tablet fallback during WAN outage.

## Current completion
~10%. Architecture only; no production gateway agent yet.
