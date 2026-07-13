$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..")
$TemplateDir = Join-Path $ProjectDir ".native-template"
$MaxAttempts = 3

Set-Location $ProjectDir

if ((Test-Path "ios") -or (Test-Path "android")) {
  throw "ios/ 或 android/ 已存在。為避免覆寫簽署設定，bootstrap 已停止。"
}

$created = $false
for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
  if (Test-Path $TemplateDir) {
    Remove-Item $TemplateDir -Recurse -Force
  }

  Write-Host "建立 React Native 0.86 原生專案骨架（第 $attempt/$MaxAttempts 次）..."
  $env:npm_config_fetch_retries = "3"
  $env:npm_config_fetch_retry_mintimeout = "10000"
  $env:npm_config_fetch_retry_maxtimeout = "60000"

  & npx --yes @react-native-community/cli@20.2.0 init ReelScribeMobile `
    --version 0.86.0 `
    --directory $TemplateDir `
    --package-name io.github.paq6809.reelscribe `
    --skip-install

  if ($LASTEXITCODE -eq 0) {
    $created = $true
    break
  }

  if (Test-Path $TemplateDir) {
    Remove-Item $TemplateDir -Recurse -Force
  }
  if ($attempt -lt $MaxAttempts) {
    Start-Sleep -Seconds ($attempt * 5)
  }
}

if (-not $created) {
  throw "React Native 原生專案骨架在 $MaxAttempts 次嘗試後仍建立失敗。"
}
if (-not (Test-Path (Join-Path $TemplateDir "ios")) -or -not (Test-Path (Join-Path $TemplateDir "android"))) {
  throw "React Native CLI 未產生完整的 iOS／Android 專案。"
}

Copy-Item (Join-Path $TemplateDir "ios") (Join-Path $ProjectDir "ios") -Recurse
Copy-Item (Join-Path $TemplateDir "android") (Join-Path $ProjectDir "android") -Recurse
Remove-Item $TemplateDir -Recurse -Force

Write-Host "安裝鎖定的 JavaScript 相依套件..."
& npm install `
  --fetch-retries=3 `
  --fetch-retry-mintimeout=10000 `
  --fetch-retry-maxtimeout=60000
if ($LASTEXITCODE -ne 0) {
  throw "npm install 失敗。"
}

Write-Host "完成。下一步："
Write-Host "1. 在 macOS 執行 cd ios && pod install"
Write-Host "2. 確認 app-owned native manager 已自動連結"
Write-Host "3. 確認 Bundle ID / applicationId 尚未被其他 App 使用"
Write-Host "4. 執行 npm run check"
