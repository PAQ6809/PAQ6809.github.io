# Store Screenshot Production Plan

Use the release build and real device captures. Do not fabricate unsupported states or claim guaranteed accuracy.

## Required sequence

1. **Paste a public link**
   - Show YouTube or Instagram input.
   - Caption: `貼上公開影片連結，先找平台字幕。`

2. **Choose a local file**
   - Show the system picker result.
   - Caption: `沒有公開字幕時，改用手機本機辨識。`

3. **Device-aware model selection**
   - Show Tiny/Base/Small options.
   - Caption: `依手機效能、空間與影片長度選擇模型。`

4. **Private local processing**
   - Show progress, cancellation and privacy copy.
   - Caption: `影片、音訊與字幕預設留在裝置。`

5. **Editable transcript and timeline**
   - Show readable Chinese segments.
   - Caption: `校對全文與時間軸，再複製或匯出。`

6. **TXT / SRT / VTT export**
   - Show export controls.
   - Caption: `輸出常用字幕格式。`

7. **On-device OCR assistance**
   - Show a video with clear burned-in subtitles.
   - Caption: `語音受音樂干擾時，以本機 OCR 輔助。`

## Device captures

- Current required iPhone display sizes in App Store Connect.
- Android phone portrait screenshots.
- iPad/tablet only after tablet layout and memory behavior pass.
- No Safari browser chrome in native App screenshots.

## Visual rules

- Bright white background, one blue primary color.
- Large Traditional Chinese copy with sufficient contrast.
- No personal media, names, account identifiers or private links.
- No screenshots showing model errors, gibberish, private accounts or restricted content.
- Do not use `100% 準確`, `所有連結`, `完美去除音樂` or similar claims.

## Feature graphic concept

```text
ReelScribe
影片 → 可編輯字幕
本機 AI・OCR・SRT/VTT
```

Keep the graphic simple and do not imply affiliation with Instagram, YouTube, Apple, Google or OpenAI.
