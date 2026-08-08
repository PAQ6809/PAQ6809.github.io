# Lumen 台股分析平台

Lumen 是獨立的台股研究與分析網站，核心原則為「來源優先、資訊去重、時間透明」。相同資訊只保留一個 canonical 呈現位置；金融數字必須可追溯到來源，並區分原始資料日期與頁面抓取時間。

> 專案邊界：本目錄 `taiex-trend-dashboard/` 只屬於 Lumen 台股分析平台。故事／小說創作專案是另一個獨立網站與部署，不屬於本專案，也不得由台股市場排程讀取、修改、部署或注入金融分析內容。

## 線上位置

- GitHub Pages canonical site：`https://paq6809.github.io/taiex-trend-dashboard/`
- 台股資料服務端（舊 Cloudflare Worker）：`https://tw-stock-trend-radar.pinranchen6809.workers.dev/`
- `lumen-script.pages.dev`：只有在可寫 Cloudflare Pages 專案連接並完成部署驗證後，才可標示為已同步；目前不宣稱已同步。

故事專案的網址、部署設定與程式碼不得作為 Lumen 台股分析平台的 canonical source 或部署目標。

## 已上線的 canonical 功能

- 市場總覽、產業指數、市場廣度與成交熱門
- 上市 + 上櫃統一搜尋，保留市場身分
- 真正 OHLC K 線，近 6 個月歷史資料
- MA5 / MA20 / MA60、RSI14、MACD / Signal
- 上市 + 上櫃月營收、公司基本資料、六類產業財報 endpoint 配對
- P/E、殖利率、P/B 與官方產業分類同業比較
- 上市 TWSE T86 法人資料；上櫃外資 / 投信官方逐檔資料
- ETF / 基金資料與行情分層
- 上市 / 上櫃融資融券
- TAIFEX OAS 三大法人與 Put/Call Ratio
- 上市 / 上櫃官方重大訊息與 MOPS 入口
- 透明情緒指標：只使用可列出來源的市場 / 法人資料
- 多本機工作區、watchlist、研究筆記、JSON 匯出 / 匯入與 URL fragment 搬移
- Supabase Auth 私人雲端同步；`lumen_workspaces` 啟用 RLS，每個登入帳號只能存取自己的工作區
- 來源健康狀態、原始來源連結、功能狀態與失敗標示
- 可讀取 `maintenance-latest.json` 的更新／部署狀態卡
- ChatGPT 每日 08:30 / 21:30 雙時段維護

前端已由單一巨大 runtime + patch 改成 canonical 模組：`lumen-core.js`、`lumen-market.js`、`lumen-stock-a.js`、`lumen-stock-b.js`、`lumen-derivatives.js`、`lumen-workspace.js`、`lumen-cloud.js`、`lumen-boot.js`。`lumen.js` 只負責按順序載入模組，不保留第二份業務邏輯。

## Canonical financial sources

### TWSE

- OpenAPI：`https://openapi.twse.com.tw/`
- 上市行情：`exchangeReport/STOCK_DAY_ALL`
- 市場 / 產業指數：`exchangeReport/MI_INDEX`
- 估值：`exchangeReport/BWIBBU_ALL`
- 融資融券：`exchangeReport/MI_MARGN`
- 月營收：`opendata/t187ap05_L`
- 重大訊息：`opendata/t187ap04_L`
- 公司基本資料：`opendata/t187ap03_L`
- 財報：`t187ap06_L_*`、`t187ap07_L_*`
- ETF / 基金：`opendata/t187ap47_L`
- 個股法人：TWSE `T86`

### TPEx

- OpenAPI：`https://www.tpex.org.tw/openapi/`
- 上櫃行情：`tpex_mainboard_quotes`
- 估值：`tpex_mainboard_peratio_analysis`
- 融資融券：`tpex_mainboard_margin_balance`
- 三大法人總表：`tpex_3insti_summary`
- 投信逐檔：`tpex_3insti_trading`
- 外資及陸資逐檔：`tpex_3insti_qfii_trading`
- 月營收：`mopsfin_t187ap05_O`
- 重大訊息：`mopsfin_t187ap04_O`
- 公司基本資料：`mopsfin_t187ap03_O`
- 財報：`mopsfin_t187ap06_O_*`、`mopsfin_t187ap07_O_*`

### MOPS / TAIFEX

- MOPS：`https://mops.twse.com.tw/mops/web/index`
- TAIFEX OAS：`https://openapi.taifex.com.tw/`
- TAIFEX Swagger：`https://openapi.taifex.com.tw/swagger.json`
- 三大法人衍生品：`/v1/MarketDataOfMajorInstitutionalTradersGeneralBytheDate`
- Put/Call Ratio：`/v1/PutCallRatio`

完整 machine-readable 清單、維護設定與部署邊界見 `source-manifest.json`。

## 工作區與雲端同步

- 未登入：LocalStorage 多工作區、watchlist、筆記、JSON 備份與 URL fragment 搬移都可獨立使用。
- 登入：Supabase Auth session 只用於私人工作區同步；本機與雲端以 `updatedAt` 做雙向合併。
- 雲端表：`public.lumen_workspaces`。
- 權限：RLS 已驗證為開啟，只授權 `authenticated`，並建立 owner-only SELECT / INSERT / UPDATE / DELETE policy。
- 前端只使用 Supabase publishable key；不包含 service-role key、資料庫連線字串或其他 server-side secrets。

## 自動更新

ChatGPT 內的 `Lumen 雙時段更新` 已啟用，時區為 `Asia/Taipei`，每天固定執行兩次：

- 08:30：美股收盤後 / 台股開盤前，更新隔夜市場、台股盤前所需資料與來源狀態。
- 21:30：台股收盤後 / 美股開盤前，更新台股收盤、法人 / 籌碼 / 財報事件與下一交易日研究資料。

每次排程都會重新取得最新公開資料、檢查來源日期與抓取時間、驗證斷鏈與欄位結構，並更新 `maintenance-latest.json`。市場關鍵 endpoint 在網站本身也會於頁面載入與手動刷新時以 `no-store` 重新抓取，因此網站不是只靠一天兩次的靜態價格快照。

排程只允許操作 Lumen 台股分析平台，不得把故事／小說網站、Global Earnings Radar、Atlas Reader、EduCraft、ReelScribe 或其他專案當成更新目標。

## Codex / GitHub workflow 遷移狀態

- GitHub repository 內目前沒有發現 Lumen 的 cron / schedule workflow 需要刪除；現有 `lumen-static-check.yml` 只在 push / pull request 執行。
- 本對話沒有控制使用者電腦本機 Codex scheduler 的連接器，因此不能誤稱已刪除本機 Codex 排程。
- 可移到 ChatGPT 的雙時段市場維護工作已由 `Lumen 雙時段更新` 接手。

## Transparency rules

1. 原始事實、計算指標、規則解讀、風險限制分層。
2. 所有金融數字必須有來源；API 失敗時不補猜測值。
3. 顯示「尚未取得 / 資料延遲 / 待驗證」比假裝有完整資料優先。
4. K 線與技術指標以官方 OHLC / 歷史價格計算；不是交易所原始技術指標。
5. 市場廣度、成交排序與情緒分數都屬 Lumen 計算層，必須標示使用來源。
6. TAIFEX 三大法人是多家機構的彙總，不解讀成單一機構或一致策略。
7. Google News 等外部來源只作新聞發現；涉及財務數字仍需回到交易所、MOPS 或公司官方揭露。
8. 所有排序、觀察與分析均為研究資訊，不是保證獲利或個人化買賣建議。

## 專案隔離規則

1. `taiex-trend-dashboard/` = Lumen 台股分析平台 canonical source。
2. 故事／小說創作網站 = 完全獨立專案，不屬於本目錄。
3. Lumen 排程不得向故事專案寫入資料、建立金融頁面、修改部署或執行市場分析。
4. 故事專案不需要 08:30 / 21:30 市場更新。
5. 若任何文件、程式或部署設定把故事網站指向本台股專案，視為混線問題，修正前不得宣稱部署同步完成。

## Disclaimer

Lumen 台股分析平台僅供市場研究、資料整理與學習。金融資料可能延遲或缺漏；交易前請回到交易所、公開資訊觀測站與公司官方公告核對。本站不構成個人化投資建議。