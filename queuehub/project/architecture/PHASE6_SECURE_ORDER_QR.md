# Phase 6 — Secure Receipt / Order QR

## Status

**Backend token vault, Edge Functions, browser secure redemption, privacy hardening, Security Advisor checks and public redemption E2E are implemented.**

## Security model

Production receipt QR no longer trusts a client-generated `token` query parameter.

Issuance:
- live QueueHub staff must be authenticated
- operator / manager / admin may issue
- `queuehub-order-qr-issue` has JWT verification enabled
- Edge Function generates 32 random bytes (256 bits)
- raw token is returned only to the issuing browser
- database stores SHA-256 hex hash only
- default expiry: 8 hours; Edge Function maximum: 12 hours; database hard maximum: 2 days
- token is bound to restaurant + current queue session + ticket number

Redemption:
- customer does not need an account
- QR target is `#/redeem?token=<opaque token>` so the token stays in the URL fragment rather than the GitHub Pages HTTP request/query
- `queuehub-order-redeem` is public by design and uses the 256-bit bearer token as its credential
- it accepts only the expected 43-character base64url token format
- Edge Function hashes the token and calls a service-role-only redemption RPC
- invalid, expired, revoked and unknown tokens collapse to the same public error
- successful response contains only restaurant slug, queue session ID, ticket number and expiry
- browser adds the resulting order without storing the raw token
- successful or permanently invalid redemption replaces the sensitive hash route

Persistence hardening:
- Router never persists `/redeem?token=...` as `lastRoute`
- legacy restaurant deep links no longer persist a raw token into tracked orders
- production raw token may exist temporarily in the issuing QR DOM/current-tab memory, but is never written to QueueHub localStorage

## Database

Table: `queuehub_order_qr_tokens`

Stored:
- restaurant / queue session / ticket number
- SHA-256 token hash only
- expiry / revocation timestamp
- issuer user ID
- first / last redemption timestamp
- redemption count

Controls:
- RLS enabled
- anon/authenticated table privileges revoked
- explicit deny-all RLS policy for browser roles
- issue/redeem RPCs executable by `service_role` only
- indexes cover restaurant/session lookup, expiry, issuer FK and queue-session FK

## Service-layer rollback test — PASS

A transaction-only test temporarily granted an existing Auth user an operator membership, issued ticket `168` using a known 64-character test hash, redeemed it twice, inspected the audit row, and rolled the entire transaction back.

Observed:
- issue: `ok=true`
- first redeem: `ok=true`
- second redeem: `ok=true`
- restaurant: `harbor-noodles`
- ticket: `168`
- redemption count: `2`
- stored token representation length: `64` hex characters

No staff membership or QR token from this test persisted after rollback.

## Public Edge Function valid-token E2E — PASS

A separate short-lived test row was committed only for an external GitHub Actions check:
- test ticket: `991`
- expiry: 30 minutes
- no personal data
- fixed test bearer token, used only for this validation

`QueueHub Order QR Redeem E2E` called the public Edge Function from an external GitHub runner and verified:
- HTTP request succeeded
- `ok=true`
- `restaurantSlug=harbor-noodles`
- `ticketNumber=991`
- `queueSessionId` present
- `expiresAt` present

Before cleanup, the database audit showed:
- `redemption_count=1`
- stored hash length `64`
- first/last redemption timestamps present

The test token row was then deleted. The workflow was changed to manual-only and now requires an explicitly seeded short-lived token input.

## Advisor verification

After adding an explicit browser deny policy, QueueHub has no remaining Security Advisor item for the order-token table or its SECURITY DEFINER functions. Remaining security notices in the shared Supabase project belong to other applications or global Auth configuration.

Performance Advisor identified the queue-session FK as needing a standalone index; `queuehub_order_qr_queue_session_idx` was added. Remaining QueueHub performance notices are unused-index INFO entries expected for newly-created, low-traffic tables.

## Remaining Phase 6 work

1. Verify the JWT-protected **issue** Edge Function end-to-end after one real QueueHub staff identity is deliberately selected; no existing user is auto-promoted.
2. Add token revocation/void UI or POS lifecycle hook for canceled orders.
3. Integrate issuance with a real POS/queue vendor so production receipts can be minted automatically.
