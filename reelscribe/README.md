# ReelScribe

免費、local-first 的影片／音訊轉字幕工具，部署於 GitHub Pages。

## 架構

- 靜態 HTML、CSS、JavaScript
- Transformers.js + ONNX Whisper
- Web Worker 背景辨識
- WebGPU 優先，WASM／CPU 自動降級
- 瀏覽器快取模型
- Service Worker 快取 App Shell
- 不需要後端、資料庫、帳號或 API Key
- 使用者影片不會上傳伺服器

## 支援

- 上傳影片或音訊
- 中文、英文、日文、韓文與自動語言辨識
- 可編輯完整逐字稿
- 時間軸跳轉
- 匯出 TXT、SRT、VTT
- PWA 安裝

## Instagram 限制

Instagram 不提供能夠對任意公開貼文直接取得原始影片檔的通用官方 API。因此此專案只驗證與保存貼文來源，實際辨識使用使用者擁有或已獲授權的本機影片檔。不要加入 Cookie 擷取、登入繞過或非官方下載爬蟲。

## 維護原則

1. 品質與穩定性優先於新增功能。
2. 不加入必須付費才能運作的核心依賴。
3. 模型與 CDN 版本必須固定，升級前先驗證。
4. 保持手機版可用與無障礙標籤。
5. 不將使用者媒體或字幕傳送至第三方後端。
