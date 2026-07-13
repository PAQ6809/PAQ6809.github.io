# ReelScribe

免費、link-first／local-first 的社群影片與長影片字幕工具，主介面部署於 GitHub Pages。

- 正式站：`https://paq6809.github.io/reelscribe/`
- 支援平台與格式：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 處理順序

1. 使用者貼上或從手機分享公開影片連結。
2. Instagram Reel、影片貼文與 IGTV 先走專用雙層解析：輕量公開端點／頁面解析，失敗後再使用固定版本 yt-dlp 與瀏覽器模擬相容層。
3. 成功時後端只回傳 10 分鐘有效的簽章串流網址，影片不落地儲存；瀏覽器暫時讀取後交給本機 Whisper。
4. 其他平台先查詢平台既有字幕、公開文字軌與 30 天本機快取。
5. YouTube 競速查詢公開 timed-text、Piped 與 Invidious；Vimeo、Bilibili、Dailymotion、PeerTube 與公開 VTT／SRT／TTML／XML／JSON 使用各自公開字幕介面。
6. 沒有公開字幕或平台阻擋匿名解析時，切換到分頁音訊、麥克風或本機影音檔備援。

## Instagram 直接連結架構

Instagram 專用流程由私有 Vercel 後端提供：

- `api/instagram-resolve`：無 Cookie 的快速公開解析。
- `api/instagram-yt`：使用固定版本 `yt-dlp 2026.7.4` 與 `curl_cffi` 的相容解析。
- `api/instagram-media`：只允許 Instagram／Facebook CDN，並要求短效 HMAC 簽章、Range request、300 MB 上限與 CORS allowlist。
- `api/health`：自動維護健康檢查。

後端不接受帳號密碼、登入 Cookie、私人 Token，不保存影片或字幕。Instagram 隨時可能更改匿名存取方式，因此私人、登入限定、地區限制、年齡限制或被平台封鎖的內容仍會誠實降級，而不是繞過權限。

iPhone Safari 會優先透過 `window.ReelScribeApp.setFile()` 將暫時串流交給本機字幕引擎，再由 `startTranscription()` 啟動；只有舊瀏覽器才退回 `DataTransfer` 模擬選檔，避免行動裝置因無法寫入 `input.files` 而中斷。

## 字幕重複與幻覺防護

Whisper 在音樂、噪音、極小音量、語言判斷錯誤或沒有清楚人聲時，可能產生大量重複字元。ReelScribe 現在加入雙層防護：

- Worker 會分析最長連續字元、單一字元占比與雙字元多樣性。
- 偵測到疑似重複幻覺時，先以較短分段、`repetition_penalty`、`no_repeat_ngram_size` 與輸出長度限制自動重試。
- 第二次仍不可信時，直接停止輸出，而不是把重複文字標示為完成字幕。
- 長影片只略過出現重複幻覺的低可信區段，其餘可信區段仍可繼續合併。
- 前端會清除已保存在本機的重複錯誤字幕，並隱藏低可信結果。

使用者看到「已攔截低可信字幕」時，應確認影片內有清楚人聲，並在語言選單指定中文、英文、日文或韓文後重新辨識。

## PWA 更新與舊快取修復

Service Worker v10 對 HTML、JavaScript、CSS、Worker 與 Manifest 採 network-first；圖示等非關鍵靜態資產才採 cache-first。註冊時使用 `updateViaCache: "none"` 並主動檢查更新，新控制器每個 build 最多重新整理一次，避免舊 Worker 繼續輸出已修正的錯誤結果。

手機版在 680px 以下不使用 sticky header，避免 Safari 回復捲動位置時遮住主標題；解析來源標籤會在卡片內換行，不會再超出螢幕。

## 架構

- GitHub Pages：靜態 HTML、CSS、JavaScript、PWA 與本機 Whisper。
- Vercel Functions：Instagram 公開影片解析與短效串流代理。
- 多來源字幕 resolver 與平行競速。
- 30 天本機連結字幕快取。
- Transformers.js + ONNX Whisper、Web Worker、WebGPU 優先與 WASM／CPU 降級。
- Network-first Service Worker App Shell 更新與 PWA Share Target。
- 核心功能不需要使用者帳號或 API Key。

## 平台範圍

ReelScribe 接受任何公開 HTTPS 網頁作為候選影片來源，並針對 YouTube、Instagram、TikTok、Facebook、Threads、X、Reddit、Twitch、Vimeo、Dailymotion、PeerTube、Bilibili，以及其他公開影片或 Podcast 頁面辨識網址。

這不代表每個平台都保證能只靠連結取得語音字幕。成功需要公開字幕、公開文字軌，或平台允許匿名讀取公開媒體；私人內容、登入限定、付費牆、DRM 與沒有匿名介面的內容不支援繞過。

## 影音格式

- 影片：MP4、M4V、MOV、WebM、MKV、AVI、WMV、FLV、MPEG／MPG、TS／MTS／M2TS、3GP／3G2、OGV。
- 音訊：MP3、M4A、AAC、WAV、FLAC、Opus、OGG／OGA、WebA、MKA、AMR、AIFF／AIF、CAF、WMA。

`format-compat.js` 會補正缺少的 MIME type。實際能否解碼仍取決於瀏覽器、作業系統與裝置編解碼器；跨裝置最穩定的選擇通常是 MP4（H.264／AAC）、M4A、MP3、WAV 或 WebM。

## 智慧長影片處理

預設 `smart` 模式會依影片長度、WebGPU 與裝置資源在 Whisper base 和 tiny 間選擇。長影片採有限視窗、重疊、靜音跳過、重複文字合併與低可信區段攔截，保留時間戳並輸出 TXT、SRT、VTT。

本機速度仍取決於影片長度、裝置記憶體、WebGPU、瀏覽器、音訊品質與語言。程式不承諾任意長度影片都能即時完成；大型檔案仍受 300 MB 與瀏覽器記憶體限制。

## 隱私與安全

- 不要求社群帳號密碼、Cookie、私人 Token 或瀏覽器工作階段。
- Instagram 解析使用公開網址、短效簽章、CDN host allowlist、`no-store`、`credentials: omit` 與 `no-referrer`。
- 串流代理只允許 HTTPS Instagram／Facebook CDN，並限制大小、逾時與來源。
- 主頁使用 Content Security Policy、`object-src 'none'`、`base-uri 'self'` 與 `form-action 'self'`。
- 本機 Whisper 媒體只在使用者裝置處理。
- 不使用 `document.cookie`、`eval()` 或動態 `Function`。
- 不支援登入繞過、DRM 規避、私人內容抓取或付費牆繞過。

Repository 防護包含 `.github/CODEOWNERS`、`.github/dependabot.yml`、`SECURITY.md` 與 `reelscribe/SECURITY-HARDENING.md`。帳號 2FA、passkey、主分支 ruleset、簽章提交、禁止 force push、secret scanning 與 push protection仍需由 repository owner 在 GitHub Settings 開啟。

## 測試與部署完整性

GitHub Actions 在 push、Pull Request、每週一與週四執行：

- 所有 JavaScript 語法與 dependency-free 功能測試。
- Instagram 專用解析器、腳本順序、iPhone App API handoff、無 Cookie／no-referrer、300 MB 上限及 Vercel `/api/health`。
- Service Worker network-first、cache version、`updateViaCache: none` 與 reload-loop guard。
- Whisper 重複幻覺偵測、重試參數、低可信輸出拒絕與本機舊錯誤字幕清除。
- VTT／SRT、社群網址、智慧模型、靜音偵測、長影片重疊去重。
- HTML、CSS、Manifest、Sitemap、JSON-LD、CSP 與安全檔案。
- Noembed、Invidious、Piped 健康檢查。
- 正式站 `index.html`、`app.js`、`ui.js`、`ui-polish.css`、Instagram resolver、Worker 與 Service Worker 逐一比對，完成後提交 IndexNow。

第三方 GitHub Actions 固定至完整 commit SHA，checkout 不保留寫入憑證，workflow token 維持唯讀。

## 免費推廣與維護

`reelscribe/PROMOTION.md` 包含各社群文案、UTM、十四天發布節奏與長期內容題材。SEO、社群分享、Sitemap 與 IndexNow 已部署；實際社群貼文仍需由帳號持有人依平台規則發布。

維護原則：品質、速度、安全與穩定性優先；免費來源採競速、逾時與降級；模型與解析器版本固定；不以 Cookie 擷取、登入繞過、私人內容抓取或誇大成功率換取功能數量。