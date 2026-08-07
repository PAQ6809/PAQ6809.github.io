# Lumen 台股分析平台

Lumen 是以「來源優先、資訊去重、時間透明」為核心的台股研究介面。相同資訊只保留一個 canonical 呈現；金融數字必須可追溯到來源，並區分原始資料日期與頁面抓取時間。

## 線上位置

- GitHub Pages canonical source：`https://paq6809.github.io/taiex-trend-dashboard/`
- 舊 Cloudflare Worker：`https://tw-stock-trend-radar.pinranchen6809.workers.dev/`

本次 2026-08-08 ChatGPT 對話已直接更新 `PAQ6809/PAQ6809.github.io/taiex-trend-dashboard/`。`lumen-script.pages.dev` 的可寫 Cloudflare Pages 專案目前未連接到本對話，因此不宣稱該站已同步部署。

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

前端已由單一巨大 runtime + patch 改成 canonical 模組：`lumen-core.js`、`lumen-market.js`、`lumen-stock-a.js`、`lumen-stock-b.js`、`lumen-derivatives.js`、`lumen-workspace.js`、`lumen-cloud.js`、`lumen-boot.js`。`lumen.js` 只負責按順序載入模組，不再放第二份業務邏輯。

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

完整 machine-readable 清單與政策見 `source-manifest.json`。

## 工作區與雲端同步

- 未登入：LocalStorage 多工作區、watchlist、筆記、JSON 備份與 URL fragment 搬移都可獨立使用。
- 登入：Supabase Auth session 只用於私人工作區同步；本機與雲端以 `updatedAt` 做雙向合併。
- 雲端表：`public.lumen_workspaces`。
- 權限：RLS 開啟，只授權 `authenticated`，並建立 owner-only SELECT / INSERT / UPDATE / DELETE policy；`anon` 沒有資料表權限。
- 前端只使用 Supabase publishable key；不包含 service-role key、資料庫連線字串或其他 server-side secrets。

## Transparency rules

1. 原始事實、Lumen 計算指標、規則解讀、風險限制分層。
2. 所有金融數字必須有來源；API 失敗時不補猜測值。
3. 顯示「尚未取得 / 資料延遲 / 待驗證」比假裝有完整資料優先。
4. K 線與技術指標以官方 OHLC / 歷史價格計算；不是交易所原始技術指標。
5. 市場廣度、成交排序與情緒分數都屬 Lumen 計算層，會標示使用來源。
6. TAIFEX 三大法人是多家機構的彙總，不解讀成單一機構或一致策略。
7. Google News 等外部來源只作新聞發現；涉及財務數字仍需回到交易所、MOPS 或公司官方揭露。
8. 所有排序、觀察與分析均為研究資訊，不是保證獲利或個人化買賣建議。

## 仍受外部條件限制的項目

- `lumen-script.pages.dev` 的 Cloudflare Pages 可寫專案尚未連接，因此目前能確認更新的是 GitHub canonical source；不虛構 Cloudflare 已部署。
- ChatGPT 的 Lumen 每日 08:30 / 21:30 Asia/Taipei 雙時段維護排程已完整設定，但帳號目前已有 5 個啟用中任務，Lumen 任務仍停用，需釋出一個 active task slot 才能啟用。
- 本對話沒有本機 Codex scheduler 控制能力，因此不能直接刪除電腦上的 Codex 排程；GitHub repository 內也沒有找到需要搬移的 Lumen cron workflow。

## Disclaimer

Lumen 僅供市場研究、資料整理與學習。金融資料可能延遲或缺漏；交易前請回到交易所、公開資訊觀測站與公司官方公告核對。本站不構成個人化投資建議。
