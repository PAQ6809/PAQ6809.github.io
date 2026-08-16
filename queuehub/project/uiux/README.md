# UI / UX Design System

負責 QueueHub 全產品共用的視覺、互動與內容呈現規則，不負責商業邏輯或資料來源。

## 01 Design Tokens
- Color / gradient
- Surface / backdrop
- Typography
- Spacing
- Radius
- Shadow / blur
- Motion
- Z-index
- Light / dark system adaptation

## 02 Components
- Button
- Input / Search
- Chip / Filter
- Card
- Status pill
- Queue number display
- Modal / Sheet
- Toast / Banner
- Navigation
- Empty / Error / Loading state

## 03 State Design
- Normal
- Loading
- Live
- Soon
- Now
- Passed
- Paused
- Offline / stale
- Error

## 04 Responsive
- iPhone / small mobile
- Large mobile
- Tablet
- Desktop
- Public display
- Safe-area / PWA standalone

## 05 Accessibility
- Contrast
- Font scaling
- Keyboard focus
- Screen reader labels
- Reduced motion
- Color-independent status cues

## 06 Content Design
- 極簡文案
- 操作標籤
- 錯誤文字
- 通知文字
- 狀態命名
- 中英文字體層級

## 07 Interaction
- Search feedback
- QR entry
- Add/remove order
- Priority changes
- Notification permission
- Destructive confirmation
- Reconnect / recovery feedback

## 08 Theme
目前主方向：Adaptive Dark Gradient。
- system light → 深藍 / 靛紫但整體亮度略高
- system dark → 黑藍 / 紫黑
- foreground 依 surface token 調整
- urgency 使用 amber / red gradient，但保持文字對比

## 現有實作對應
- `ux-minimal-v5.css`
- `ux-adaptive-v6.css`
- `ux-v4.css`
- `ux-staff-v4.css`

未來重構後會收斂為共用 design tokens + component styles，不再持續疊加版本 CSS。
