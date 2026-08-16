# Mobile PWA Architecture

## Scope
Installed/standalone QueueHub on iOS and Android.

## Responsibilities
- manifest, icons, standalone shell
- service-worker lifecycle and cache versioning
- offline shell and last-known-state behavior
- PushManager subscription and background Web Push
- notification click deep-link recovery
- install/update behavior
- safe-area and standalone navigation

## Reliability rules
- navigation uses network-first with cached shell fallback
- runtime assets require CI existence checks
- cache version changes on behavior-critical runtime updates
- push notification payload URLs must be same-origin QueueHub routes
- failed background push must not break foreground queue tracking

## Current completion
Estimated 82%.

## Remaining
- real iPhone installed-PWA Push E2E
- Android installed-PWA Push E2E
- update/old-cache migration tests
- background/offline lifecycle matrix
