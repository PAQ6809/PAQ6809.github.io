# EduCraft staging migration 發布手冊

本手冊只處理 EduCraft migration。GitHub Pages workflow 不得持有資料庫管理密鑰，也不得直接修改 production schema。

## 目前狀態（2026-07-19）

- GitHub repository 目前只有 `github-pages` environment，尚未建立受保護的 `educraft-staging` environment。
- Repository 尚未設定 EduCraft staging URL、publishable key 或 MCP endpoint secret。
- 本階段因此只能建立 migration、靜態契約與 read-only staging gate；不能誠實宣稱 migration 已在 staging 或 production 套用。
- M3、M4 public-snapshot 與 M5 source-governance migrations 都保持未套用狀態，直到以下 gate 全部完成。

Supabase 建議使用獨立 staging／preview 環境驗證 migration；branch 具有獨立資料庫、API、Auth 與 Storage，不攜帶 production data。參考 [Supabase Deployment & Branching](https://supabase.com/docs/guides/deployment) 與 [Working with branches](https://supabase.com/docs/guides/deployment/branching/working-with-branches)。

## 一次性設定

1. 建立 Supabase preview branch 或獨立 staging project。建立 branch 可能產生費用，必須由專案擁有者先確認方案與成本。
2. 在 GitHub 建立 `educraft-staging` environment，加入必要 reviewer，禁止自動核准。
3. 只在該 environment 設定以下 secrets：
   - `EDUCRAFT_SUPABASE_URL`
   - `EDUCRAFT_SUPABASE_PUBLISHABLE_KEY`
   - `EDUCRAFT_MCP_ENDPOINT`
4. 不把 database password、access token、service-role key 或 secret key提供給本 PR 的 read-only workflow。
5. 確認 staging hostname 與 production `goedzzhhvvnfczgnkqlv.supabase.co` 不同。

## Migration 套用順序

1. 建立 staging 備份或確認 branch 可重建。
2. 依檔名順序套用 `educraft/supabase/migrations/`：M3 claim／version ownership → M4 public snapshot → M5 source governance。
3. Migration 必須透過 Supabase migration history 管理；不要在 production SQL Editor 貼上未追蹤 SQL。Supabase 的建議團隊流程是本機建立／測試 migration，再由單一協調者部署 remote。[Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
4. 套用後執行 Security Advisor，任何新增 WARN 先停止。
5. 以可 rollback 的資料庫連線執行 `educraft/supabase/tests/public_lesson_plan_snapshots_contract.sql` 與 `source_governance_contract.sql`。
6. 使用 staging 合成 reviewer、owner、other、anon 帳號及合成教案執行身分矩陣；不得複製 production 教師資料。

## Read-only GitHub gate

手動執行 `EduCraft staging contract gate`，選擇 `RUN_READ_ONLY_STAGING_CONTRACTS`。`snapshot_mode` 有兩個不同 gate：

- `ADDITIVE_ONLY`：要求新 snapshot view／欄位限制存在，同時明確輸出 legacy 路徑仍啟用；只可核准 additive migration，不代表已完成安全切換。
- `REQUIRE_SNAPSHOT_CUTOVER`：除新 snapshot 契約外，還要求匿名已無法讀取 `educraft_lesson_plans` 與 `educraft_public_lesson_plans`。正式啟用 snapshot 前必須使用此模式並通過。

Workflow 會：

- 拒絕缺少 secrets 或指向 production 的 URL。
- 顯示目標 hostname，不顯示 key。
- 驗證 migration 的安全不變量。
- 執行 Supabase 匿名契約與 MCP 讀取契約。
- 不執行 migration、不建立 transfer、不修改任何資料列。

M4 migration 刻意不撤銷 legacy 路徑，避免在前端切換前破壞正式站。因此它只能通過 `ADDITIVE_ONLY`；M5 的 feature-flag cutover 與撤權 migration 完成前，`REQUIRE_SNAPSHOT_CUTOVER` 應維持紅燈。

## 人工資料庫驗收

自動 read-only gate 通過後，仍須人工確認：

- 匿名只能讀 active 公開 snapshot 的允許欄位。
- 匿名不能直接讀取私人 lesson-plan base table、`plan_json`、私人 profile 或 transfer table。
- 使用者 A 只能發布、重發與撤回 A 的教案；A 不能操作 B 的 plan UUID。
- 同一 slug 的並行發布只有一個成功。
- 發布不改寫私人 Markdown／JSON；撤回只撤下 snapshot，不刪除私人教案。
- M3 claim 會建立一份私人草稿，重試不重複建立；version insert 會拒絕跨 owner。
- 非 reviewer 不能建立來源決策；reviewer 可核准 metadata-only，未知授權不可核准 reusable；決策不改 lesson plan 內容或 `updated_at`。
- 來源影響通知只讓 plan owner 讀取及確認；other／anon 均被拒絕，同一來源版本不重複建立 active notice。
- Security Advisor 沒有因本次 migration 新增 RLS、mutable search path 或公開 SECURITY DEFINER 警告。

## Production 核准

只有 staging migration、read-only workflow、雙帳號矩陣、Advisor 與回復步驟都有證據時，資料安全負責人與技術負責人才可共同核准 production。Production 套用後立刻重跑匿名契約；任何私人欄位可見、claim 失敗或公開路由異常都停止發布並執行已審核的 forward fix／回復方案。

本手冊不授權建立付費 Supabase branch、修改 production 或儲存任何 production secret。
