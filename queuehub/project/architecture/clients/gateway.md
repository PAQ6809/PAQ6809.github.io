# Gateway Device Architecture

## Scope
Local agent/device bridging legacy POS, queue controller, serial/LAN equipment, or vendor-local APIs into QueueHub.

## Implemented platform
- production `queuehub_gateway_devices` registry with venue/optional restaurant scope
- unique device key plus Ed25519 public-key identity
- key version, revoke and two-phase rotation support
- signed canonical requests: timestamp + nonce + SHA-256 body
- ±5 minute timestamp window and nonce replay protection
- service-role credential never exists on the gateway device
- `queuehub-gateway-ingest` Edge Function validates device signature/scope before queue mutation
- `queuehub-gateway-device` Edge Function allows authorized manager/admin register/rotate/revoke
- gateway queue commands reuse the authoritative QueueStatus + append-only QueueEvent model
- queue events record `gateway_device_id`
- idempotency collision protection
- heartbeat / last-seen / stale health model
- cloud-side gateway dead-letter table
- local Node gateway agent with WAN outbox, exponential retry and heartbeat
- encrypted private-key store using scrypt + AES-256-GCM; passphrase is environment-only
- two-phase `prepare-rotation` / `activate-rotation`
- protocol and encrypted-keystore behavior tests in Runtime CI
- production DB transaction smoke verified gateway attribution/idempotency without leaving test data

## Network model
POS/device → vendor adapter → Local Gateway → signed QueueHub Edge ingest → authoritative database/realtime.

The local outbox preserves events during WAN failure. An optional vendor adapter can translate serial/LAN/vendor API semantics into the normalized `next`, `skip`, `toggle`, `set` command contract.

## Current completion
Generic Gateway platform/security/runtime: ~85%.

## External/vendor acceptance remaining
- implement and certify the adapter for each actual POS/queue-machine vendor protocol
- validate serial/LAN drivers on the target hardware
- verify OS key/passphrase provisioning and unattended restart on the deployed gateway image
- onsite WAN-loss/recovery and power-loss testing

These cannot be truthfully completed until a real POS/vendor protocol and physical Gateway device are selected.
