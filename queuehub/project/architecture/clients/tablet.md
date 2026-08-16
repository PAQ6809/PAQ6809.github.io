# Tablet Operator Architecture

## Scope
Restaurant counter and venue-operations tablets, primarily touch-first landscape devices.

## Responsibilities
- persistent operator session
- large touch targets and queue controls
- restaurant selection/search
- next/skip/pause/resume/manual correction
- safe confirmation for destructive/high-delta actions
- QR issuance/revocation
- local device identity and reconnect state

## Production rules
- production queue writes only through authenticated RBAC remote commands
- same-restaurant in-flight action lock
- command idempotency key required
- authoritative resync after write/error
- no vendor/service secrets stored in UI

## Current completion
Estimated 60%.

## Remaining
- dedicated tablet layout instead of shared desktop admin layout
- kiosk/lock mode
- device authorization and revocation
- weak-network operator mode
- offline/LAN gateway fallback
