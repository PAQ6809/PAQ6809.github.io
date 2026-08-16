# QueueHub 專案分類地圖

這個目錄用來管理 QueueHub 的產品設計與系統責任邊界。現有線上程式暫時維持在 `queuehub/` 根目錄，避免在架構重構前影響正式站；之後新增或重構功能，必須先歸類再實作。

## 五大類別

1. `uiux/` — 全產品共用的視覺與互動設計系統
2. `architecture/` — 系統架構、資料、Realtime、整合、安全、擴充性
3. `interfaces/user/` — 一般使用者／取餐者介面與流程
4. `interfaces/admin/` — 店家、場域管理者、營運人員介面
5. `interfaces/developer/` — API、Webhook、Adapter、除錯與開發者工具

## 修改規則

- 視覺 token、字體、色彩、間距、元件外觀 → `uiux/`
- 資料流、後端、Realtime、DB、權限、容量 → `architecture/`
- 掃 QR、搜尋餐廳、追蹤訂單、通知、取餐 → `interfaces/user/`
- 叫下一號、店家設定、場域管理、稽核 → `interfaces/admin/`
- API 文件、Webhook 測試、Vendor Adapter、事件檢視 → `interfaces/developer/`

## Commit / Issue 前綴

- `[UIUX]`
- `[ARCH]`
- `[USER]`
- `[ADMIN]`
- `[DEV]`

跨類別修改可以組合，例如：`[ARCH][USER] realtime order subscriptions`。

## 重構原則

- 一個模組只負責一種主要責任。
- UI 不直接保存 vendor secret。
- User / Admin / Developer 介面不互相引用頁面邏輯，只共用核心 domain/service。
- 共用資料模型與事件契約由 Architecture 管理。
- 共用視覺 token 與元件規則由 UIUX 管理。
- 所有正式架構變更需能回滾、驗收並保留 evidence。
