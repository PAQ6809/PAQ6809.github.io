# Kiosk Architecture

## Scope
Public touch kiosk or self-service information terminal used to find restaurants and inspect queue status.

## Responsibilities
- touch-only navigation
- restaurant search and queue lookup
- optional QR handoff to personal phone
- session auto-reset after inactivity
- no persistent personal order state after reset
- accessibility and large-target interaction

## Security rules
- no staff/admin routes exposed in kiosk mode
- no persistent credentials
- idle reset clears temporary user state
- production writes are disabled

## Current completion
Estimated 20%.

## Remaining
- dedicated kiosk runtime mode
- idle/session reset controller
- QR handoff flow
- locked-browser deployment profile
- accessibility and hardware validation
