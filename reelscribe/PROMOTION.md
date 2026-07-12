# ReelScribe 免費推廣與廣告佈置

正式網址：`https://paq6809.github.io/reelscribe/`

支援說明：`https://paq6809.github.io/reelscribe/supported-platforms.html`

## 定位

- 一句話：貼上公開 Instagram Reel、影片貼文或其他公開影片連結取得字幕；沒有現成字幕時，以本機 AI 產生逐字稿。
- 差異化：Instagram 公開影片雙層解析、公開字幕優先、本機 Whisper、智慧長片分段、TXT／SRT／VTT、免登入、無 API Key、無追蹤器。
- 主要受眾：學生、內容創作者、語言學習者、社群小編、研究與筆記工作者、Podcast 與課程整理者。
- 誠實邊界：Instagram 直接解析屬 best-effort。私人、登入限定、地區／年齡限制、移除或被平台封鎖的內容不保證成功，也不繞過權限。

## 已部署的免費曝光

- canonical、Open Graph、Twitter Card、SoftwareApplication JSON-LD。
- sitemap.xml、robots.txt、支援平台長尾搜尋頁。
- PWA Share Target、網站原生分享、社群分享圖。
- IndexNow 金鑰與正式部署後自動提交。
- UTM 來源規格，不加入第三方追蹤器。

所有對外連結使用：

```text
https://paq6809.github.io/reelscribe/?utm_source={platform}&utm_medium=organic&utm_campaign=instagram_direct_launch&utm_content={post_id}
```

平台名稱可使用 `instagram`、`threads`、`tiktok`、`youtube`、`x`、`reddit`、`dcard`、`producthunt`、`github`、`linkedin`、`facebook`、`bluesky`、`mastodon`、`devto`、`hashnode`、`hackernews`、`indiehackers`、`discord`、`telegram`。

## 核心發布素材

### Threads／X／Bluesky／Mastodon

```text
我把 ReelScribe 的 Instagram 流程更新了。

現在貼上公開 Instagram Reel 或影片貼文，網站會先嘗試無 Cookie 的公開解析；成功後只把影片暫時串流到目前裝置，再由本機 Whisper 產生字幕。也能複製全文或匯出 TXT、SRT、VTT。

私人、登入限定或被 Instagram 阻擋的貼文不會繞過權限，會改用本機檔案或分頁音訊備援。

https://paq6809.github.io/reelscribe/?utm_source=threads&utm_medium=organic&utm_campaign=instagram_direct_launch&utm_content=launch_01
```

### Instagram Reel／TikTok／YouTube Shorts 腳本（20–30 秒）

```text
0–3 秒：Instagram Reel 字幕還在手動抄？
3–7 秒：複製公開 Reel 連結，貼進 ReelScribe。
7–12 秒：網站先嘗試公開、無 Cookie 的 Instagram 解析。
12–18 秒：影片只暫時進入目前裝置，本機 AI 自動產生字幕。
18–24 秒：複製全文，或下載 SRT、VTT。
24–30 秒：免費、免登入；私人或受限制貼文不會繞過權限。
```

畫面必須使用真實公開 Reel 測試。不得剪掉失敗畫面來偽造 100% 成功率，也不得聲稱所有 Instagram 連結都可解析。

### Dcard／校園社群

```text
標題：分享一個可以直接試公開 Instagram Reel 的免費字幕工具

我更新了 ReelScribe。現在貼上公開 Instagram Reel 或影片貼文後，網站會先用兩層公開解析方式尋找影片；成功時不保存影片，只暫時串流到目前裝置，再由本機 Whisper 產生字幕。

也支援公開字幕連結、常見影音檔、長影片分段、TXT／SRT／VTT。

私人帳號、登入限定、地區限制或被平台阻擋的內容仍可能失敗，網站不會要求 Cookie 或繞過登入。

https://paq6809.github.io/reelscribe/?utm_source=dcard&utm_medium=organic&utm_campaign=instagram_direct_launch&utm_content=campus_01
```

### Reddit／Hacker News／開發者社群

```text
Show: ReelScribe — public Instagram link transcription with local Whisper

I added a public-only Instagram pipeline to ReelScribe. It first tries a lightweight logged-out resolver, then falls back to a pinned yt-dlp + curl_cffi extractor. Successful media URLs are wrapped in short-lived signed proxy URLs, restricted to Instagram/Facebook CDNs, streamed without server-side storage, and transcribed locally in the browser.

No passwords, cookies, private tokens, analytics, or login bypass. Private or platform-blocked posts fail closed and fall back to local upload or tab audio capture.

Feedback on browser compatibility and public Reel success rates is welcome.
```

### Product Hunt

Tagline：

```text
Paste a public Instagram Reel and transcribe it locally
```

簡介：

```text
ReelScribe uses a public-only two-stage Instagram resolver, short-lived signed media streaming, and on-device Whisper transcription. It also checks public caption tracks on other video platforms and exports TXT, SRT, and VTT. No account, API key, cookies, or analytics tracker is required.
```

第一則留言必須說明 best-effort 限制、私人內容不支援、媒體不落地儲存、Vercel 解析層與本機 Whisper 的分工。

## 十四天免費推廣節奏

1. Threads／X 發布 Instagram 更新與真實成功案例。
2. Instagram Reel／TikTok 發布 20–30 秒操作錄影。
3. Dcard／校園社群發布學習與筆記情境。
4. YouTube Shorts 發布「貼 Reel 連結到字幕」流程。
5. GitHub README、Profile README、Topics 更新。
6. LinkedIn 分享公開解析、短效簽章與本機 AI 架構。
7. 發布第一輪真實成功／失敗平台統計。
8. Reddit／Hacker News 發布技術版介紹。
9. 發布 SRT、VTT、TXT 差異教學。
10. 發布「為何某些 Instagram 連結仍失敗」說明。
11. 發布長影片分段與 WebGPU 展示。
12. 向合適的 Discord／Telegram／校園社群分享。
13. 準備 Product Hunt 圖片、FAQ 與已知限制。
14. Product Hunt 發布並回覆真實留言。

## 免費發布管道

- Google Search Console、Bing Webmaster Tools、IndexNow。
- Product Hunt、GitHub、AlternativeTo、SaaSHub、OpenAlternative。
- Instagram Reels、Threads、TikTok、YouTube Shorts、X、Bluesky、Mastodon、LinkedIn、Facebook 社團、Dcard。
- Reddit、Hacker News、Indie Hackers、DEV Community、Hashnode、Discord、Telegram。

發布前先閱讀各平台規則。不要大量私訊、跨版洗文、購買假流量、交換假讚、偽造評論或自動冒用帳號發文。

## 衡量方式

現階段不植入第三方追蹤器。使用各平台貼文瀏覽、收藏、分享、留言、UTM、Search Console，以及使用者自願回報的裝置、公開／私人狀態與成功來源。回報中不得收集 Instagram Cookie、帳號密碼或私人影片網址。

## 帳號持有人仍需人工完成

- Google Search Console、Bing Webmaster Tools 驗證與 sitemap 提交。
- Product Hunt、Instagram、TikTok、Threads、Dcard、Reddit 等實際發布。
- 任何付費廣告的預算、受眾、地區與付款授權。

網站與維護流程不得自動灌水、建立假帳號、購買流量或未經授權投放付費廣告。
