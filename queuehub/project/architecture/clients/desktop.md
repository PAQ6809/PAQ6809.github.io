# Desktop Web Architecture

## Scope
Desktop/laptop browser experience for consumers, restaurant operators and venue administrators.

## Responsibilities
- wide-layout navigation and multi-column views
- keyboard/mouse interaction
- consumer queue tracking
- admin console shell
- desktop notifications
- tab synchronization and session recovery

## Boundaries
Consumer and Admin views may share frontend/core services but Admin production writes must pass Auth/RBAC and remote command boundaries.

## Current completion
Estimated 80%.

## Remaining
- explicit desktop breakpoint contract
- full keyboard/accessibility test matrix
- desktop multi-window/session behavior
- dedicated operations dashboard layouts
