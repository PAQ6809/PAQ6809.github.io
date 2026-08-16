# Deployment Architecture

## Environments
- Development
- Staging (target; not fully separated yet)
- Production (GitHub Pages + Supabase)

## Required gates
1. Runtime syntax check
2. Runtime local-asset existence check
3. Security/DB validation where relevant
4. E2E or smoke for behavior-critical changes
5. GitHub Pages build + deploy success

## Migration policy
- database DDL through tracked migrations
- Edge Function source mirrored in repo
- no secret material committed
- service-worker cache version changed for behavior-critical client updates
- legacy path removed only after replacement deploy succeeds

## Current completion
CI/runtime checks strong; dedicated staging and automated rollback remain incomplete.
