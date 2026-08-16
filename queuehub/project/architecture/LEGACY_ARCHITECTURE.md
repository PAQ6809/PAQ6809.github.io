# QueueHub architecture

## Product goal
QueueHub is a venue-wide queue aggregation system for rest stops, food courts, hospitals and other high-density venues. The production target is **3,000 concurrent visitors** at one venue, with each visitor able to track multiple restaurants at the same time.

## Primary UX
1. Scan a venue QR, restaurant QR, or order-specific QR once.
2. Add one or more active orders to `My Orders`.
3. Leave the page, switch apps, lock the phone, or close the browser.
4. Re-open QueueHub and recover active orders automatically.
5. Sort tracked orders by urgency and deep-link notifications to the relevant order.

## Identity and recovery
- Default: anonymous `VisitorSession` persisted locally and mirrored to the backend in production.
- `lastRoute` restores the user's previous page.
- 0 active orders -> venue home.
- 1 active order -> restaurant/order detail.
- 2+ active orders -> `My Orders` dashboard.
- A later version may upgrade an anonymous session to Apple/Google/phone login for cross-device recovery.

## Ticket identity
Never identify an order only by ticket number. The stable identity is:

`restaurantId + queueSessionId + ticketNumber (+ orderToken when available)`

This prevents a lunch ticket #168 from colliding with a later queue reset that also reaches #168.

## Realtime production topology

```text
POS / queue machines / tablets
          |
          v
QueueHub Adapter Layer
  API | Webhook | Manual | Gateway
          |
          v
Queue Event Ingest API
          |
     event stream
          |
  +-------+---------+
  |                 |
Postgres          Realtime fanout
(Supabase)       WebSocket / SSE
  |                 |
  +--------+--------+
           |
  phone / PWA / public board
```

## 3,000-user capacity target
The static GitHub Pages build is a product prototype, not the production backend. Production should target:
- 3,000 simultaneous visitors per venue
- 50-100 restaurants per venue
- up to 10 tracked orders per visitor
- 100-300 queue events/second burst capacity
- reconnect with latest-state recovery
- idempotent event ingest
- indexed status reads by `restaurantId + queueSessionId`
- fanout by restaurant channel so clients subscribe only to queues they track
- rate limiting and abuse protection
- cache latest queue state; retain event history separately

## Why push, not constant polling
3,000 browsers polling every second would create 3,000 requests/second even when nothing changes. QueueHub should publish one queue event when a number changes and fan that event out only to subscribers.

## QR formats
Venue QR:
`/#/venue/beichen`

Restaurant QR:
`/#/restaurant/harbor-noodles`

Order QR:
`/#/restaurant/harbor-noodles?ticket=168&session=20260816-lunch&token=<opaque-order-token>`

The token must be opaque and should not expose customer personal data.

## Notification constraint
A normal webpage cannot force itself to the foreground after the user switches apps. QueueHub instead uses persistent session recovery plus notifications/deep links. True background push when the browser is closed requires a push-capable backend and service-worker subscription.

## Integration modes
- API/Webhook: preferred when the restaurant vendor exposes a supported interface.
- Manual tablet: fallback for vendors with no machine-readable integration.
- Local gateway: edge device reads hardware/vendor output and normalizes events.

All sources write the same normalized `QueueEvent` and `QueueStatus` model so the consumer UI stays vendor-independent.
