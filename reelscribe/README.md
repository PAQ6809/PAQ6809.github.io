# ReelScribe

免費、link-first／local-first 的社群影片與長影片字幕工具，主介面部署於 GitHub Pages。

- 正式站：`https://paq6809.github.io/reelscribe/`
- 支援平台與格式：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 處理順序

1. 使用者貼上或從手機分享公開影片連結。
2. Instagram Reel、影片貼文與 IGTV 先走專用雙層解析；成功後只回傳短效簽章串流，影片不落地儲存。
3. YouTube 先走文字限定的公開字幕後端，取得人工字幕或自動字幕；失敗後再查 timed-text、Piped 與 Invidious。
4. 其他平台查詢既有字幕、公開文字軌與本機快取。
5. 沒有公開字幕時，瀏覽器可使用本機 Whisper、人聲強化，或讀取影片畫面上的燒錄字幕。
6. 完成後提供全文、時間軸、TXT、SRT 與 VTT。

## 儲存空間感知與背景模型準備

ReelScribe 不假設每個瀏覽器都有足夠快取空間。`runtime-optimizer.js` 會在背景工作前檢查：

- `navigator.storage.estimate()` 回報的使用量、配額與估算剩餘空間。
- Persistent Storage 是否已取得。
- Data Saver、2G／slow-2g、裝置類型與電量狀態。
- 手機至少約 220 MB、桌機至少約 420 MB 的保守背景準備門檻。
- 快取使用率是否已達約 86%。

空間或網路受限時，網站會停止背景下載、改用 Whisper Tiny，OCR 也會使用不寫入快取的模式。使用者可按「清除 AI 快取」移除模型與 OCR 快取；網站介面 App Shell 與已輸出的字幕文字不會被刪除。

背景準備只在頁面可見、電量合理、未開啟省流量且儲存空間足夠時，於瀏覽器空閒時啟動：

- 行動裝置預先準備 Whisper Tiny。
- 桌機 WebGPU 預先準備 Whisper Base。
- Small 與 Large-v3-turbo 不會在首頁自動背景下載。

這是 best-effort 加速，不保證瀏覽器永久保留模型。模型仍會在實際辨識時自動重試與降級。

## 穩定更新與防止強制重新整理

Service Worker v14 不呼叫 `skipWaiting()` 或 `clients.claim()`，App 與 UI 也不在 `controllerchange` 後強制 `window.location.reload()`。

新版部署時：

- 目前正在執行的模型下載、OCR 或長影片辨識不會被新版 Worker 中途接管。
- 新版等待既有分頁關閉，於下次開啟時自然套用。
- 介面、Script、CSS、Worker 與 Manifest 採 network-first，避免長期停留在舊程式。
- 舊 App Shell 只清除 `reelscribe-shell-*`，不誤刪模型或 OCR 快取。

`runtime.css` 為進度區、模型狀態與 OCR 控制預留固定高度，模型下載期間停用不必要動畫與 transition，降低文字跳動和 layout shift。

## 畫面字幕 OCR

影片已經燒錄字幕但語音受到音樂干擾時，可展開「讀取影片畫面上的字幕」。此功能使用固定版本 Tesseract.js 7.0.0，完全在瀏覽器處理：

- 只擷取影片下方 35%、45% 或 60% 的畫面區域。
- 手機最多取樣 60 幀，桌機最多 120 幀，避免長影片耗盡記憶體。
- 可選每 1、1.5 或 2.5 秒取樣，長片自動拉大間隔。
- 先做灰階與有限對比增強，再辨識繁體中文、英文、日文或韓文。
- 低於可信度門檻、純符號與重複幻覺會被拒絕。
- 連續相同字幕自動合併，並可取代時間上重疊但較不可靠的語音字幕。
- 每次完成或停止後立即終止 OCR Worker，釋放記憶體。
- 截圖、影片與 OCR 結果不會上傳。

OCR 只適合畫面中真正存在的文字，不是場景理解或自動描述模型；字體過小、動畫字、傾斜文字、強烈特效與低畫質仍可能降低辨識率。

## Instagram 直接連結架構

Instagram 專用流程由私有 Vercel 後端提供：

- `api/instagram-resolve`：無 Cookie 的快速公開解析。
- `api/instagram-yt`：固定版本 yt-dlp 與 curl_cffi 相容解析。
- `api/instagram-media`：只允許 Instagram／Facebook CDN，要求短效 HMAC 簽章、Range request、300 MB 上限與 CORS allowlist。
- `api/health`：自動維護健康檢查。

後端不接受帳號密碼、登入 Cookie、私人 Token，不保存影片或字幕。私人、登入限定、地區／年齡限制、已刪除或被平台封鎖的內容不會繞過權限。

iPhone Safari 優先透過 `window.ReelScribeApp.setFile()` 將暫時串流交給本機字幕引擎，再由 `startTranscription()` 啟動；`DataTransfer` 只作為舊版備援。

## YouTube 公開字幕架構

YouTube 連結會先呼叫 `api/youtube-captions`。此端點使用固定版本 yt-dlp 讀取公開字幕 metadata，只下載字幕文字，不下載或保存影片。

- 支援 watch、Shorts、live、embed 與 youtu.be 連結。
- 人工字幕優先，其次為自動字幕。
- 字幕來源僅允許 HTTPS YouTube／Googlevideo 網域。
- 單次字幕回應上限 4 MB，使用有限逾時。
- 不接受 Cookie、登入狀態、密碼或私人 Token。
- 前端使用 `credentials: omit`、`no-referrer`、`no-store` 與 45 秒逾時。
- 專用後端失敗時仍會回退 timed-text、Piped 與 Invidious。

成功後字幕直接進入既有編輯器，可複製與輸出 TXT、SRT、VTT。

## 語音強化與背景音樂抑制

預設開啟「語音強化」，歌曲或歌詞辨識可手動關閉。處理管線為：

1. 立體聲 Mid／Side 分析，優先保留通常位於中央的人聲。
2. 85 Hz 高通濾除低頻轟聲。
3. 約 2.6 kHz 語音清晰度提升。
4. 約 7.2 kHz 低通減少不必要高頻。
5. 懶載入 Silero VAD v5，找出真正有人聲的區段。
6. 非人聲／純音樂區段衰減至約 2.5%，保留淡入淡出避免切字。
7. 依人聲 RMS 做有限幅度正規化。

Silero VAD 與 ONNX Runtime Web 只在本機辨識且勾選語音強化時載入。VAD 失敗時退回輕量 DSP；沒有清楚人聲時停止產生猜測字幕。

## 自適應辨識模型

ReelScribe 使用四層多語 Whisper ONNX 模型：

- `whisper-tiny`：手機、長影片、低資源裝置與 CPU／WASM。
- `whisper-base`：一般短片及 WebGPU 行動裝置。
- `whisper-small`：桌機 WebGPU 精準模式。
- `whisper-large-v3-turbo`：高階桌機 WebGPU 旗艦模式。

智慧模式依影片長度、WebGPU、行動裝置、記憶體、CPU 核心、Data Saver、網路與儲存空間選擇。自動降級鏈為：

`Large-v3-turbo → Small → Base → Tiny → WASM Base／Tiny`

大型模型不會在手機或低儲存空間下被強制載入。

## 字幕重複與幻覺防護

Whisper 在音樂、噪音、極小音量、錯誤語言或無人聲片段可能產生幻覺。防護現在同時分析：

- 最長連續字元、單一字元占比、唯一字元比例、bigram 多樣性與純符號比例。
- 最常出現單字占比、單字多樣性、連續相同單字。
- 重複的一至四個單字 n-gram 覆蓋率。

因此 `>> >> >>`、單一中文字重複、反覆 `I'm`、重複 `Thank you for watching` 與循環片語都會被攔截。第一次可疑時用更短分段與防重複參數重試；第二次仍不可信便拒絕輸出。

每次復原 localStorage 舊字幕時也會重新套用最新版品質檢查。錯誤結果會被刪除，不再以「已復原上次字幕」留在畫面。

## 平台、格式與長影片

ReelScribe 接受任何公開 HTTPS 頁面作為候選來源，並針對 YouTube、Instagram、TikTok、Facebook、Threads、X、Reddit、Twitch、Vimeo、Dailymotion、PeerTube、Bilibili，以及其他公開影片或 Podcast 頁面辨識網址。

成功仍需要平台提供公開字幕、文字軌或匿名可讀取的公開媒體。私人內容、登入限定、付費牆與 DRM 不支援繞過。

- 影片：MP4、M4V、MOV、WebM、MKV、AVI、WMV、FLV、MPEG／MPG、TS／MTS／M2TS、3GP／3G2、OGV。
- 音訊：MP3、M4A、AAC、WAV、FLAC、Opus、OGG／OGA、WebA、MKA、AMR、AIFF／AIF、CAF、WMA。

長影片採有限視窗、重疊、靜音跳過、背景音樂抑制、低可信區段拒絕及時間戳合併。檔案仍受 300 MB 與瀏覽器記憶體限制，不承諾任意長度影片即時完成。

## 隱私與安全

- 不要求社群密碼、Cookie、私人 Token 或瀏覽器工作階段。
- Instagram 使用短效簽章、CDN allowlist、`no-store`、`credentials: omit` 與 `no-referrer`。
- YouTube 後端只讀取公開字幕，限制字幕網域、大小與逾時，不保存影片。
- 本機 Whisper、DSP、VAD 與 OCR 均在使用者裝置執行。
- OCR 不建立上傳請求或 FormData，不傳送影片幀。
- 外部 runtime、VAD、模型與 OCR 套件固定版本，排程定期檢查公開來源健康狀態。
- 不使用 `document.cookie`、`eval()` 或動態 `Function`。
- 不支援登入繞過、DRM 規避、私人內容抓取或付費牆繞過。

Repository 防護包含 `.github/CODEOWNERS`、`.github/dependabot.yml`、`SECURITY.md` 與 `reelscribe/SECURITY-HARDENING.md`。帳號 2FA、passkey、主分支 ruleset、簽章提交、禁止 force push、secret scanning 與 push protection仍由 repository owner 在 GitHub Settings 開啟。

## 測試與維護

GitHub Actions 在 push、Pull Request、每週一與週四執行：

- JavaScript 語法與 dependency-free 功能測試。
- 儲存配額、背景準備、Data Saver、無強制 reload 與 Service Worker v14 檢查。
- Tesseract.js 7、OCR 取樣、可信度、去重、Worker 清理及本機合併檢查。
- Silero VAD、語音遮罩、頻帶濾波及無人聲降級。
- Turbo／Small／Base／Tiny 裝置分流、混合精度與模型降級。
- Instagram 解析器、iPhone handoff 與 Vercel 健康檢查。
- YouTube caption endpoint contract、公開字幕匯入與瀏覽器來源回退。
- 重複英文單字、短句、中文字與符號幻覺測試。
- HTML、CSS、Manifest、Sitemap、JSON-LD、CSP 與安全檔案。
- Hugging Face 模型、Silero VAD、Tesseract CDN、Noembed、Invidious 與 Piped 健康檢查。
- 正式站核心檔案與 repository 逐一比對，完成後提交 IndexNow。

維護原則：每次先查閱官方或第一手公開資料，再考慮可驗證的小型更新；安全、隱私、穩定與可回復性優先，不因追求新功能自動導入未審查的程式、追蹤器、公共代理或大型模型。