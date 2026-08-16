# QueueHub Code Ownership / Migration Map

## Status

- Physical migration: **COMPLETE**
- Core/User runtime monolith split: **COMPLETE**
- Admin runtime monolith split: **COMPLETE**
- UI presentation overrides: **ACTIVE / next cleanup target**
- Production backend migration: **NOT STARTED**

## Root entry points

`index.html`、`sw.js`、`manifest.webmanifest`、`README.md` 保留在 `queuehub/` 根目錄。`sw.js` 必須留在此層，才能維持 `/queuehub/` 的 Service Worker scope。

## Core

| Path | Responsibility | Status |
|---|---|---|
| `src/core/config/demo-config.js` | Demo venue / restaurant seed / runtime constants | active |
| `src/core/state/local-state.js` | localStorage + BroadcastChannel state | active, demo provider |
| `src/core/router/hash-router.js` | hash route parsing / navigation | active |
| `src/core/domain/queue.js` | queue status / wait estimate / order status | active |
| `src/core/notifications/queue-notifications.js` | browser notification transitions | active |
| `src/core/pwa/register.js` | Service Worker registration | active |
| `src/core/bootstrap/app-bootstrap.js` | root render / startup | active |
| `src/core/domain/types.ts` | domain types | active reference |

`src/core/legacy/app.js` 已刪除。

## User interface runtime

| Path | Responsibility |
|---|---|
| `src/user/shared/ui.js` | escape / toast / nav / shared UI helpers |
| `src/user/home/home.js` | search / filtering / home rendering |
| `src/user/restaurant/restaurant.js` | restaurant detail / ticket preview |
| `src/user/orders/orders.js` | track / complete / remove / orders page |
| `src/user/board/board.js` | public queue board |
| `src/user/qr/deep-link.js` | receipt QR deep-link redemption flow |

## Admin runtime

| Path | Responsibility |
|---|---|
| `src/admin/state/selection.js` | selected restaurant UI state |
| `src/admin/audit/events.js` | QueueEvent creation / labels |
| `src/admin/queue-console/actions.js` | next / skip / pause / set queue |
| `src/admin/qr/qr.js` | venue / restaurant / order QR generation |
| `src/admin/integrations/integration.js` | integration configuration state |
| `src/admin/views/admin-base.js` | base admin / integration rendering |
| `src/admin/routing/render-bridge.js` | admin route composition |

`src/admin/legacy/features-admin.js` 已刪除。

## Presentation / UIUX

目前仍保留以下 presentation override，因為它們只處理視覺與版面，不再承擔核心 state / queue / integration business logic：

- `src/user/legacy/user-v4.js`
- `src/user/legacy/minimal-v5.js`
- `src/admin/legacy/staff-v4.js`
- `src/design-system/legacy/base.css`
- `src/design-system/legacy/user-v4.css`
- `src/design-system/user/minimal-v5.css`
- `src/admin/styles/staff-v4.css`
- `src/design-system/theme/adaptive-gradient-v6.css`

下一個 UIUX 重構階段會把 override 收斂成 `design-system/tokens`、`components`、`user/views`、`admin/views`，並逐步移除 `legacy` 命名。

## Infrastructure / developer

- `infra/supabase/`：production database / RLS scaffold，尚未套用到實際專案。
- `tools/loadtest/`：k6 load-test scaffold，尚未對 production backend 執行。
- `project/`：規格、ownership、architecture 與 interface 文件。

## Dependency rule

```text
Design System
     ↓
User / Admin / Developer interfaces
     ↓
Core domain + services
     ↓
Infrastructure / external systems
```

禁止反向依賴：
- Core 不 import User / Admin presentation。
- User 不 import Admin page logic。
- Admin 不 import User page logic。
- Design System 不知道 QueueEvent / Restaurant API 等 business rules。
- Developer tools 不直接寫 production state。

## Next architecture phase

1. 將 LocalStorage provider 抽象成 Store / Repository interface。
2. 建立 `LocalQueueProvider` 與未來 `SupabaseQueueProvider`。
3. 將 BroadcastChannel 抽象成 Realtime transport。
4. 將 order command 從 DOM / toast 解耦。
5. Admin 加入 Auth / RBAC boundary。
6. Integration adapter 改為 server-side contract。
7. 後端接通後再做 100 → 500 → 1500 → 3000 VU 實測。
