# ReelScribe

免費、link-first／local-first 的社群影片與長影片字幕工具，主介面部署於 GitHub Pages。

- 正式站：`https://paq6809.github.io/reelscribe/`
- 支援平台與格式：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 處理順序

1. 使用者貼上或從手機分享公開影片連結。
2. Instagram Reel、影片貼文與 IGTV 先走專用雙層解析；成功後只回傳短效簽章串流，影片不落地儲存。
3. 其他平台先查詢既有字幕、公開文字軌與本機快取。
4. 沒有公開字幕時，瀏覽器解碼音訊並在本機執行語音強化與 Whisper。
5. 模型下載、音訊解碼及 Silero VAD 會重疊執行，減少串行等待。
6. 完成後提供可編輯全文、時間軸、TXT、SRT 與 VTT。

## Instagram 直接連結架構

Instagram 專用流程由私有 Vercel 後端提供：

- `api/instagram-resolve`：無 Cookie 的快速公開解析。
- `api/instagram-yt`：使用固定版本 yt-dlp 與 curl_cffi 的相容解析。
- `api/instagram-media`：只允許 Instagram／Facebook CDN，並要求短效 HMAC 簽章、Range request、300 MB 上限與 CORS allowlist。
- `api/health`：自動維護健康檢查。

後端不接受帳號密碼、登入 Cookie、私人 Token，不保存影片或字幕。私人、登入限定、地區限制、年齡限制、已刪除或被平台封鎖的內容不會繞過權限。

iPhone Safari 優先透過 `window.ReelScribeApp.setFile()` 將暫時串流交給本機字幕引擎，再由 `startTranscription()` 啟動；`DataTransfer` 只作為舊版備援。

## 語音強化與背景音樂抑制

預設開啟「語音強化」，但歌曲或歌詞辨識可手動關閉。處理管線為：

1. 立體聲 Mid／Side 分析，優先保留通常位於中央的人聲。
2. 85 Hz 高通濾除低頻轟聲。
3. 約 2.6 kHz 語音清晰度提升。
4. 約 7.2 kHz 低通減少不必要高頻。
5. 懶載入 Silero VAD v5，找出真正有人聲的區段。
6. 非人聲／純音樂區段衰減至約 2.5%，保留短淡入淡出避免切字。
7. 依人聲 RMS 做有限幅度正規化。

Silero VAD 與 ONNX Runtime Web 只在使用本機辨識且勾選語音強化時載入。VAD 失敗時會退回輕量 DSP，不會中斷整個網站。沒有偵測到清楚人聲時，系統停止產生猜測字幕，而不是把音樂誤認成文字。

## 自適應辨識模型

ReelScribe 使用四層多語 Whisper ONNX 模型，均可透過 Transformers.js 在瀏覽器執行：

- `whisper-tiny`：手機、長影片、低資源裝置與 CPU／WASM。
- `whisper-base`：一般短片及 WebGPU 行動裝置。
- `whisper-small`：桌機 WebGPU 精準模式。
- `whisper-large-v3-turbo`：高階桌機 WebGPU 旗艦模式。

智慧模式依影片長度、WebGPU、是否為行動裝置、記憶體、CPU 核心、Data Saver 與網路狀態選擇：

- 高階桌機 WebGPU、快速網路、8 分鐘內：Large-v3-turbo。
- 高階桌機 WebGPU、20 分鐘內：Small。
- 一般 WebGPU、15 分鐘內：Base。
- 手機、長影片、Data Saver、低資源或大型模型失敗：Tiny／Base。

旗艦模型使用 per-module `q4f16` 混合精度；Small／Base／Tiny 的 WebGPU 優先採 encoder FP16、decoder q4f16，若瀏覽器驅動不相容再退回完整 FP16。WASM 使用 q8。自動降級鏈為：

`Large-v3-turbo → Small → Base → Tiny → WASM Base／Tiny`

大型模型不會在手機被強制載入。首次載入仍可能較久，但模型會由瀏覽器快取；網站也會申請 persistent storage，並在開始解碼影片的同時背景準備模型。

## 字幕重複與幻覺防護

Whisper 在音樂、噪音、極小音量、錯誤語言或無人聲片段可能產生幻覺。ReelScribe 的防護包含：

- 最長連續字元
- 單一字元占比
- 唯一字元比例
- bigram 多樣性
- 重複短週期模式
- 純符號比例

因此 `>> >> >>`、單一中文字重複及循環片語都會被攔截。第一次可疑時使用較短分段、`repetition_penalty`、`no_repeat_ngram_size` 與有限輸出長度重試；第二次仍不可信便拒絕輸出。長影片只略過低可信區段，其餘可信區段繼續合併。前端會清除本機已保存的錯誤字幕。

## PWA 更新與快取

Service Worker v12 對 HTML、JavaScript、CSS、Worker 與 Manifest 採 network-first；圖示等非關鍵資產採 cache-first。`updateViaCache: "none"`、主動 `registration.update()` 與每個 build 一次的 reload guard，可避免 Safari 持續執行舊模型程式。

模型權重由 Transformers.js 的瀏覽器快取管理；媒體串流與 Instagram 影片不會寫入永久快取。

## 平台與格式

ReelScribe 接受任何公開 HTTPS 頁面作為候選來源，並針對 YouTube、Instagram、TikTok、Facebook、Threads、X、Reddit、Twitch、Vimeo、Dailymotion、PeerTube、Bilibili，以及其他公開影片或 Podcast 頁面辨識網址。

成功仍需要平台提供公開字幕、文字軌或匿名可讀取的公開媒體。私人內容、登入限定、付費牆與 DRM 不支援繞過。

- 影片：MP4、M4V、MOV、WebM、MKV、AVI、WMV、FLV、MPEG／MPG、TS／MTS／M2TS、3GP／3G2、OGV。
- 音訊：MP3、M4A、AAC、WAV、FLAC、Opus、OGG／OGA、WebA、MKA、AMR、AIFF／AIF、CAF、WMA。

實際能否解碼仍取決於瀏覽器與作業系統。跨裝置最穩定格式通常是 MP4（H.264／AAC）、M4A、MP3、WAV 或 WebM。

## 長影片

長影片採有限視窗、重疊、靜音跳過、背景音樂抑制、低可信區段拒絕及時間戳合併。本機速度仍取決於影片長度、裝置記憶體、WebGPU、音訊品質與語言；程式不承諾任意長度影片即時完成，檔案仍受 300 MB 與瀏覽器記憶體限制。

## 隱私與安全

- 不要求社群密碼、Cookie、私人 Token 或瀏覽器工作階段。
- Instagram 使用短效簽章、CDN allowlist、`no-store`、`credentials: omit` 與 `no-referrer`。
- 本機 Whisper、DSP 與 VAD 均在使用者裝置執行。
- 不使用 `document.cookie`、`eval()` 或動態 `Function`。
- 不支援登入繞過、DRM 規避、私人內容抓取或付費牆繞過。
- 外部模型與 runtime 固定版本並接受自動健康檢查。

Repository 防護包含 `.github/CODEOWNERS`、`.github/dependabot.yml`、`SECURITY.md` 與 `reelscribe/SECURITY-HARDENING.md`。帳號 2FA、passkey、主分支 ruleset、簽章提交、禁止 force push、secret scanning 與 push protection仍由 repository owner 在 GitHub Settings 開啟。

## 測試與維護

GitHub Actions 在 push、Pull Request、每週一與週四執行：

- JavaScript 語法與 dependency-free 功能測試。
- Silero VAD、語音遮罩、頻帶濾波及無人聲降級。
- Turbo／Small／Base／Tiny 裝置分流、混合精度、背景預載與模型降級。
- `>>`、單一中文字及正常繁體中文的幻覺回歸測試。
- Instagram 解析器、iPhone handoff、Vercel 健康檢查。
- PWA v12、HTML、CSS、Manifest、Sitemap、JSON-LD、CSP 與安全檔案。
- Hugging Face 四個模型、Silero VAD、Noembed、Invidious、Piped 健康檢查。
- 正式站核心檔案與 repository 逐一比對，完成後提交 IndexNow。

維護原則：品質、速度、安全與穩定性優先；不以 Cookie 擷取、登入繞過、私人內容抓取或誇大成功率換取功能數量。