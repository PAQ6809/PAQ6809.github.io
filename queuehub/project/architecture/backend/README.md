# Backend Architecture

## Service domains
- Public Read Service — venue, restaurant and queue status reads.
- Admin Command Service — authenticated/RBAC queue mutations.
- Secure QR Service — issue, redeem, revoke opaque order tokens.
- Push Service — subscription registration, watch sync, outbox delivery and cleanup.
- Integration Service — vendor/POS/webhook/gateway normalization.

## Rules
- Browser clients never receive service-role credentials.
- Production writes require authenticated authorization boundary or purpose-built public token verification.
- Queue commands are idempotent and return authoritative server state/version.
- Public read responses expose only fields needed for user-facing queue state.
- Vendor-specific payloads are normalized before entering the queue domain.

## Current completion
Public Read 95%, Admin Command 90%, Secure QR 95%, Push backend 80%, Integration backend 40%.
