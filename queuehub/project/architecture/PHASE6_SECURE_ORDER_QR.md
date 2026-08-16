# Phase 6 — Secure Receipt / Order QR

## Security model

Production receipt QR no longer trusts a client-generated `token` query parameter.

Issuance:
- live QueueHub staff must be authenticated
- operator / manager / admin may issue
- Edge Function generates 32 random bytes (256 bits)
- raw token is returned only to the issuing browser
- database stores SHA-256 hex hash only
- default expiry: 8 hours; server maximum: 12 hours; database hard maximum: 2 days
- token is bound to restaurant + current queue session + ticket number

Redemption:
- customer does not need an account
- QR target is `#/redeem?token=<opaque token>` so the token stays in URL fragment rather than the GitHub Pages HTTP request/query
- public Edge Function accepts only a 43-character base64url bearer token
- Edge Function hashes the token and calls service-role-only redemption RPC
- invalid, expired, revoked and unknown tokens are collapsed to the same public error
- successful response contains only restaurant slug, queue session ID, ticket number and expiry
- browser adds the resulting order without storing the raw token
- successful/permanently-invalid redemption immediately replaces the sensitive hash route

Persistence hardening:
- Router never persists `/redeem?token=...` as `lastRoute`
- legacy restaurant deep links no longer persist `token` into tracked orders
- production raw token may exist temporarily in the issuing QR DOM/current-tab memory, but is never written to QueueHub localStorage

Database:
- `queuehub_order_qr_tokens`
- RLS enabled; no anon/authenticated table privileges
- service-role-only issue/redeem RPCs
- redemption audit: first/last redemption timestamps + count

Intentional remaining work:
- end-to-end valid-token smoke against the public redemption Edge Function
- token revocation UI / POS lifecycle hooks
- vendor/POS issuance integration so production receipts can be minted automatically
