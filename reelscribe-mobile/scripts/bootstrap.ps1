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

Write-Host "安裝鎖定的 JavaScript 相依套件..."
npm install

Write-Host "完成。下一步："
Write-Host "1. 在 macOS 執行 cd ios && pod install"
Write-Host "2. 實作 native/IMPLEMENTATION.md 的 ReelScribeEngine"
Write-Host "3. 確認 Bundle ID / applicationId 尚未被其他 App 使用"
Write-Host "4. 執行 npm run check"
