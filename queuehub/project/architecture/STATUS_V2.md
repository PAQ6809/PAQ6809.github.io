# QueueHub Architecture v2 Status

## Overall architecture remake
Architecture v2 responsibility design is complete. Runtime migration is still in progress and is tracked separately below.

## Runtime migration
Estimated completion: ~74%.

## Client architecture
- Mobile Web: 92% capability; dedicated runtime adapter active, browser-specific real-device QA remains.
- Mobile PWA: 88% capability; runtime ownership split complete, real-device Push E2E pending.
- Desktop: 86% capability; dedicated Admin client adapter and presentation rules active.
- Tablet Operator: 72% capability; dedicated touch-first Admin client adapter active.
- Public Display: 75% capability/runtime migration; implementation owned by `src/clients/public-display/`.
- Kiosk: 20% architecture only.
- Gateway Device: 10% architecture only.

## Shared architecture
- Frontend boundaries: 94%; consumer JS override layers are no longer legacy-owned.
- Backend services: 80–95% by service.
- Realtime: ~94%; centralized reconnect controller with exponential backoff, jitter, coalescing and wake-up recovery is active. Controller behavior CI passes, 100 concurrent Realtime joins pass, and a 50-client reconnect storm passes. Higher tiers remain unverified.
- Data: 90% shared queue/venue; visitor cross-device incomplete.
- Auth/RBAC: 80–90% backend; device auth incomplete.
- Network modes: 75–90% for browser clients; offline and reconnect ownership are separated from the Supabase channel provider.
- Security: 85–95% browser/DB/command/QR; gateway security incomplete.
- Reliability: ~90%; idempotency, retry, outbox, health, reconnect controls and reconnect behavior smoke are active; DR/SLO/dead-letter incomplete.
- Observability: ~72%; diagnostics have counters, gauges, timings and reconnect/resync events, but no external metrics backend yet.
- Deployment: ~80%; staging/automated rollback incomplete.
- Scale architecture: ~78%; a production-safe 100-user baseline and 50-client reconnect storm are verified. 500/1,000/3,000 remain staging-only and unverified.
- 3,000-user proof: ~10–15%; NOT VERIFIED and blocked from production testing by the current shared Free-plan Realtime quota.

## Verified scale baseline — 2026-08-17
GitHub Actions run `32005625037`, commit `aea8bf92f4e10e49ee1a2ae1e81cfef8eb3263e7`:
- 100-VU authoritative REST recovery: PASS, 0% failures, HTTP p95 196.85 ms, p99 419.60 ms.
- 100 concurrent Realtime connections: PASS, 100/100 joins, 0% errors, join p95 299.20 ms, p99 417.88 ms.
- 50-client disconnect/jitter/reconnect storm: PASS, 50/50 initial joins and 50/50 second joins, 0% errors, second-join p95 208.10 ms, p99 789.33 ms.

Detailed evidence: `project/architecture/scale/CAPACITY_BASELINE.md`.

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
- [x] Remove consumer legacy JavaScript override layers.
- [x] Add centralized Realtime reconnect controller and runtime diagnostics ownership.
- [x] Verify reconnect controller behavior in Runtime CI.
- [x] Verify production-safe 100-user REST/Realtime baseline and 50-client reconnect storm.
- [ ] Consolidate remaining legacy design-system CSS layers.
- [ ] Add Kiosk runtime profile.
- [ ] Implement Gateway agent/device auth.

## Active client and runtime ownership
- `src/clients/mobile-web/` — mobile browser viewport/safe-area/touch behavior.
- `src/clients/mobile-pwa/` — Service Worker client, Web Push and PWA lifecycle.
- `src/clients/desktop/` — desktop Admin client behavior/presentation rules.
- `src/clients/tablet/` — touch-first Admin client behavior/presentation rules.
- `src/clients/public-display/` — public board runtime.
- `src/user/navigation/order-badge.js` — consumer navigation order count.
- `src/user/presentation/consumer-minimal-v5.js` — current consumer presentation override without Admin/Public Display ownership.
- `src/admin/presentation/shared-v4.js` — shared Admin presentation markup; no Auth/Command ownership.
- `src/core/realtime/reconnect-controller.js` — reconnect policy, backoff, jitter and online/visibility recovery.
- `src/core/realtime/supabase-broadcast-provider.js` — Supabase channel transport and authoritative resync only.
- `src/core/observability/diagnostics.js` — runtime counters, gauges, timings and recent events.
- `src/core/health/runtime-health.js` — health state and degraded-mode UI only.

## Next execution order
1. Legacy design-system CSS consolidation.
2. Kiosk runtime profile.
3. POS/Gateway integration platform.
4. Higher capacity tiers only after staging/quota approval.
