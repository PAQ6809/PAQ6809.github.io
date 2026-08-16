# Mobile Web Architecture

## Scope
Consumer experience in iPhone Safari, Android Chrome, and compatible mobile browsers without requiring installation.

## Responsibilities
- QR/deep-link entry
- Restaurant search/list/detail
- My Orders and multi-restaurant prioritization
- Touch-first navigation and safe-area layout
- Anonymous visitor session
- Realtime queue updates and authoritative resync
- Foreground notifications
- Network/fallback/stale status

## Constraints
- No service-role or vendor secrets
- Must remain usable without login
- Must tolerate tab suspension and mobile memory pressure
- Must recover active orders after reload
- Sensitive QR redemption tokens must not persist in route history/storage

## Shared dependencies
Uses shared Router, Commands, Queries, VisitorRepository, VenueRepository, Provider Registry and Design System.

## Current completion
Estimated 88%.

## Remaining
- device/browser matrix validation
- stronger low-memory/tab-restore tests
- complete accessibility audit
- real-world mobile latency and weak-network tests
