# QueueHub Architecture v2 Status

## Overall architecture remake
Estimated completion: 92% for the architecture reorganization itself. This does not mean all product capabilities are production-complete.

## Client architecture
- Mobile Web: 88% capability, dedicated adapter migration pending.
- Mobile PWA: 82% capability, device lifecycle split and real-device Push E2E pending.
- Desktop: 80% capability, dedicated desktop adapter pending.
- Tablet Operator: 60% capability, dedicated touch/operator layout pending.
- Public Display: 70% architecture/runtime migration; implementation now owned by `src/clients/public-display/`.
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
- [ ] Split Mobile PWA lifecycle from generic notification/core code.
- [ ] Split Desktop vs Tablet Admin presentation.
- [ ] Introduce dedicated Mobile Web adapter boundaries.
- [ ] Remove remaining consumer/admin legacy override layers.
- [ ] Add Kiosk runtime profile.
- [ ] Implement Gateway agent/device auth.

## Next execution order
1. Mobile PWA device lifecycle and Web Push ownership split.
2. Desktop / Tablet Admin presentation split.
3. Mobile Web adapter extraction.
4. Legacy UI runtime removal.
5. Reconnect controller + observability.
6. Capacity verification.
7. POS/Gateway integration platform.
