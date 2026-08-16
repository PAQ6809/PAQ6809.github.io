# QueueHub Code Ownership / Migration Map

## Migration status

**Physical file migration: COMPLETE.**

線上 runtime 已從根目錄切換到模組化路徑；舊根目錄 JS / CSS / data / load-test 檔案已刪除。下一階段是「拆 legacy 內容」，不是再搬檔。

## Root entry points

以下檔案刻意保留在 `queuehub/` 根目錄：

| 檔案 | 原因 |
|---|---|
| `index.html` | Web entry point，只負責 shell 與載入順序 |
| `sw.js` | Service Worker 必須留在此 scope 才能控制整個 `/queuehub/` |
| `manifest.webmanifest` | PWA platform manifest |
| `README.md` | Repository entry documentation |

## Current runtime ownership

| 現在路徑 | Responsibility | 狀態 |
|---|---|---|
| `src/design-system/legacy/base.css` | UIUX legacy base | 待拆 tokens / components |
| `src/design-system/legacy/user-v4.css` | UIUX / User legacy | 待收斂 |
| `src/design-system/user/minimal-v5.css` | User presentation | active |
| `src/design-system/theme/adaptive-gradient-v6.css` | Theme / contrast / system mode | active |
| `src/design-system/theme/system-theme.js` | Browser / system theme sync | active |
| `src/admin/styles/staff-v4.css` | Admin presentation | active |
| `src/core/legacy/app.js` | Core + User mixed legacy runtime | **下一階段主要拆分目標** |
| `src/core/domain/types.ts` | Domain types | migrated |
| `src/user/legacy/user-v4.js` | User UI legacy overrides | 待拆 |
| `src/user/legacy/minimal-v5.js` | User UI current overrides | 待拆 |
| `src/admin/legacy/features-admin.js` | Admin + integration mixed runtime | **下一階段主要拆分目標** |
| `src/admin/legacy/staff-v4.js` | Admin UI overrides | 待拆 |
| `infra/supabase/` | Database / RLS / schema | migrated |
| `tools/loadtest/` | Performance testing | migrated |
| `project/architecture/LEGACY_ARCHITECTURE.md` | Historical architecture reference | migrated |

## Current top-level structure

```text
queuehub/
├─ index.html
├─ sw.js
├─ manifest.webmanifest
├─ README.md
├─ src/
│  ├─ design-system/
│  │  ├─ legacy/
│  │  ├─ user/
│  │  └─ theme/
│  ├─ core/
│  │  ├─ domain/
│  │  └─ legacy/
│  ├─ user/
│  │  └─ legacy/
│  └─ admin/
│     ├─ styles/
│     └─ legacy/
├─ infra/
│  └─ supabase/
├─ tools/
│  └─ loadtest/
└─ project/
   ├─ uiux/
   ├─ architecture/
   └─ interfaces/
```

## Target decomposition — Phase 2

Physical location 已整理完成，接下來把 legacy monolith 拆成真正責任模組：

```text
src/
├─ design-system/
│  ├─ tokens/
│  ├─ theme/
│  ├─ components/
│  └─ accessibility/
├─ core/
│  ├─ domain/
│  ├─ router/
│  ├─ state/
│  ├─ storage/
│  ├─ realtime/
│  ├─ notifications/
│  └─ integrations/
├─ user/
│  ├─ home/
│  ├─ search/
│  ├─ restaurant/
│  ├─ orders/
│  ├─ qr/
│  └─ board/
├─ admin/
│  ├─ auth/
│  ├─ queue-console/
│  ├─ restaurants/
│  ├─ qr/
│  ├─ integrations/
│  └─ audit/
└─ developer/
   ├─ api-docs/
   ├─ playground/
   ├─ event-explorer/
   └─ adapter-tools/
```

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
- Core 不 import User / Admin UI。
- User 不 import Admin。
- Admin 不 import User page logic。
- Developer tools 不直接寫 production state；必須走受控 API。
- Design System 不知道 QueueEvent、Restaurant API 等 business logic。

## Change workflow

1. 標記 `[UIUX] / [ARCH] / [USER] / [ADMIN] / [DEV]`。
2. 指定子模組與 Acceptance Criteria。
3. 一次只搬／拆一個責任邊界。
4. 保持舊行為直到新模組驗證完成。
5. Build → Deploy → runtime verification。
6. 再刪除相對應 legacy code。
