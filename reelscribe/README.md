# ReelScribe

免費、link-first／local-first 的社群影片字幕工具，部署於 GitHub Pages。

正式站：`https://paq6809.github.io/reelscribe/`

## 處理順序

1. 使用者貼上或從手機分享公開影片連結。
2. 先查詢平台既有字幕、公開文字軌與本機快取。
3. 對 YouTube 並行競速查詢公開 timed-text、Piped 與 Invidious 開源字幕節點。
4. Vimeo、Bilibili、Dailymotion、PeerTube 與公開 VTT／SRT／TTML／XML／JSON 字幕使用各自公開介面。
5. 沒有公開字幕時，才切換到本機 Whisper、分頁音訊擷取或本機檔案備援。

網站不會為了取字幕下載或保存原始影片檔。

## 架構

- 靜態 HTML、CSS、JavaScript
- 多來源字幕 resolver 與平行競速
- 30 天本機連結字幕快取
- 公開節點清單 24 小時本機快取
- Transformers.js + ONNX Whisper 本機備援
- Web Worker 背景辨識
- WebGPU 優先，WASM／CPU 自動降級
- Service Worker 快取 App Shell
- PWA Share Target，可從手機社群 App 分享連結至 ReelScribe
- 不需要後端、資料庫、帳號或 API Key

## 免費來源

- 平台公開 oEmbed／中繼資料
- Noembed 統一 oEmbed 中繼資料
- YouTube 公開 timed-text（瀏覽器允許時）
- Piped 公開開源節點
- Invidious 公開開源節點
- Vimeo 公開文字軌
- Bilibili 公開字幕介面
- Dailymotion 公開字幕資料
- PeerTube 公開 captions API
- 公開 VTT、SRT、TTML、XML 與相容 JSON 字幕
- 本機 Whisper 備援

## 隱私與安全

- 不要求社群帳號密碼、Cookie、私人 Token 或瀏覽器工作階段。
- 公開連結解析只使用 `HTTPS`、`credentials: omit` 與 `no-referrer`。
- 單一字幕回應設有 6 MB 上限與逾時限制。
- 使用免費社群字幕節點時，只會送出公開影片 ID 或公開網址；不會傳送使用者帳號資料或本機媒體檔。
- 本機 Whisper 模式下，媒體只在使用者裝置處理。
- 不支援私人、登入限定、付費牆或需要繞過權限的內容。

## 支援

- YouTube／Shorts 既有字幕
- Vimeo、Bilibili、Dailymotion、PeerTube 公開字幕
- Instagram、TikTok、Facebook、Threads、X、Reddit、Twitch 與一般影片頁面的公開中繼資料與可宣告字幕軌
- 公開字幕檔連結
- 上傳影片或音訊的本機 Whisper 備援
- 桌機分頁音訊擷取備援
- 麥克風錄音備援
- 中文、英文、日文、韓文與自動語言選擇
- 簡體轉台灣繁體與詞彙轉換
- 可編輯完整逐字稿與時間軸
- 匯出 TXT、SRT、VTT
- PWA 安裝與手機分享

## 平台限制

部分社群平台不向匿名網頁提供語音字幕軌，或會阻擋跨網域讀取。這種情況網站會明確顯示「無公開字幕」，不會把貼文說明、標題或留言冒充成影片語音字幕，也不會要求 Cookie、繞過登入或抓取私人內容。

## 免費與耐久性

核心路徑沒有每次使用費用。GitHub Pages 只負責靜態介面；字幕以公開文字軌、本機快取或使用者裝置推論完成。免費第三方節點可能個別故障，因此採多節點競速與自動降級，任何單一供應者都不是核心單點。

沒有任何第三方免費服務能被保證永久不改政策，但此架構沒有專有後端、資料庫或付費 API 鎖定，整個 `reelscribe/` 目錄可隨時搬到其他靜態主機或本機執行。

## 自動維護

GitHub Actions 在 push、Pull Request、每週一與週四執行：

- JavaScript 語法檢查
- PWA manifest 驗證
- 必要檔案與 script wiring 檢查
- Noembed、Invidious 與 Piped 公開來源健康檢查
- 正式站存活與新版 resolver 部署檢查

## 維護原則

1. 品質、速度與穩定性優先於新增功能。
2. 不加入必須付費才能運作的核心依賴。
3. 免費節點採競速、逾時、快取與降級，不把任何單一節點當成永久依賴。
4. 模型與 CDN 版本固定，升級前先驗證。
5. 保持手機版、桌機版與無障礙操作可用。
6. 不以登入繞過、Cookie 擷取或私人內容抓取換取成功率。