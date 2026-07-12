# ReelScribe

免費、link-first／local-first 的社群影片與長影片字幕工具，部署於 GitHub Pages。

- 正式站：`https://paq6809.github.io/reelscribe/`
- 支援平台與格式：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 處理順序

1. 使用者貼上或從手機分享公開影片連結。
2. 先查詢平台既有字幕、公開文字軌與 30 天本機快取。
3. YouTube 會競速查詢公開 timed-text、Piped 與 Invidious 開源字幕節點。
4. Vimeo、Bilibili、Dailymotion、PeerTube 與公開 VTT／SRT／TTML／XML／JSON 使用各自公開字幕介面。
5. 其他公開 HTTPS 影片頁面會嘗試平台中繼資料與宣告的字幕軌。
6. 沒有公開字幕時，才切換到本機 Whisper、分頁音訊、麥克風或本機影音檔備援。

網站不會為了取得字幕而在 ReelScribe 後端下載或保存原始影片。

## 架構

- 靜態 HTML、CSS、JavaScript
- 多來源字幕 resolver 與平行競速
- 30 天本機連結字幕快取
- 公開節點清單 24 小時本機快取
- Transformers.js + ONNX Whisper 本機備援
- Web Worker 背景辨識
- WebGPU 優先，WASM／CPU 自動降級
- Service Worker App Shell 快取
- PWA Share Target，可從手機社群 App 分享連結至 ReelScribe
- 不需要後端、資料庫、帳號或 API Key

## 平台範圍

ReelScribe 接受任何公開 HTTPS 網頁作為候選影片來源，並針對常見社群與影音平台辨識網址，包括 YouTube、Instagram、TikTok、Facebook、Threads、X、Reddit、Twitch、Vimeo、Dailymotion、PeerTube、Bilibili，以及其他公開影片或 Podcast 頁面。

這不代表每個平台都保證能只靠連結取得語音字幕。直接成功需要平台公開字幕或文字軌；私人內容、登入限定、付費牆、DRM 與沒有匿名字幕介面的內容不支援繞過。

## 影音格式

本機備援接受常見影片與音訊副檔名：

- 影片：MP4、M4V、MOV、WebM、MKV、AVI、WMV、FLV、MPEG／MPG、TS／MTS／M2TS、3GP／3G2、OGV
- 音訊：MP3、M4A、AAC、WAV、FLAC、Opus、OGG／OGA、WebA、MKA、AMR、AIFF／AIF、CAF、WMA

`format-compat.js` 會替缺少 MIME type 的選檔與拖曳檔案補上合理類型。實際能否解碼仍取決於 Safari、Chrome、Edge、作業系統與裝置內建編解碼器；跨裝置最穩定的選擇通常是 MP4（H.264／AAC）、M4A、MP3、WAV 或 WebM。

## 智慧長影片處理

預設使用 `smart` 模式：

- 短片與較強裝置可選擇 Whisper base，提高精度。
- 長影片、手機或資源受限裝置會優先使用 Whisper tiny，提高速度與穩定性。
- 長影片採有限視窗分段辨識，不把全部推論塞進一次呼叫。
- 分段保留重疊區，並在合併時去除重複文字。
- 大段靜音自動跳過，減少無效運算。
- 保留時間戳，可匯出 TXT、SRT、VTT。

本機速度仍取決於影片長度、裝置記憶體、WebGPU、瀏覽器、音訊品質與語言。程式不承諾任意長度影片都能即時完成；大型檔案仍受 300 MB 限制與瀏覽器記憶體上限影響。

## 免費來源

- 平台公開 oEmbed／中繼資料
- Noembed 統一 oEmbed 中繼資料
- YouTube 公開 timed-text
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
- 公開連結解析使用 HTTPS、`credentials: omit` 與 `no-referrer`。
- 主頁加入 Content Security Policy、`object-src 'none'`、`base-uri 'self'` 與 `form-action 'self'`。
- 單一字幕回應設有大小上限與逾時限制。
- 免費字幕節點只接收公開影片 ID 或公開網址，不接收本機媒體、帳號或 Cookie。
- 本機 Whisper 模式下，媒體只在使用者裝置處理。
- 不使用 `document.cookie`、`eval()` 或動態 `Function`。
- 不支援登入繞過、DRM 規避、私人內容抓取或付費牆繞過。

Repository 防護檔案：

- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `SECURITY.md`
- `reelscribe/SECURITY-HARDENING.md`

帳號 2FA、passkey、主分支 ruleset、簽章提交、禁止 force push、必要狀態檢查、secret scanning 與 push protection 必須由 repository owner 在 GitHub Settings 開啟。

## 測試與部署完整性

GitHub Actions 在 push、Pull Request、每週一與週四執行：

- 所有 JavaScript 語法檢查
- dependency-free 功能測試
- VTT／SRT 解析測試
- 社群網址與直接字幕網址正規化
- 智慧模型選擇、靜音偵測與重疊去重測試
- HTML 重複 ID、CSS、Manifest、Sitemap、JSON-LD 驗證
- CSP、禁止 Cookie／eval、安全檔案與 workflow 權限檢查
- Noembed、Invidious 與 Piped 公開來源健康檢查
- 正式站核心檔案與 repository 檔案逐一比對
- 正式部署確認後，透過 IndexNow 提交首頁、支援頁與 sitemap

第三方 GitHub Actions 固定至完整 commit SHA，checkout 不保留寫入憑證，workflow token 維持唯讀。

## 免費推廣

`reelscribe/PROMOTION.md` 包含：

- Threads、X、Bluesky、Mastodon
- Instagram Reels、TikTok、YouTube Shorts
- Dcard、Facebook 社團、校園社群
- Reddit、Hacker News、Indie Hackers
- LinkedIn、DEV Community、Hashnode
- Product Hunt、GitHub Topics 與產品目錄
- UTM 規格、十四天發布節奏與長期內容題材

SEO、社群分享、Sitemap 與 IndexNow 已部署；實際社群貼文與產品目錄送審仍需由各平台帳號持有人依規則發布，網站不會自動灌水、購買假流量或未授權投放付費廣告。

## 維護原則

1. 品質、速度、安全與穩定性優先於新增功能。
2. 不加入必須付費才能運作的核心依賴。
3. 免費節點採競速、逾時、快取與降級，不依賴單一服務。
4. 模型與 CDN 版本固定，升級前先驗證。
5. 保持手機版、桌機版、PWA 與無障礙操作可用。
6. 不以 Cookie 擷取、登入繞過、私人內容抓取或誇大成功率換取功能數量。
