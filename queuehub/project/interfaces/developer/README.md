# Developer Interface

對象：QueueHub 開發者、第三方餐廳系統商、整合工程師。目標是「可整合、可驗證、可除錯」。

## 01 API Reference
- Auth
- Queue status read
- Queue command write
- Restaurant / venue read
- Session read
- Error codes
- Rate limits

## 02 Webhook
- Event types
- Signature validation
- Retry policy
- Idempotency key
- Delivery log
- Replay

## 03 Adapter SDK
- Vendor adapter contract
- POS adapter
- Queue machine adapter
- Local Gateway adapter
- Normalization rules
- Test fixture

## 04 Event Explorer
- QueueEvent stream
- Filter by venue / restaurant
- Sequence / version
- Payload inspector
- Replay / compare

## 05 API Playground
- Staging-only request builder
- Sample payloads
- Mock restaurant
- Webhook test endpoint
- Signed request examples

## 06 Schema / Migration
- Database schema
- API schema
- Event schema
- Migration history
- Backward compatibility

## 07 Environments / Config
- Local
- Development
- Staging
- Production
- Public config
- Secret references
- Feature flags

## 08 Observability Tools
- Logs
- Metrics
- Trace ID
- Realtime connection state
- Event lag
- Integration health

## 09 Testing
- Unit tests
- Contract tests
- Integration tests
- E2E
- Load tests
- Failure injection

## 10 Release / CI
- CI checks
- Preview
- Staging promotion
- Production deploy
- Migration gate
- Rollback
- Release evidence

## 11 Security Tools
- API token management
- Scope
- Token revoke
- Webhook secret rotation
- Audit
- Security test cases

## 12 Documentation
- Quickstart
- Integration guide
- Vendor onboarding
- API changelog
- Deprecation policy
- Troubleshooting

## 主要驗收
- 第三方整合不需要理解 QueueHub 前端程式。
- Adapter 有固定 contract 與測試資料。
- Production secret 不出現在瀏覽器或 repo。
- 每一個 request / event 都能用 ID 追蹤與除錯。
