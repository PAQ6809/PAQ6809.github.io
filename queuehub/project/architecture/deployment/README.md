# Deployment Architecture

## Environments
- Development
- Production: GitHub Pages + Supabase
- Dedicated Staging: required before high-capacity/destructive validation; not provisioned because it is a separate resource/cost decision

## Active gates
1. Runtime JavaScript syntax check
2. Reconnect controller behavior smoke
3. Kiosk policy behavior smoke
4. Gateway signature + encrypted-keystore behavior smoke
5. Circuit-breaker behavior smoke
6. Runtime local-asset existence check
7. DB/Edge migration verification where relevant
8. GitHub Pages build + deploy success

## Migration policy
- database DDL through tracked migrations
- applied Supabase migrations mirrored under `infra/supabase/migrations/`
- Edge Function source mirrored in `infra/supabase/functions/`
- no service-role/private key material committed
- Service Worker cache version changes for behavior-critical browser updates
- legacy paths removed only after replacement deploy succeeds

## Rollback
`.github/workflows/queuehub-rollback.yml` is a manual-trigger rollback workflow. It accepts a known-good ancestor commit SHA, restores only the `queuehub/` tree, runs QueueHub behavior/runtime validation, commits the restored tree and pushes it back to `main` only if validation passes.

## Current completion
Production deployment automation/rollback: ~92%.

## External environment gate remaining
A truly isolated staging backend is intentionally not auto-created from the shared Free-plan project. It should be provisioned only after quota/cost approval, and is required before 500/1,000/3,000 connection verification or destructive restore drills.
