# Security Architecture

## Browser Security
- no service-role/vendor secrets
- sensitive QR tokens removed from route/history after redemption
- same-origin notification/deep-link targets
- input validation and bounded local state

## Database Security
- RLS and explicit grants
- service-only command/token/push RPCs
- security-definer functions not executable by anon/authenticated unless explicitly required

## Command Security
- JWT + server-side RBAC
- idempotency key
- row/version locking
- authoritative response/resync

## QR Security
- opaque bearer token
- SHA-256 hash-only storage
- expiry/revoke/audit

## Push Security
- VAPID private key and delivery secrets remain server-side/Vault
- subscription ownership management token
- invalid endpoints disabled

## Gateway/Device Security Target
- device identity, scoped credential, rotation, revoke, signed messages.

## Current completion
Browser/DB/Command/QR ~90–95%; Push ~85%; Gateway security ~15%.
