# QueueHub Architecture v2 Status

## Overall architecture remake
Architecture v2 responsibility design is complete. Runtime migration is still in progress and is tracked separately below.

## Runtime migration
Estimated completion: ~60%.

## Client architecture
- Mobile Web: 92% capability; dedicated runtime adapter active, browser-specific real-device QA remains.
- Mobile PWA: 88% capability; runtime ownership split complete, real-device Push E2E pending.
- Desktop: 86% capability; dedicated Admin client adapter and presentation rules active.
- Tablet Operator: 72% capability; dedicated touch-first Admin client adapter active.
- Public Display: 75% capability/runtime migration; implementation owned by `src/clients/public-display/`.
- Kiosk: 20% architecture only.
- Gateway Device: 10% architecture only.

## Shared architecture
- Frontend boundaries: 90%
- Backend services: 80–95% by service
- Realtime: 80–90% core; reconnect-storm controls incomplete
- Data: 90% shared queue/venue; visitor cross-device incomplete
- Auth/RBAC: 80–90% backend; device auth incomplete
- Network modes: 55–90% depending on mode
- Security: 85–95% browser/DB/command/QR; gateway security incomplete
- Reliability: 70–90% controls; DR/SLO/dead-letter incomplete
- Observability: ~50%
- Deployment: ~80%; staging/automated rollback incomplete
- Scale architecture: ~65%; 3,000-user proof ~10–15%

## Architecture v2 migration checklist
- [x] Replace phase-centric active ownership with responsibility domains.
- [x] Split Mobile Web / Mobile PWA / Desktop / Tablet / Public Display / Kiosk / Gateway architecture.
- [x] Define Frontend / Backend / Realtime / Data / Auth / Network / Security / Reliability / Observability / Deployment / Scale contracts.
- [x] Create current-runtime migration map.
- [x] Add runtime client capability profile.
- [x] Physically move Public Display implementation into `src/clients/public-display/`.
- [x] Cache new client runtime through Service Worker.
- [x] Split Mobile PWA lifecycle from generic notification/core code.
- [x] Split Desktop vs Tablet Admin presentation.
- [x] Introduce dedicated Mobile Web adapter boundaries.
- [ ] Remove remaining consumer legacy override layers.
- [ ] Add Kiosk runtime profile.
- [ ] Implement Gateway agent/device auth.

## Active client ownership
- `src/clients/mobile-web/` — mobile browser viewport/safe-area/touch behavior.
- `src/clients/mobile-pwa/` — Service Worker client, Web Push and PWA lifecycle.
- `src/clients/desktop/` — desktop Admin client behavior/presentation rules.
- `src/clients/tablet/` — touch-first Admin client behavior/presentation rules.
- `src/clients/public-display/` — public board runtime.
- `src/admin/presentation/shared-v4.js` — shared Admin presentation markup; no Auth/Command ownership.

## Next execution order
1. Consumer legacy UI runtime removal.
2. Reconnect controller + observability.
3. Capacity verification.
4. POS/Gateway integration platform.
