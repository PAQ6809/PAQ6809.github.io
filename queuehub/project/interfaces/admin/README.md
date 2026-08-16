# Admin Interface

對象：店員、店長、場域管理者、營運人員。目標是「低誤觸、可追蹤、可稽核」。

## 01 Authentication / Role
- Staff sign-in
- Restaurant operator
- Restaurant manager
- Venue admin
- Session timeout
- Device revoke

## 02 Queue Console
- Current number
- Call next
- Skip
- Pause / resume
- Manual correction
- Reset queue session
- Destructive confirmation

## 03 Restaurant Management
- Restaurant profile
- Category
- Open / closed
- Queue settings
- Average throughput
- Service session
- Display order

## 04 Venue Management
- Venue profile
- Restaurant list
- Zone / floor
- Public board config
- Venue-level QR
- Operating status

## 05 QR / Receipt
- Restaurant QR
- Venue QR
- Order QR
- Signed token generation
- QR expiration
- Print / receipt integration

## 06 Integration Management
- API
- Webhook
- Manual tablet
- Local Gateway
- Source health
- Last sync
- Credential reference

## 07 Alerts / Incidents
- Source offline
- Stale queue
- Webhook failure
- Realtime failure
- Abnormal number jump
- Push failure

## 08 Audit Log
- Who
- What
- Restaurant
- Previous / new value
- Device
- Timestamp
- Source

## 09 Operations Dashboard
- Active restaurants
- Active queue sessions
- Waiting orders
- Event rate
- Realtime health
- Notification status

## 10 Settings
- Reminder defaults
- Queue reset policy
- Integration defaults
- Display preferences
- Feature flags by venue

## 主要驗收
- 最常用的「下一號」必須最突出。
- 跳號、重設、直接改號必須降低誤觸。
- 每次狀態變更可回查操作者與事件。
- 店員不接觸 API secret 本體。
