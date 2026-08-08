# 台股分析平台

這是獨立的台股研究與分析網站，核心原則為「來源優先、資訊去重、時間透明」。相同資訊只保留一個 canonical 呈現位置；金融數字必須可追溯到來源，並區分原始資料日期與頁面抓取時間。

> 專案邊界：本目錄 `taiex-trend-dashboard/` 只屬於台股分析網站。故事／小說創作專案是另一個獨立網站與部署，不屬於本專案，也不得由台股市場排程讀取、修改、部署或注入金融分析內容。

## 線上位置

- GitHub Pages canonical source：`https://paq6809.github.io/taiex-trend-dashboard/`
- 台股資料服務端（舊 Cloudflare Worker）：`https://tw-stock-trend-radar.pinranchen6809.workers.dev/`

故事專案的網址、部署設定與程式碼不得作為本台股分析網站的 canonical source 或部署目標。

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

前端已由單一巨大 runtime + patch 改成 canonical 模組。現有 `lumen-core.js`、`lumen-market.js`、`lumen-stock-a.js`、`lumen-stock-b.js`、`lumen-derivatives.js`、`lumen-workspace.js`、`lumen-cloud.js`、`lumen-boot.js`、`lumen.js` 與 `lumen.css` 為歷史相容檔名，不代表本專案仍名為 Lumen，也不得據此連結到故事專案。為避免破壞既有部署與工作區資料，這些內部檔名與 `lumen_workspaces` schema key 暫不做高風險重命名。

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
- 雲端表：`public.lumen_workspaces`（歷史相容名稱）。
- 權限：RLS 已驗證為開啟，只授權 `authenticated`，並建立 owner-only SELECT / INSERT / UPDATE / DELETE policy；`anon` 沒有資料表權限。
- 前端只使用 Supabase publishable key；不包含 service-role key、資料庫連線字串或其他 server-side secrets。

## 自動更新

ChatGPT 內的 `台股分析雙時段更新` 已啟用，時區為 `Asia/Taipei`，每天固定執行兩次：

- 08:30：美股收盤後 / 台股開盤前，更新隔夜市場、台股盤前所需資料與來源狀態。
- 21:30：台股收盤後 / 美股開盤前，更新台股收盤、法人 / 籌碼 / 財報事件與下一交易日研究資料。

排程只允許操作本台股分析專案，不得把故事／小說網站、Global Earnings Radar、Atlas Reader、EduCraft、ReelScribe 或其他專案當成更新目標。每次執行都重新檢查資料來源日期、抓取時間、延遲狀態、斷鏈與重複資訊，不把前一交易日資料冒充當日即時行情。

## Transparency rules

1. 原始事實、計算指標、規則解讀、風險限制分層。
2. 所有金融數字必須有來源；API 失敗時不補猜測值。
3. 顯示「尚未取得 / 資料延遲 / 待驗證」比假裝有完整資料優先。
4. K 線與技術指標以官方 OHLC / 歷史價格計算；不是交易所原始技術指標。
5. 市場廣度、成交排序與情緒分數都屬計算層，必須標示使用來源。
6. TAIFEX 三大法人是多家機構的彙總，不解讀成單一機構或一致策略。
7. Google News 等外部來源只作新聞發現；涉及財務數字仍需回到交易所、MOPS 或公司官方揭露。
8. 所有排序、觀察與分析均為研究資訊，不是保證獲利或個人化買賣建議。

## 專案隔離規則

1. `taiex-trend-dashboard/` = 台股分析網站 canonical source。
2. 故事／小說創作網站 = 完全獨立專案，不屬於本目錄。
3. 台股排程不得向故事專案寫入資料、建立金融頁面、修改部署或執行市場分析。
4. 故事專案不需要 08:30 / 21:30 市場更新。
5. 若任何文件、程式或部署設定把故事網站指向本台股專案，視為混線問題，修正前不得宣稱部署同步完成。
6. legacy `lumen-*` 檔名僅供相容，不可用來推定專案名稱或部署目標。

## Disclaimer

本台股分析平台僅供市場研究、資料整理與學習。金融資料可能延遲或缺漏；交易前請回到交易所、公開資訊觀測站與公司官方公告核對。本站不構成個人化投資建議。
