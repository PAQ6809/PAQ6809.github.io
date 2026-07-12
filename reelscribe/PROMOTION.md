# ReelScribe 免費推廣與廣告佈置

正式網址：`https://paq6809.github.io/reelscribe/`

支援說明：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 定位

- 一句話：貼上公開影片連結取得字幕；沒有公開文字軌時，使用本機 AI 處理常見影音檔與長影片。
- 差異化：免費、免登入、無 API Key、公開字幕優先、本機 Whisper、智慧長片分段、字幕檔匯出、無追蹤器。
- 主要受眾：學生、內容創作者、語言學習者、社群小編、研究與筆記工作者、Podcast 與課程整理者。
- 誠實邊界：網站接受各類公開 HTTPS 影片頁面，但只靠連結取得字幕仍取決於平台是否公開字幕軌。

## 已自動部署的免費曝光

- canonical、Open Graph、Twitter Card、SoftwareApplication JSON-LD
- sitemap.xml 與 robots.txt
- `supported-platforms.html` 長尾搜尋內容頁
- PWA Share Target 與網站原生分享按鈕
- 社群分享圖
- IndexNow 所有權金鑰
- GitHub Actions 在正式部署驗證後，自動將首頁、支援頁與 sitemap 提交至 IndexNow
- UTM 來源規格

這些機制不需要廣告預算，也不加入第三方追蹤器。

## UTM 規格

所有對外連結使用：

```text
https://paq6809.github.io/reelscribe/?utm_source={platform}&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content={post_id}
```

平台名稱建議：

`instagram`、`threads`、`tiktok`、`youtube`、`x`、`reddit`、`dcard`、`producthunt`、`github`、`linkedin`、`facebook`、`bluesky`、`mastodon`、`devto`、`hashnode`、`hackernews`、`indiehackers`、`discord`、`telegram`。

## 核心發布素材

### Threads／X／Bluesky／Mastodon

```text
我做了一個免費影片字幕工具 ReelScribe。

貼上公開影片連結，網站會先找平台公開字幕；沒有字幕時，可以用本機 Whisper 處理常見影音格式。長影片會自動分段、跳過大段靜音並保留時間軸。

免登入、無 API Key，可複製全文或匯出 TXT、SRT、VTT。

https://paq6809.github.io/reelscribe/?utm_source=threads&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content=long_video_01
```

### Instagram／TikTok／YouTube Shorts 影片腳本（20–30 秒）

```text
0–3 秒：一小時影片還在手動抄字幕嗎？
3–7 秒：複製公開影片連結，貼進 ReelScribe。
7–12 秒：有公開字幕就直接抓文字軌。
12–18 秒：沒有字幕，改用本機 AI；長片自動分段並跳過靜音。
18–23 秒：字幕完成後直接複製，或下載 SRT、VTT。
23–28 秒：免費、免登入、影片不必上傳 ReelScribe 伺服器。
28–30 秒：網址放在個人檔案或留言。
```

畫面必須實際錄製操作，不使用偽造速度、不聲稱所有平台或所有格式必定成功。

### Instagram／TikTok 圖文輪播

1. 第一張：`長影片轉字幕，不用一直等到最後。`
2. 第二張：`公開字幕優先，最快取得現成文字軌。`
3. 第三張：`沒有字幕時，本機 Whisper 智慧分段。`
4. 第四張：`支援常見影音格式，輸出 TXT／SRT／VTT。`
5. 第五張：`免費、免登入、無 API Key。`

### Dcard／校園社群

標題：

```text
分享一個免費影片字幕工具：公開連結、課程錄影和長影片都能整理
```

正文：

```text
最近整理課程、短影片、Podcast 和外語內容時，常常只想快速取得可以複製的字幕，所以做了 ReelScribe。

使用方式：
1. 貼上公開影片連結，先查平台公開字幕。
2. 沒有字幕時，選擇本機影音檔。
3. 長影片會分段處理、跳過大段靜音並保留時間軸。
4. 結果可複製，或匯出 TXT、SRT、VTT。

免登入、無 API Key，本機辨識時檔案不會上傳 ReelScribe 後端。
部分平台沒有匿名公開字幕，因此不是每個連結都能直接成功；網站會直接說明限制。

https://paq6809.github.io/reelscribe/?utm_source=dcard&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content=campus_long_01
```

### Reddit／Hacker News／開發者社群

英文標題：

```text
Show: ReelScribe — free link-first captions with local long-form Whisper fallback
```

英文正文：

```text
I built ReelScribe, a free browser-based subtitle tool.

It checks publicly available caption tracks first. When captions are unavailable, users can process common local media formats with on-device Whisper. Long recordings are handled in overlapping windows, mostly silent windows are skipped, and timestamps are preserved for TXT, SRT, and VTT exports.

The core flow has no account, API key, backend upload, or analytics tracker.

I would appreciate feedback on browser codec support, long-form accuracy, WebGPU performance, and the mobile flow.
```

先閱讀各社群規則，避免重複貼文、灌水、跨版洗版或只貼連結。

### LinkedIn

```text
I built ReelScribe, a free privacy-first subtitle utility for public video links and local media.

It prioritizes existing public caption tracks, then falls back to on-device Whisper. The new long-form pipeline uses adaptive model selection, overlapping chunks, silence skipping, and timestamp-preserving exports.

Useful for lectures, interviews, social clips, podcasts, research notes, and accessibility workflows.
```

### Product Hunt

名稱：`ReelScribe`

Tagline：

```text
Public captions first, private on-device transcription when needed
```

簡介：

```text
ReelScribe checks public caption tracks across video platforms and provides a local Whisper fallback for common media formats. Smart mode balances speed and accuracy, while long recordings are segmented with overlap and silence skipping. No account, API key, backend media upload, or analytics tracker is required for the core flow.
```

第一則留言應說明：製作原因、隱私設計、長片處理、已知平台與瀏覽器編解碼限制、希望取得的回饋。

### GitHub README／個人網站

加入清楚 CTA：

```text
ReelScribe — 免費社群與長影片字幕工具
公開字幕優先；沒有字幕時，以本機 Whisper 處理常見影音格式並匯出 TXT、SRT、VTT。
```

可加入 GitHub Topics：

`whisper`、`speech-to-text`、`subtitles`、`transcription`、`webgpu`、`pwa`、`privacy`、`accessibility`、`video-tools`。

## 免費發布管道

### 搜尋與產品探索

- Google Search Console：驗證網站、提交 sitemap、查看索引與搜尋字詞。
- Bing Webmaster Tools：提交 sitemap，搭配已自動化的 IndexNow。
- Product Hunt：免費產品發布與早期使用者回饋。
- GitHub：README、Topics、Discussions、個人 Profile README。
- AlternativeTo、SaaSHub、OpenAlternative 等產品目錄：先確認當下免費提交規則，再人工送審。

### 創作者與社群平台

- Instagram Reels、Threads
- TikTok 與 TikTok Creative Center 的熱門題材觀察
- YouTube Shorts 與教學長片
- X、Bluesky、Mastodon
- LinkedIn 個人貼文與相關社團
- Facebook 公開社團
- Dcard、校園社團與系所社群
- Reddit、Hacker News Show HN、Indie Hackers
- DEV Community、Hashnode
- Discord、Telegram 公開社群

發布前必須閱讀各平台規則。不要大量私訊、購買假流量、交換假讚、洗留言或假裝使用者推薦。

## 十四天免費推廣節奏

1. 第一天：Threads／X 發布產品故事與網址。
2. 第二天：Instagram Reel／TikTok 發布 20–30 秒真實操作。
3. 第三天：Dcard 或校園社群發布課程與長影片情境。
4. 第四天：YouTube Shorts 發布「三步取得字幕」。
5. 第五天：GitHub README、Profile README、Topics 更新。
6. 第六天：LinkedIn 分享技術與隱私架構。
7. 第七天：整理真實回饋，發布第一輪修正。
8. 第八天：Reddit 或 Hacker News 發布技術版介紹。
9. 第九天：發布「SRT、VTT、TXT 差異」教學。
10. 第十天：發布「為何有些 IG／TikTok 連結沒有公開字幕」說明。
11. 第十一天：發布長影片分段與 WebGPU 效能展示。
12. 第十二天：向合適的 Discord／Telegram／校園社群分享。
13. 第十三天：準備 Product Hunt 圖片、Tagline、留言與 FAQ。
14. 第十四天：Product Hunt 正式發布並回覆真實留言。

## 長期內容題材

- 如何取得 YouTube／短影片字幕。
- Instagram、TikTok、Facebook 為何可能無法只靠連結取得語音字幕。
- MP4、MOV、MKV、WebM、MP3、M4A、WAV、FLAC 的相容性。
- SRT、VTT、TXT 的差異。
- 一小時課程、訪談或 Podcast 如何轉成逐字稿。
- WebGPU 與 CPU 模式的速度差異。
- 語言學習者如何用逐字稿複習。
- 本機 AI 與雲端字幕工具的隱私差異。
- 字幕抓不到時的合法備援方式。
- 新增平台、格式或準確度修正紀錄。

## 帳號持有人仍需人工完成

1. 在 Google Search Console 驗證網站並提交 sitemap。
2. 在 Bing Webmaster Tools 驗證或匯入網站。
3. 建立或登入 Product Hunt、Instagram、TikTok、YouTube、Threads、Dcard、Reddit、LinkedIn 等帳號。
4. 依平台規則發布已準備的素材並回覆留言。
5. 為 GitHub repository 設定 Topics 與社群預覽。
6. 付費廣告必須另行確認預算、地區、受眾、付款方式與轉換追蹤；未經明確授權不執行。

## 衡量方式

現階段不植入第三方追蹤器。推廣成效先用：

- 各平台貼文瀏覽、收藏、轉發、留言與個人檔案點擊。
- UTM 連結區分來源。
- Search Console 的曝光、點擊與搜尋字詞。
- Bing Webmaster Tools 與 IndexNow 狀態。
- GitHub traffic、stars、forks、issues 與 discussions。
- 使用者回報的成功平台、失敗平台、格式、影片長度與裝置型號。

未來加入分析工具時，優先採用不收集字幕、影片連結、媒體檔或個人資料的隱私友善方案。
