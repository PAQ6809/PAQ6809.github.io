# Lumen 台股分析平台

Lumen 是以「來源優先、資訊去重、時間透明」為核心的台股研究介面。

## 線上位置

- GitHub Pages 備援：`https://paq6809.github.io/taiex-trend-dashboard/`
- 舊 Cloudflare Worker：`https://tw-stock-trend-radar.pinranchen6809.workers.dev/`

> 目前這個 repository 可確認、可寫入的是 GitHub Pages 備援版。Cloudflare Worker 與 `lumen-script.pages.dev` 的可寫原始碼目前未在已連接的 GitHub repository 中定位，因此 README 不宣稱兩者已同步部署。

## Canonical data sources

- TWSE OpenAPI: `https://openapi.twse.com.tw/`
  - `exchangeReport/STOCK_DAY_ALL`：上市日行情
  - `exchangeReport/MI_INDEX`：大盤 / 產業指數
  - `exchangeReport/BWIBBU_ALL`：P/E、殖利率、P/B
  - `exchangeReport/MI_MARGN`：融資融券
  - `opendata/t187ap05_L`：月營收
  - `opendata/t187ap04_L`：每日重大訊息
  - `opendata/t187ap03_L`：公司基本資料
  - `opendata/t187ap06_L_ci`：一般業綜合損益表
  - `opendata/t187ap07_L_ci`：一般業資產負債表
  - `opendata/t187ap47_L`：基金基本資料
- TPEx OpenAPI: `https://www.tpex.org.tw/openapi/`
  - `tpex_mainboard_quotes`：上櫃行情
  - `tpex_mainboard_peratio_analysis`：P/E、殖利率、P/B
  - `tpex_mainboard_margin_balance`：融資融券
  - `tpex_3insti_summary`：三大法人彙總
- MOPS: `https://mops.twse.com.tw/mops/web/index`
- TAIFEX: `https://www.taifex.com.tw/`

## Transparency rules

1. 原始資料日期與 Lumen 抓取時間分開顯示。
2. API 失敗、缺漏或延遲時顯示「尚未取得 / 資料延遲 / 待驗證」，不補猜測值。
3. 原始事實、計算指標、規則解讀與風險限制分開。
4. MA / RSI / MACD 是由官方歷史價格在瀏覽器端計算，不是交易所原始欄位。
5. TAIFEX 法人資料不解讀成單一法人或整個法人類別的一致策略。
6. 觀察、排序與市場解讀僅供研究，不代表買賣建議或獲利保證。

## Current v2 capabilities

- 市場總覽、產業指數與成交熱門
- TWSE + TPEx 合併搜尋
- 個股日行情與官方原始來源
- K 線資料與 MA5 / MA20 / RSI14 / MACD
- 上市公司月營收、財報與公司基本資料
- 上市 / 上櫃估值
- ETF / 基金瀏覽
- 上市 / 上櫃融資融券
- 上市重大訊息 + 上櫃 MOPS canonical link
- TAIFEX 官方法人 / 期權資料入口與解讀限制
- LocalStorage 關注清單
- 來源健康狀態與功能工作清單

## Known constraints

- GitHub Pages 是靜態備援站；若官方來源禁止跨網域讀取，該模組會明確顯示失敗，不使用第三方不透明 proxy。
- 多使用者 Auth / 雲端 watchlist 尚未接上已確認的 backend，因此不會偽裝成已完成。
- 正式 Cloudflare Worker / `lumen-script.pages.dev` 尚未在本次可用 GitHub connector 中找到可寫 source。
- ChatGPT 的 Lumen 雙時段排程已定義為每日 08:30 / 21:30 Asia/Taipei，但目前 active task 配額已滿，任務暫時維持停用。

## Disclaimer

Lumen 僅供市場研究、資料整理與學習。金融資料可能延遲或缺漏；交易前請回到交易所、公開資訊觀測站與公司官方公告核對。本站不構成個人化投資建議。
