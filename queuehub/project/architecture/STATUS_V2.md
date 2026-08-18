# QueueHub Architecture v2 Status

## Overall architecture remake
Architecture v2 responsibility design is complete. The remaining work is primarily external acceptance: real-device/browser validation, vendor-specific POS adapters, an isolated paid staging/recovery target, and capacity tiers above the current verified baseline.

## Runtime migration
Software/runtime migration estimate: ~94%.

## Client architecture
- Mobile Web: ~94%; dedicated runtime adapter active, browser-specific real-device QA remains.
- Mobile PWA: ~90%; lifecycle/Push ownership split complete, real-device background Push E2E remains.
- Desktop: ~90%; dedicated Admin client adapter/presentation and production backend commands active.
- Tablet Operator: ~82%; touch-first Admin adapter active, target tablet hardware QA remains.
- Public Display: ~80%; implementation owned by `src/clients/public-display/`, physical display validation remains.
- Kiosk: ~90% software/runtime; explicit kiosk policy, read-only route boundary, idle reset and QR handoff active. Locked-browser/hardware acceptance remains.
- Gateway Device: ~85% generic platform; production device trust, signed ingest, encrypted local agent, outbox/retry/heartbeat/rotation active. Vendor-specific POS/hardware adapter acceptance remains.

## Shared architecture
- Frontend boundaries: ~98%; active runtime and design-system ownership are modularized.
- Backend services: ~95%; Queue, Admin, QR, Push, Gateway, Visitor Sync, Telemetry and Ops Health service boundaries are active.
- Realtime: ~95%; centralized reconnect controller with exponential backoff, jitter, coalescing and authoritative resync active. Controller CI, 100 concurrent joins and 50-client reconnect storm pass.
- Data: ~97%; shared queue state plus service-only visitor cross-device persistence, Gateway trust and telemetry schemas are deployed.
- Auth/RBAC: ~95%; staff RBAC and Gateway public-key device identity/rotate/revoke boundaries are active.
- Network modes: ~90%; browser degraded/reconnect handling plus Gateway WAN outbox are active.
- Security: ~96%; RLS/grants, server-only secrets, signed Gateway ingest, nonce replay protection, encrypted Gateway private key and restrictive private-table policies active. Supabase Security Advisor shows no new QueueHub-specific security WARN after remediation.
- Reliability: ~96%; idempotency, bounded retry, reconnect-storm controls, circuit breaker, Push/Gateway dead-letter, maintenance, SLO/runbook and validated rollback are active. Separate-environment restore drill remains external.
- Observability: ~92%; first-party telemetry backend, hourly p95 metrics, operational health aggregation and manager/admin ops-health API are active. Alert tuning on real traffic remains.
- Deployment: ~92%; Runtime CI and validation-first rollback active; isolated staging/recovery project remains external/cost-gated.
- Scale architecture: ~78%; production-safe 100-user baseline and 50-client reconnect storm are verified. 500/1,000/3,000 remain staging-only and unverified.
- 3,000-user proof: ~10–15%; **NOT VERIFIED** and blocked from production testing by the current shared Free-plan Realtime quota.

## Verified scale baseline — 2026-08-17
GitHub Actions run `32005625037`, commit `aea8bf92f4e10e49ee1a2ae1e81cfef8eb3263e7`:
- 100-VU authoritative REST recovery: PASS, 0% failures, HTTP p95 196.85 ms, p99 419.60 ms.
- 100 concurrent Realtime connections: PASS, 100/100 joins, 0% errors, join p95 299.20 ms, p99 417.88 ms.
- 50-client disconnect/jitter/reconnect storm: PASS, 50/50 initial joins and 50/50 second joins, 0% errors, second-join p95 208.10 ms, p99 789.33 ms.

Detailed evidence: `project/architecture/scale/CAPACITY_BASELINE.md`.

## Architecture v2 software checklist
- [x] Replace phase-centric active ownership with responsibility domains.
- [x] Split Mobile Web / Mobile PWA / Desktop / Tablet / Public Display / Kiosk / Gateway architecture.
- [x] Define Frontend / Backend / Realtime / Data / Auth / Network / Security / Reliability / Observability / Deployment / Scale contracts.
- [x] Create current-runtime migration map and runtime client capability profile.
- [x] Move Public Display implementation into `src/clients/public-display/`.
- [x] Split Mobile PWA lifecycle, Desktop/Tablet Admin presentation and Mobile Web boundaries.
- [x] Remove consumer legacy JavaScript and active legacy CSS ownership.
- [x] Add centralized Realtime reconnect controller and behavior CI.
- [x] Verify production-safe 100-user REST/Realtime baseline and 50-client reconnect storm.
- [x] Add explicit Kiosk runtime policy, idle reset, QR handoff and behavior CI.
- [x] Implement Gateway device registry, Ed25519 signed ingest, replay protection, scope, rotate/revoke and heartbeat.
- [x] Implement local Gateway agent with encrypted key store, outbox, retry and protocol/keystore CI.
- [x] Add Gateway and Push dead-letter / bounded retry controls.
- [x] Add first-party centralized runtime telemetry, hourly metrics and operational health API.
- [x] Add public REST circuit breaker and behavior CI.
- [x] Add SLO and failure-mode runbook.
- [x] Add validation-first QueueHub rollback workflow.
- [x] Add service-only visitor/tracked-order cross-device persistence backend and client contract.
- [x] Add automatic data lifecycle maintenance with `pg_cron`.
- [x] Run Supabase Security/Performance Advisor review and remediate QueueHub-specific new-table policy/FK-index findings.

## External acceptance gates — not software-completable in the current environment
- [ ] Mobile/iOS/Android real-device Web Push and browser matrix validation.
- [ ] Kiosk locked-browser + touch/accessibility hardware validation.
- [ ] Select a real POS/queue-machine vendor protocol and implement/certify its Gateway adapter.
- [ ] Gateway onsite power-loss/WAN-loss/OS provisioning validation.
- [ ] Provision a separate staging/recovery Supabase target and perform a real restore drill.
- [ ] Verify 500 / 1,000 / 3,000 connection tiers only after staging quota approval.

## Active ownership highlights
- `src/clients/kiosk/` — explicit public-terminal policy/presentation.
- `tools/gateway-agent/` — signed/encrypted local Gateway runtime.
- `src/core/reliability/circuit-breaker.js` — remote failure circuit control.
- `src/core/observability/diagnostics.js` + `telemetry-client.js` — local diagnostics and first-party upload.
- `src/core/visitor/cloud-sync.js` — cross-device persistence contract without visible UI changes.
- `infra/supabase/functions/queuehub-gateway-*` — device registration and signed ingest.
- `infra/supabase/functions/queuehub-runtime-telemetry/` — sanitized operational telemetry ingest.
- `infra/supabase/functions/queuehub-ops-health/` — manager/admin operational health snapshot.
- `infra/supabase/functions/queuehub-visitor-sync/` — opaque-token cross-device sync.

## Next execution order
1. Validate the final software/runtime commit in QueueHub Runtime CI and GitHub Pages deploy.
2. Real-device/browser QA when physical devices are available.
3. Vendor-specific POS/Gateway adapter when the actual vendor protocol is known.
4. Isolated staging/recovery + higher capacity tiers only after quota/cost approval.
