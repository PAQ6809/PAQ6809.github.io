# QueueHub Client Architecture

Client architecture is split by runtime/device behavior rather than only by responsive CSS.

## Active client profiles
- `mobile-web.md` — phone browser consumer experience.
- `mobile-pwa.md` — installed/standalone PWA, cache and background push lifecycle.
- `desktop.md` — desktop/laptop consumer and operator shell.
- `tablet.md` — touch-first restaurant/venue operator console.
- `public-display.md` — read-only large-screen queue board.
- `kiosk.md` — public touch information terminal.
- `gateway.md` — future local integration device/agent.

## Runtime profile
`src/clients/runtime-profile.js` detects the current browser/device capability profile and exposes `window.QueueHubClientProfile`.

## Shared-code rule
Clients share Commands, Queries, Repositories, Providers and domain logic. A client may adapt layout, lifecycle, input model, cache, notification and device behavior, but must not duplicate authoritative queue business rules.

## Current runtime migration
Public Display is the first client implementation physically migrated to `src/clients/public-display/`. Other existing views remain in their current locations until their dedicated client adapters pass parity/CI/deploy gates.
