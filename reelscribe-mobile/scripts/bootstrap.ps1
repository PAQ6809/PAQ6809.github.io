$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..")
$TemplateDir = Join-Path $ProjectDir ".native-template"

Set-Location $ProjectDir

if ((Test-Path "ios") -or (Test-Path "android")) {
  throw "ios/ 或 android/ 已存在。為避免覆寫簽署設定，bootstrap 已停止。"
}

if (Test-Path $TemplateDir) {
  Remove-Item $TemplateDir -Recurse -Force
}

Write-Host "建立 React Native 0.86 原生專案骨架..."
npx @react-native-community/cli@20.2.0 init ReelScribeMobile `
  --version 0.86.0 `
  --directory $TemplateDir `
  --package-name io.github.paq6809.reelscribe `
  --skip-install

Copy-Item (Join-Path $TemplateDir "ios") (Join-Path $ProjectDir "ios") -Recurse
Copy-Item (Join-Path $TemplateDir "android") (Join-Path $ProjectDir "android") -Recurse
Remove-Item $TemplateDir -Recurse -Force

Write-Host "安裝 ReelScribe 原生模型與媒體管理器..."
node scripts/install-native-manager.mjs

Write-Host "安裝鎖定的 JavaScript 相依套件..."
npm install
npm run check

Write-Host "完成。下一步："
Write-Host "1. Android 可執行 npm run android 進行 Debug 真機測試"
Write-Host "2. iOS 必須在 macOS 執行 cd ios; pod install，再用 Xcode 真機編譯"
Write-Host "3. 確認 Bundle ID / applicationId 尚未被其他 App 使用"
Write-Host "4. .do-not-ship 存在期間禁止送審或發布正式版"
