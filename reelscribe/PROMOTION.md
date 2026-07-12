# ReelScribe 免費推廣與廣告佈置

正式網址：`https://paq6809.github.io/reelscribe/`

## 定位

- 一句話：貼上公開影片連結，取得可複製字幕。
- 差異化：免費、免登入、無 API Key、公開字幕優先、本機 Whisper 備援。
- 主要受眾：學生、內容創作者、語言學習者、社群小編、研究與筆記工作者。

## UTM 規格

所有對外連結使用：

```text
https://paq6809.github.io/reelscribe/?utm_source={platform}&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content={post_id}
```

平台名稱：`instagram`、`threads`、`tiktok`、`youtube`、`x`、`reddit`、`dcard`、`producthunt`、`github`。

## 發布素材

### Threads／X

```text
我做了一個免費的社群影片字幕工具 ReelScribe。
貼上公開影片連結，會先找平台既有字幕；找不到時可以用本機 Whisper，影片不必上傳伺服器。
可直接複製全文，也能匯出 TXT、SRT、VTT。

https://paq6809.github.io/reelscribe/?utm_source=threads&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content=launch_01
```

### Instagram／TikTok／YouTube Shorts 影片腳本（20–30 秒）

```text
0–3 秒：字幕還在一句一句手打嗎？
3–8 秒：複製影片連結，貼到 ReelScribe。
8–14 秒：網站自動查找公開字幕。
14–20 秒：沒有字幕時，可改用裝置上的本機 AI。
20–25 秒：複製全文，或下載 SRT、VTT。
25–30 秒：免費、免登入，網址放在個人檔案或留言。
```

畫面應實際錄製操作，不使用誇大成功率，不聲稱支援所有私人或無公開字幕的影片。

### Dcard／校園社群

標題：

```text
分享一個免費的影片字幕工具：貼連結就先幫你找字幕
```

正文：

```text
最近整理課程、短影片和外語內容時，常常只想快速取得可以複製的字幕，所以做了 ReelScribe。

主要流程很簡單：
1. 貼上公開影片連結。
2. 網站先查找平台公開字幕。
3. 找不到時，可以使用本機 Whisper 備援。
4. 結果可複製，或匯出 TXT、SRT、VTT。

免登入、無 API Key，本機辨識時檔案不會上傳伺服器。
公開字幕不存在的平台仍可能無法只靠連結取得，網站會直接說明，不會把貼文說明冒充成字幕。

https://paq6809.github.io/reelscribe/?utm_source=dcard&utm_medium=organic&utm_campaign=reelscribe_launch&utm_content=campus_01
```

### Reddit／Hacker News／開發者社群

英文標題：

```text
Show: ReelScribe — a free link-first subtitle extractor with local Whisper fallback
```

英文正文：

```text
I built ReelScribe, a free browser-based subtitle tool.

It checks publicly available caption tracks first and falls back to local Whisper when a source has no accessible captions. No account, API key, uploaded media, or tracking is required for the core flow.

Exports: plain text, SRT, and VTT.

I would appreciate feedback on browser compatibility, caption accuracy, and the mobile flow.
```

先閱讀各社群規則，避免重複貼文、灌水或只貼連結。

### Product Hunt

名稱：`ReelScribe`

Tagline：

```text
Paste a video link and get copyable subtitles for free
```

簡介：

```text
ReelScribe checks public caption tracks across supported video platforms and provides a local Whisper fallback when captions are unavailable. It works in the browser, requires no account or API key, and exports TXT, SRT, and VTT.
```

第一則留言應說明：為何製作、隱私設計、已知平台限制、希望取得的回饋。

### GitHub README／個人網站

加入清楚 CTA：

```text
ReelScribe — 免費社群影片字幕工具
貼上公開影片連結，快速取得可複製字幕；無公開字幕時可使用本機 Whisper。
```

## 七天免費推廣節奏

1. 第一天：Threads／X 發布產品故事與網址。
2. 第二天：Instagram Reel／TikTok 發布 20–30 秒操作展示。
3. 第三天：Dcard 或校園社群發布完整使用情境。
4. 第四天：YouTube Shorts 發布「三步取得字幕」。
5. 第五天：GitHub、開發者社群分享技術與隱私架構。
6. 第六天：整理真實使用回饋與修正內容。
7. 第七天：Product Hunt 或其他產品探索平台正式發布。

## 長期內容題材

- 如何取得 YouTube／短影片字幕。
- SRT、VTT、TXT 的差異。
- 語言學習者如何用逐字稿複習。
- 本機 AI 與雲端字幕工具的隱私差異。
- 字幕抓不到時的原因與合法備援方式。
- 新增平台或修正紀錄。

## 免費 SEO 佈置

網站已加入：

- canonical
- Open Graph
- Twitter Card
- SoftwareApplication JSON-LD
- sitemap.xml
- robots.txt
- 社群分享圖
- PWA Share Target
- 網站原生分享按鈕

仍需由站長帳號手動完成：

1. 在 Google Search Console 驗證網站並提交 sitemap。
2. 在 Bing Webmaster Tools 匯入或提交 sitemap。
3. 建立 Product Hunt、社群平台或開發者社群帳號並依規則發布。
4. 付費廣告必須先確認預算、投放地區、受眾與付款方式；未經授權不自動投放。

## 衡量方式

現階段不植入第三方追蹤器。推廣成效先用：

- 各平台貼文瀏覽、收藏、轉發與留言。
- UTM 連結區分來源。
- Search Console 的曝光、點擊與搜尋字詞。
- 使用者回報的成功平台、失敗平台與裝置型號。

未來加入分析工具時，優先採用不收集字幕、影片連結與個人資料的隱私友善方案。
