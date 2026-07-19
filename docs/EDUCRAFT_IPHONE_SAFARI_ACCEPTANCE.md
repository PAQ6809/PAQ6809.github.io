# EduCraft iPhone Safari 實機驗收

> 適用範圍：Phase 1 M4 的 PWA、離線 app shell 與「幽靈灰色遮罩」回歸驗收
> 自動化互補：`educraft/playwright.pwa.config.mjs` 會在 Chromium 中實際啟用 Service Worker；既有 WebKit E2E 負責 Mobile Safari 版面回歸。本文件負責只有真實 iPhone 才能證明的安裝、生命週期、背景恢復與觸控行為。

## 1. 發布門檻

下列條件全部成立才可標記通過：

- 測試對象是待發布的 staging 或 release-candidate 網址與指定 commit，不以舊正式站代替。
- iPhone Safari 與「加入主畫面」版本都完成測試。
- 線上、離線、旋轉、切到背景再返回及上一頁／下一頁後，畫面中央都沒有殘留灰色遮罩。
- 側欄關閉時無法攔截主內容的點擊；需要側欄時遮罩才會出現。
- 離線冷啟動可載入 app shell，已存在的本機教案仍可開啟；遠端搜尋失敗不算離線 app-shell 失敗，但不得假裝成功。
- 沒有遺失私人草稿、被意外登出後覆寫資料，或把私人內容顯示在公開教案庫。

## 2. 測試前準備

1. 使用不含學生真實資料的測試帳號與測試教案。
2. 記錄：commit SHA、候選網址、`sw.js` 的預期 `CACHE` 值、iPhone 型號、iOS 版本、測試日期與測試人員。
3. 先在 EduCraft「設定」下載完整 JSON 備份。清除網站資料會刪除尚未同步的本機資料，未完成備份不得執行第 4 步。
4. 關閉 EduCraft 的 Safari 分頁及主畫面版本，然後在「設定 → Safari → 進階 → 網站資料」刪除**候選站台主機**的資料。不得使用「清除所有網站資料」。
5. 確認 Wi-Fi 或行動網路正常，從新的 Safari 分頁開啟候選網址；網址加上本次驗收識別參數，例如 `?acceptance=20260719-1#dashboard`。

## 3. Safari 線上與遮罩驗收

每一步都要確認主內容可點擊，且關閉導覽後 `#nav-backdrop` 沒有留在畫面：

1. 等候首頁完整出現，點擊首頁的一張功能卡，再返回首頁。
2. 開啟左上角導覽：側欄與半透明遮罩應出現；點擊「公開教案庫」後側欄與遮罩應一起消失。
3. 依序開啟「ChatGPT 共備」、「帳號」及「公開教案庫」，確認內容與控制項可操作。
4. 開啟再關閉登入對話框；關閉後點擊畫面中央控制項，確認沒有透明層攔截。
5. 旋轉為橫向再回直向；重做一次側欄開關。
6. 切到其他 App 至少 10 秒後回 Safari；再按瀏覽器上一頁與下一頁。
7. 鎖定螢幕至少 10 秒後解鎖；確認沒有自動打開的 dialog、灰色全屏層或失效按鈕。

任何一步出現遮罩，立即錄影並停止把結果標為通過；單純重新整理後消失仍算失敗。

## 4. 加入主畫面與獨立視窗

1. Safari 點「分享 → 加入主畫面」，名稱保留為 EduCraft。
2. 從主畫面啟動，確認沒有 Safari 網址列，首頁路由為 `#dashboard`。
3. 重做第 3 節的側欄、登入對話框、旋轉、背景恢復與鎖屏恢復。
4. 從 App 切換器完全關閉 EduCraft，再從主畫面冷啟動；首頁應正常顯示且無灰色遮罩。

## 5. 離線 app-shell 驗收

1. 在線上狀態先開啟首頁、ChatGPT 共備、帳號頁、公開教案庫，以及一份不含個資的本機測試教案。
2. 回到主畫面，開啟飛航模式並同時關閉 Wi-Fi；用另一個網站確認裝置確實離線。
3. 從 App 切換器完全關閉 EduCraft，再由主畫面圖示冷啟動。
4. 確認 app shell、導覽及本機測試教案可載入；切換到 `#public-library` 後仍可看到頁面框架。
5. 確認遠端教育資源、登入或雲端同步呈現離線／失敗狀態，不得出現成功假象。
6. 再次執行側欄開關、旋轉及背景恢復，確認沒有幽靈遮罩。
7. 恢復網路，回到 App 後確認可繼續操作，且測試教案未遺失或重複。

## 6. 新版快取更新驗收

此節用在 `sw.js` 的 `CACHE` 已提升時：

1. 先安裝前一個 release candidate，完成一次線上啟動後關閉 App。
2. 部署包含新 `CACHE` 值的候選版本；不要清除網站資料。
3. 在線上狀態由 Safari 開啟候選網址，停留至首頁可操作，關閉後再從主畫面冷啟動。
4. 確認新版本的可辨識變更已出現，舊版本未再恢復；接著重跑離線驗收。
5. 可使用 macOS Safari「開發 → [iPhone] → EduCraft」的 Web Inspector 留存 Cache Storage 截圖；所有以 `educraft-` 開頭的 cache 中應只剩本次預期版本，其他同來源應用的 cache 不得被刪除。沒有 Mac 時，以自動化的舊 cache 清理測試加上本節的更新／離線實機結果作為證據，並在紀錄中標示「未做實機 Cache Storage inspection」。

## 7. 證據與簽核

不得在截圖、影片或檔名中保留 Email、學生姓名、診斷資訊、claim code 或私人教案內容。

| 證據 | 最低要求 |
|---|---|
| `01-safari-online.mp4` | Safari 的側欄、登入對話框、旋轉及背景恢復 |
| `02-home-screen-cold-start.mp4` | 從主畫面冷啟動與無遮罩操作 |
| `03-offline-cold-start.mp4` | 確認離線後冷啟動、導覽與本機內容 |
| `04-cache-storage.png` | 有 Web Inspector 時提供；沒有時記錄原因 |
| 驗收紀錄 | commit、URL、cache、裝置、iOS、時間、測試人員、結果與 issue 連結 |

建議把證據附在同一個 PR 或 release 驗收單；大型影片使用受控的團隊儲存空間，不提交 Git repository。

### 簽核紀錄

| 欄位 | 結果 |
|---|---|
| Commit SHA |  |
| 候選網址 |  |
| 預期 cache |  |
| iPhone／iOS |  |
| Safari 線上 | PASS／FAIL |
| 主畫面冷啟動 | PASS／FAIL |
| 離線 app shell | PASS／FAIL |
| 新版快取更新 | PASS／FAIL／N/A |
| 幽靈遮罩 | PASS／FAIL |
| 證據連結 |  |
| 測試人員／時間 |  |
| 已知限制／Issue |  |

## 8. 自動化重跑

在 `educraft/` 執行：

```powershell
npx playwright test --config=playwright.pwa.config.mjs
```

測試固定單 worker、序列執行，結果與失敗 trace 寫入作業系統暫存目錄 `educraft-playwright-pwa-results`，不把瀏覽器產物提交到 repository。它會驗證：

- 載入應用前沒有既有 registration。
- Service Worker 安裝、啟用並控制頁面。
- `sw.js` 宣告的當前 cache 及所有 `CORE` URL 已存在。
- 預先植入的舊 `educraft-*` cache 已在 activate 階段清除，且同來源的非 EduCraft cache 不受影響。
- 未快取過的網址可在完全離線時由 app shell 回應。
- 離線 Mobile viewport 沒有 backdrop 或開啟中的 dialog。

Chromium 的 Service Worker 自動化結果不能取代 iPhone Safari 實機簽核；兩者都通過才完成 M4 PWA gate。
