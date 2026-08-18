# Kiosk Architecture

## Scope
Public touch kiosk or self-service information terminal used to find restaurants and inspect queue status.

## Implemented runtime
- explicit `?mode=kiosk` client profile; never inferred only from screen size
- route allowlist for venue home, restaurant detail and public board
- Admin, Integrations, My Orders and secure redeem routes denied
- personal tracked-order writes and notifications disabled
- local visitor persistence / cross-tab state broadcast disabled
- kiosk Admin Auth restoration fails closed
- inactivity reset returns to the kiosk home state
- touch-first presentation and large targets
- restaurant detail QR handoff to a personal phone
- Service Worker caches kiosk policy/presentation assets
- Kiosk policy behavior smoke is part of QueueHub Runtime CI

## Security rules
- no staff/admin routes exposed in kiosk mode
- no persistent staff credentials restored in kiosk mode
- no personal order persistence on the public terminal
- idle reset clears temporary navigation state
- kiosk is read-only with respect to queue mutations

## Current completion
Software/runtime implementation: ~90%.

## External acceptance remaining
- validate on the actual locked-browser / kiosk OS image
- accessibility testing with the target touch display and assistive hardware
- physical deployment policy such as OS auto-login, kiosk browser auto-start and device management

These require the actual kiosk hardware/OS and are not claimed as completed by browser CI.
