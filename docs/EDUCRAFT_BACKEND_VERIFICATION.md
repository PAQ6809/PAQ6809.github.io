# EduCraft Phase 1 M3：後端契約與安全驗證

> 驗證日期：2026-07-19
>
> 目標：確認現有 Supabase 私人／公開資料邊界、ChatGPT MCP 契約與 transfer claim 流程，並留下可重跑的最小檢查。
>
> 安全界線：不輸出私人資料、帳號 UUID、claim code、session 或 service-role secret；合成寫入測試全數在 transaction 內 rollback。

## 1. 結論

| 驗證面 | 結果 | 判定 |
|---|---|---|
| 私人教案讀取隔離 | owner 可見 1 筆；另一帳號與匿名使用者均為 0 | 通過 |
| 其他私人資料表 | RLS 與 owner policy 已存在，但目前皆無資料列可做完整 owner/cross-account 正向矩陣 | 部分通過 |
| 公開教師名片 | 匿名只能讀取 `is_listed=true`；查詢 email、school_name、private_notes 欄位會被拒絕 | 通過 |
| Transfer／rate-limit table | `anon` 與 `authenticated` 均無直接 CRUD 權限 | 通過 |
| ChatGPT claim RPC | 正式函式目前會因 `client_id` 名稱衝突失敗；修正版已在 rollback transaction 內通過私人落地與重試冪等驗證 | 待套用 migration |
| 教案版本寫入 | 現行 policy 可讓另一帳號替非本人教案插入版本；修正版已在 rollback transaction 內證明「他人拒絕、owner 允許」 | 待套用 migration |
| MCP 讀取工具 | health、initialize、tools/list、options、draft creation 契約皆通過 | 通過 |
| MCP transfer 建立 | 預設不執行遠端 mutation，避免測試留下 transfer code 或暫存資料 | 人工 gate |
| 公開教案資料最小化 | 現行 view 會公開完整 Markdown 與 `plan_json`，尚未採 snapshot/allowlist | 發布阻擋風險 |

目前正式資料未被這次驗證修改。待審核的最小修正位於：

- `educraft/supabase/migrations/20260719000100_harden_claim_and_version_ownership.sql`

## 2. 實際資料模型快照

2026-07-19 的唯讀盤點結果：

| Relation | 類型 | RLS | 筆數 |
|---|---|---:|---:|
| `educraft_chatgpt_transfer_drafts` | table | enabled + forced | 0 |
| `educraft_lesson_plan_versions` | table | enabled | 0 |
| `educraft_lesson_plans` | table | enabled | 1（private） |
| `educraft_profiles` | table | enabled | 0 |
| `educraft_public_lesson_plans` | security-invoker view | underlying RLS | 0 |
| `educraft_public_profiles` | table | enabled | 0 |
| `educraft_rate_limits` | table | enabled | 3 |
| `educraft_saved_resources` | table | enabled | 0 |
| `educraft_teacher_preferences` | table | enabled | 0 |

`educraft_public_lesson_plans` 已採 PostgreSQL 15+ 的 `security_invoker=true`，這一點符合 [Supabase RLS 指引](https://supabase.com/docs/guides/database/postgres/row-level-security)。但 view 仍直接投影私人 base table 的 26 個欄位，包括完整 `content_markdown`、`plan_json`、`user_id` 與版本資訊；目前沒有 public row，所以尚未發生已證實的資料外洩，但公開功能擴大前必須改成欄位 allowlist 或不可變公開 snapshot。

## 3. 身分矩陣

所有矩陣查詢均在 `BEGIN READ ONLY` 中切換資料庫角色，且只回傳筆數，不回傳內容或 ID。

| 身分 | 私人教案 | 公開 view | 私人 profile | versions | saved resources | preferences | 公開 profile |
|---|---:|---:|---:|---:|---:|---:|---:|
| owner | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 另一已登入帳號 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| anon | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

限制：除了 `educraft_lesson_plans` 外，其餘私人表在驗證時沒有資料，因此其 owner/cross-account 結論主要來自 policy 靜態檢查與負向 API 測試，不應誤稱為完整資料列 E2E。

## 4. 可重跑契約檢查

### 4.1 公開 Supabase 邊界

```bash
cd educraft
npm run verify:supabase
```

Staging 驗證必須同時覆寫 URL 與 publishable key；腳本會先輸出目標 hostname，但不輸出 key：

```bash
EDUCRAFT_SUPABASE_URL=https://example.supabase.co \
EDUCRAFT_SUPABASE_PUBLISHABLE_KEY=replace-with-staging-publishable-key \
npm run verify:supabase
```

`scripts/verify-supabase-contract.mjs` 使用前端本來就可見的 project URL 與 publishable key，執行 12 個唯讀匿名檢查：

- 私人 profile、version、收藏、偏好與非公開教案不可見。
- base lesson-plan API 只能回傳 `visibility=public` 且已發布的資料。
- 公開教師名片只使用安全欄位；私人欄位 query 被拒絕。
- transfer 與 rate-limit table 不可直接讀取。
- 匿名 claim RPC 被拒絕。

### 4.2 ChatGPT MCP

```bash
cd educraft
npm run verify:mcp
```

Staging MCP 可用 `EDUCRAFT_MCP_ENDPOINT=https://example.supabase.co/functions/v1/educraft-mcp npm run verify:mcp` 覆寫；腳本會顯示目標 hostname 與 path，避免誤驗 production。

預設驗證 health、MCP initialize、initialized notification、tools/list、選項工具與合成教案草稿。輸出不列印 response payload。`save_draft_to_educraft` 是 mutation，只有明確設定 `EDUCRAFT_MCP_ALLOW_MUTATION=1` 才會執行；即使執行也不輸出 transfer code、token 或 claim link。

## 5. 已重現與已驗證的修正

### 5.1 Claim RPC 名稱衝突

現行函式使用：

```sql
on conflict (user_id, client_id) do update
```

因函式同時以 `client_id` 作為 `RETURNS TABLE` 輸出欄位，PostgreSQL 會回報 `42702 column reference "client_id" is ambiguous`。migration 改為唯一 constraint 名稱：

```sql
on conflict on constraint educraft_lesson_plans_user_id_client_id_key do update
```

修正版已在單一 transaction 中完成以下驗證後 rollback：

1. 建立合成 transfer。
2. 已登入 owner 認領成功。
3. 教案固定為 `status=draft`、`visibility=private`、`published_at is null`。
4. 同一 owner 重試回傳同一教案，不建立重複資料。
5. rollback 後 transfer row count 仍為 0。

### 5.2 Version ownership policy

現行 INSERT policy 只檢查 `auth.uid() = user_id`，沒有驗證 `lesson_plan_id` 的 owner。rollback 測試已實際重現另一已登入帳號可替非本人教案插入 version。

migration 將 policy 收斂為 `authenticated`，並要求 parent plan 同時屬於 `auth.uid()`。修正版已在 transaction 中驗證：

- 另一帳號插入被 RLS 拒絕。
- owner 對自己的教案插入成功。
- rollback 後 version row count 仍為 0。

## 6. 未關閉風險與後續工單

| ID | 風險 | 嚴重度 | 下一步 |
|---|---|---|---|
| M3-BE-01 | Claim RPC 在 production 仍有欄位名稱衝突 | 高（功能阻斷） | 審核 migration，先在 staging 套用並重跑 claim contract，再人工套用 production |
| M3-SEC-01 | Version INSERT policy 可跨 owner 關聯 | 高（完整性/BOLA） | 與 M3-BE-01 同一 migration 修復，加入 pgTAP 身分矩陣 |
| M3-PRIV-01 | 公開 view 暴露完整 `plan_json`／Markdown | 高（發布前隱私） | M4 建立 allowlist snapshot；完成前禁止擴大公開資料導入 |
| M3-ABUSE-01 | 公開 MCP transfer 只有全域、非原子 120/min 限制，沒有 per-caller quota | 中 | 加入原子 rate limit、payload retention 與濫用監控 |
| M3-DATA-01 | Transfer 沒有排程清理；expired branch 的 update 會跟 exception 一起 rollback | 中 | 建立定期 cleanup job，另測期限邊界 |
| M3-AUTH-01 | Supabase Password Leak Protection 尚未啟用 | 中 | 在 Auth 控制台啟用並做登入／註冊回歸測試 |
| M3-DB-01 | Data API grants 多數仍沿用寬廣預設值 | 中 | 明確列出 anon/authenticated 最小 grants，與 RLS 雙重收斂 |
| M3-PUB-01 | `public_slug` 沒有 UNIQUE constraint | 中 | 公開 snapshot migration 中加入唯一性與碰撞測試 |
| M3-MCP-01 | MCP mutation contract 預設未執行 | 低 | staging 使用一次性合成 transfer 做完整 create→claim→cleanup |
| M3-LEGACY-01 | Backup normalizer 尚未接到 restore UI | 低 | 下一階段接線並加入 restore E2E |

Transfer／rate-limit table 沒有 user policy 是刻意 deny-all，配合 client role 零直接權限屬預期狀態，不列為漏洞。

## 7. Migration 發布 gate

正式套用前必須依序完成：

1. 由技術負責人與資料安全負責人審核 SQL diff。
2. 建立資料庫備份或可回復點。
3. 在 staging 套用 migration。
4. 重跑 owner／other／anon RLS matrix、claim 私人落地與冪等測試。
5. 重跑 `npm run verify:backend`，確認不輸出任何 transfer secret。
6. 檢查 Supabase Security Advisor。
7. 人工核准後才套用 production；本 PR 不自動執行 production migration。

這個 gate 同時避免 GitHub Pages 部署意外改動 Supabase schema。

## 8. M4 安全驗證與 closure（2026-07-19）

| 驗證項 | 證據 | 結果 |
|---|---|---|
| 公開 snapshot 欄位最小化 | migration 靜態契約禁止 `plan_json`、citations、tags、owner UUID、source plan ID 進入公開 view；SQL metadata contract 重複檢查欄位 | 靜態通過，remote 待驗 |
| 匿名只讀 active snapshot | RLS 同時要求 `withdrawn_at is null` 與 listed 公開名片；一般 client 無 INSERT／UPDATE／DELETE | 靜態通過，身分矩陣待 staging |
| Owner-only 發布／撤回 | 兩個 RPC 均以 `auth.uid()` 比對 source plan／publication owner，空 `search_path`，authenticated-only execute | 靜態通過，跨帳號待 staging |
| Slug 競態 | `public_slug` UNIQUE，RPC 將 unique violation 轉為 `public_slug_taken`；同一 source plan 亦 UNIQUE | 靜態通過，並行交易待 staging |
| Snapshot cutover 防誤判 | `ADDITIVE_ONLY` 與 `REQUIRE_SNAPSHOT_CUTOVER` 分離；以目前 production 做 read-only 負向控制時，舊路徑 HTTP 200、新 relation HTTP 404，cutover gate 正確維持失敗 | 通過 |
| M3 claim／version migration | migration checker 確認 named conflict constraint、parent owner policy 與空 `search_path` | 靜態通過，remote 尚未套用 |
| PWA cache 隔離 | Chromium PWA 測試植入舊 EduCraft cache 與無關 cache，確認只刪前者；完全離線 app shell 與公開庫路由通過 | 自動化通過 |
| 幽靈遮罩回歸 | PWA mobile viewport 與既有 WebKit Mobile Safari 測試均無 backdrop／open dialog | 自動化通過，實機待簽核 |
| 來源自動更新界線 | monitor 僅輸出 read-only artifact；5/5 官方入口健康且 digest 未變，5 筆 unknown license 保留人工審核 | 通過 |

此次驗證修復一項新增發現：舊 Service Worker activate 會刪除同 origin 的所有 cache，可能影響 `PAQ6809.github.io` 下其他應用。`sw.js` 已改成只清除舊 `educraft-*` cache，並由負向控制測試固定此邊界。

尚不能關閉的風險：repository 沒有受保護的 `educraft-staging` environment、staging URL／publishable key／MCP endpoint，也未取得建立付費 Supabase branch 的核准。因此 M3／M4 SQL 都未套用 staging 或 production，SQL metadata contract、owner／other／anon、claim mutation 與 slug 並行測試仍是發布阻擋條件。M4 也刻意保留 legacy 匿名讀取相容性；staging `ADDITIVE_ONLY` 綠燈不能被解讀為已完成公開資料切換，正式啟用前必須讓 `REQUIRE_SNAPSHOT_CUTOVER` 通過。執行與停止條件見 `EDUCRAFT_STAGING_MIGRATION_RUNBOOK.md`。
