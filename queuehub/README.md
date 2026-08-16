# 叫號通 QueueHub

休息站、美食街與其他多人場域的多店家叫號整合 Prototype。

## Demo 功能

- 場域內多家餐廳叫號總覽
- 餐廳詳情與最近叫號
- 輸入自己的取餐號碼，計算前方約有幾組與估計等待時間
- 公共大螢幕看板模式
- 店家後台：下一號、直接指定號碼、跳號、暫停／恢復
- 場域 QR Code、餐廳 QR Code、含 ticket 參數的專屬 QR Code
- localStorage + BroadcastChannel 同瀏覽器即時同步
- API / Webhook、店家平板、Local Gateway 三種正式串接架構

## QR URL 規格

場域總覽：

`https://paq6809.github.io/queuehub/#/`

餐廳：

`https://paq6809.github.io/queuehub/#/restaurant/harbor-noodles`

取餐單專屬 QR：

`https://paq6809.github.io/queuehub/#/restaurant/harbor-noodles?ticket=168`

其中 `ticket=168` 可由 POS / 叫號系統在列印取餐單時動態產生，使用者掃描後不必再次輸入號碼。

## 正式版資料流

餐廳叫號機 / POS → Integration Adapter → Queue API / Realtime DB → Web / QR / Public Board / Push Notification

### A. API / Webhook

若既有系統有 API，定期拉取 QueueStatus；若支援 Webhook，則以 QueueEvent 即時推送更新。

### B. 店家平板

沒有 API 時，店員在網頁後台按下一號，資料寫入 Supabase / Firebase 等即時後端並廣播到所有裝置。

### C. Local Gateway

若是舊型叫號機，可用 Raspberry Pi / Edge Device 讀 Serial、LAN 或其他設備輸出，再轉成 QueueEvent 上傳。

## 目前限制

這個版本是前端概念驗證；localStorage 只會在同一個瀏覽器／同一裝置同步。不同手機掃描 QR 後若要看到完全一致的即時號碼，正式版必須接共用雲端即時資料庫或餐廳既有叫號 API。

真正的 API Key / Token 不得寫入前端；只應儲存 secret reference，並由 server / edge function 讀取。
