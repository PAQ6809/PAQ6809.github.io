# Store Screenshot Plan

Create screenshots only from a signed release candidate using media that the project owns or is licensed to display.

## Sequence

1. **貼連結或選影片**
   - Show the clean landing screen.
   - Caption: `貼公開連結，或選擇手機影片。`

2. **本機模型選擇**
   - Show Tiny/Base and device recommendation.
   - Caption: `依手機能力選擇速度與品質。`

3. **隱私與本機處理**
   - Show the no-upload status and model progress.
   - Caption: `本機模式不主動上傳影片與字幕。`

4. **完整字幕與時間軸**
   - Use a manually verified transcript.
   - Caption: `可編輯全文與逐段時間軸。`

5. **字幕匯出**
   - Show TXT/SRT/VTT options after they pass release testing.
   - Caption: `複製文字，或匯出常用字幕格式。`

6. **畫面字幕 OCR**
   - Include only after Apple Vision/ML Kit quality gates pass.
   - Caption: `讀取影片中已燒錄的畫面文字。`

## Asset rules

- Do not show third-party account names, private messages, faces or copyrighted clips without permission.
- Do not use `100% 準確`, `所有連結都支援`, `完全去除音樂`, `永久保證免費` or similar claims.
- Ensure status-bar time, carrier and battery are consistent across each device set.
- Do not place required UI or text under device notches, Dynamic Island or navigation bars.
- Use Traditional Chinese for the first listing and prepare English assets separately.
- Store source screenshots and editable artwork outside the release bundle.

## Required exports

Confirm the current App Store Connect and Google Play requirements immediately before upload; store dimensions can change. Produce the source at the highest requested phone resolution and export platform-specific sizes without stretching.
