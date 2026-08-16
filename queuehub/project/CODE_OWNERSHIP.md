# QueueHub Code Ownership / Migration Map

這張表用來判斷「現在的檔案屬於哪個責任區」，以及架構重構後應搬到哪裡。現階段不直接搬檔，避免破壞已上線頁面。

## 現有檔案歸屬

| 現有檔案 | 主要責任 | 未來目標 |
|---|---|---|
| `styles.css` | UIUX legacy base | `src/design-system/base.css` |
| `ux-v4.css` | UIUX / User legacy | 收斂到 design-system + user components |
| `ux-minimal-v5.css` | UIUX / User | `src/design-system/` + `src/user/` |
| `ux-adaptive-v6.css` | UIUX Theme | `src/design-system/theme/` |
| `ux-staff-v4.css` | Admin UI | `src/admin/styles/` |
| `app.js` | User + core 混合 | 拆成 `src/core/` + `src/user/` |
| `ux-v4.js` | User UI legacy | `src/user/` |
| `ux-minimal-v5.js` | User UI | `src/user/` |
| `features-admin.js` | Admin + integration 混合 | `src/admin/` + `src/core/integrations/` |
| `ux-staff-v4.js` | Admin UI | `src/admin/` |
| `types.ts` | Architecture / domain | `src/core/domain/` |
| `sw.js` | Architecture / PWA | `src/core/pwa/` |
| `supabase/` | Architecture / data | `infra/supabase/` |
| `loadtest/` | Developer / performance | `tools/loadtest/` |
| `ARCHITECTURE.md` | Architecture legacy doc | `project/architecture/` |

## 目標程式結構

```text
queuehub/
├─ src/
│  ├─ design-system/
│  │  ├─ tokens/
│  │  ├─ theme/
│  │  ├─ components/
│  │  └─ accessibility/
│  ├─ core/
│  │  ├─ domain/
│  │  ├─ services/
│  │  ├─ realtime/
│  │  ├─ storage/
│  │  ├─ notifications/
│  │  ├─ integrations/
│  │  └─ pwa/
│  ├─ user/
│  │  ├─ home/
│  │  ├─ restaurant/
│  │  ├─ orders/
│  │  ├─ qr/
│  │  ├─ notifications/
│  │  └─ board/
│  ├─ admin/
│  │  ├─ auth/
│  │  ├─ queue-console/
│  │  ├─ restaurants/
│  │  ├─ venue/
│  │  ├─ qr/
│  │  ├─ integrations/
│  │  ├─ incidents/
│  │  └─ audit/
│  └─ developer/
│     ├─ api-docs/
│     ├─ playground/
│     ├─ event-explorer/
│     └─ adapter-tools/
├─ infra/
│  ├─ supabase/
│  ├─ migrations/
│  └─ deployment/
├─ tools/
│  ├─ loadtest/
│  ├─ fixtures/
│  └─ scripts/
└─ project/
   ├─ uiux/
   ├─ architecture/
   └─ interfaces/
      ├─ user/
      ├─ admin/
      └─ developer/
```

## Dependency Rule

```text
UIUX/design-system
      ↓
User / Admin / Developer UI
      ↓
Core services + domain
      ↓
Infrastructure / external integrations
```

禁止反向依賴：
- Core 不 import User/Admin UI。
- User 不 import Admin。
- Admin 不 import User page logic。
- Developer tools 不直接改 production state，必須透過受控 API。
- Design System 不知道 QueueEvent、Restaurant API 等 business logic。

## 未來每次修改流程

1. 先標記 `[UIUX] / [ARCH] / [USER] / [ADMIN] / [DEV]`。
2. 找到對應子項目。
3. 只修改該責任模組；跨模組時明確列依賴。
4. 定義 Acceptance Criteria。
5. 實作。
6. 驗證。
7. 推 staging / production。
8. 留下 commit / test / deployment evidence。
