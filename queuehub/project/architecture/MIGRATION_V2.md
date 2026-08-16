# QueueHub Architecture v2 Runtime Migration Map

This map translates the current runtime into Architecture v2 ownership. It is the execution checklist for the next refactor stage.

## Root platform entrypoints

| Current | Target ownership | Action |
|---|---|---|
| `index.html` | deployment + client shell | KEEP at root; reduce inline client assumptions over time |
| `sw.js` | clients/mobile-pwa + deployment | KEEP at root because Service Worker scope depends on location |
| `manifest.webmanifest` | clients/mobile-pwa | KEEP at root; client-owned spec |
| `icons/` | clients/mobile-pwa | KEEP root assets |

## Shared core → Frontend architecture

| Current directory | Architecture v2 domain | Action |
|---|---|---|
| `src/core/router/` | frontend/routing | KEEP responsibility; later rename only if useful |
| `src/core/state/` | frontend/state | KEEP |
| `src/core/repository/` | frontend/repositories | KEEP |
| `src/core/query/` | frontend/queries | KEEP |
| `src/core/orders/` | frontend/commands/order | KEEP/SPLIT command contracts |
| `src/core/queue/` | frontend/commands/queue | KEEP |
| `src/core/integrations/` | frontend/commands/integration | KEEP UI-facing command contract only |
| `src/core/providers/` | frontend/providers | KEEP; provider interfaces belong here |
| `src/core/realtime/` | realtime + frontend provider adapter | SPLIT transport contract from client lifecycle |
| `src/core/notifications/` | frontend/notifications + clients/mobile-pwa | SPLIT subscription coordination from device-specific notification behavior |
| `src/core/pwa/` | clients/mobile-pwa | MOVE ownership; shared registration helper may remain core utility |
| `src/core/health/` | reliability + observability | SPLIT health state from UI presentation |
| `src/core/config/` | deployment/runtime config | KEEP but move documentation ownership |
| `src/core/bootstrap/` | frontend/bootstrap | KEEP |
| `src/core/domain/` | domain model (shared core) | KEEP |

## Consumer UI → Client architecture

| Current directory | Target client | Action |
|---|---|---|
| `src/user/home/` | mobile-web + desktop shared consumer view | KEEP until client adapters are introduced |
| `src/user/restaurant/` | mobile-web + desktop | KEEP |
| `src/user/orders/` | mobile-web + desktop + mobile-pwa | KEEP view/actions; move shared order logic to core only |
| `src/user/qr/` | mobile-web/mobile-pwa | KEEP |
| `src/user/board/` | public-display | MOVE/SPLIT into dedicated public-display client |
| `src/user/shared/` | shared consumer UI adapters | KEEP temporarily |
| `src/user/legacy/` | legacy view overrides | REMOVE incrementally after equivalent client-specific views exist |

## Admin UI → Desktop/Tablet architecture

| Current directory | Target client/domain | Action |
|---|---|---|
| `src/admin/queue-console/` | tablet + desktop operator | SPLIT shared operator command adapter from device layouts |
| `src/admin/auth/` | auth + desktop/tablet UI | SPLIT auth provider from auth UI |
| `src/admin/qr/` | desktop/tablet operator | KEEP |
| `src/admin/audit/` | desktop operator | KEEP; future operations dashboard |
| `src/admin/integrations/` | desktop operator + developer integrations | SPLIT settings UI from developer/vendor contracts |
| `src/admin/routing/` | frontend routing/admin adapter | KEEP |
| `src/admin/state/` | frontend UI state | KEEP local UI-only selection state |
| `src/admin/views/` | desktop/tablet | SPLIT by client layout |
| `src/admin/styles/` | design-system/client styles | MIGRATE into tokens/components/client overrides |
| `src/admin/legacy/` | legacy override | REMOVE after tablet/desktop views stabilize |

## Infrastructure

| Current | Target domain | Action |
|---|---|---|
| `infra/supabase/` | backend + data + auth + security | KEEP; subdivide migrations/functions by service domain |
| `tools/loadtest/` | scale + reliability | KEEP |
| `.github/workflows/queuehub-*` | deployment + reliability + scale | KEEP; classify by CI/smoke/E2E/load |

## Missing target modules to create

- `src/clients/mobile-web/`
- `src/clients/mobile-pwa/`
- `src/clients/desktop/`
- `src/clients/tablet/`
- `src/clients/public-display/`
- `src/clients/kiosk/`
- `src/clients/gateway/` (future)
- dedicated reconnect controller
- device capability/runtime-profile module
- client-specific entry adapters
- operations/observability dashboard modules

## Refactor order

1. Create runtime profile / capability detector without changing UI behavior.
2. Create client adapter folders and move only device-specific wrappers first.
3. Extract Public Display from generic user view.
4. Split Admin desktop vs tablet presentation while sharing commands/auth.
5. Move PWA/push device lifecycle out of generic core notification module.
6. Remove legacy view overrides after parity tests.
7. Add Kiosk/Gateway only after shared client contracts are stable.

## Deletion gate

No old runtime path may be deleted until:
- replacement path is loaded by `index.html` or its client entrypoint,
- Runtime CI passes,
- behavior smoke/E2E passes where applicable,
- GitHub Pages deploy succeeds,
- rollback commit exists.
