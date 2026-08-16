# System Architecture

負責 QueueHub 的核心 domain、資料流、後端、Realtime、整合、安全、可靠性與容量。介面層只能透過這裡定義的 service / contract 使用資料。

## 01 Domain Model
- Venue
- Restaurant
- QueueSession
- QueueStatus
- QueueEvent
- VisitorSession
- TrackedOrder
- NotificationPreference
- IntegrationConfig
- Staff / Role

## 02 Frontend Architecture
- Router
- State management
- Domain services
- Storage / recovery
- Realtime client
- PWA / service worker
- Error boundary
- Feature flags

## 03 Backend Architecture
- API gateway
- Queue command service
- Queue query service
- Session service
- Notification service
- Integration service
- Admin service

## 04 Data Layer
- PostgreSQL / Supabase
- Schema / migrations
- Indexes
- Snapshot + event history
- Retention
- Backup / restore
- RLS

## 05 Realtime
- WebSocket / Supabase Realtime / SSE
- Subscription channels
- Event version
- Sequence number
- Reconnect
- Replay
- Snapshot recovery
- Stale source detection

## 06 Integration Layer
- API adapter
- Webhook adapter
- Manual tablet adapter
- Local Gateway adapter
- Vendor normalization
- Signature validation
- Idempotency

## 07 Authentication / Authorization
- Anonymous visitor session
- Staff authentication
- Venue admin
- Restaurant operator
- Developer/API role
- RLS / policy
- Device/session revocation

## 08 Security
- Signed / opaque order token
- No enumerable ticket access
- Rate limiting
- Secret management
- Audit trail
- Input validation
- Webhook verification
- Abuse protection

## 09 Notifications
- In-page alerts
- Web Notification
- Web Push
- PWA deep link
- Threshold rules
- Deduplication
- Delivery status

## 10 Scale / Performance
- 3,000 concurrent users baseline target
- 50–100 restaurants target
- Realtime fanout
- Cache
- DB query budget
- Backpressure
- Load test
- Failure isolation

## 11 Reliability
- Health checks
- Heartbeat
- Retry policy
- Dead-letter handling
- Event idempotency
- Circuit breaker
- Degraded mode
- Recovery procedure

## 12 Observability
- Structured logs
- Metrics
- Traces
- Event lag
- Realtime connections
- API latency
- Notification delivery
- Error rate

## 13 Deployment
- Development
- Staging
- Production
- Environment config
- CI/CD
- Migration strategy
- Rollback
- Release evidence

## 現有實作對應
- `types.ts`
- `ARCHITECTURE.md`
- `supabase/`
- `loadtest/`
- `sw.js`

下一階段架構重構會以本分類作為主索引。
