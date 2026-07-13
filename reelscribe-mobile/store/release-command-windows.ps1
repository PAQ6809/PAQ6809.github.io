$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectDir

Write-Host "ReelScribe Mobile pre-release verification"
node --version
npm --version

if (-not (Test-Path "package-lock.json")) {
  Write-Host "package-lock.json 尚未建立，執行 npm install 建立鎖檔。"
  npm install
} else {
  npm ci
}

npm run check

$env:RELEASE_BUILD = "1"
try {
  npm run audit:catalog
} finally {
  Remove-Item Env:RELEASE_BUILD -ErrorAction SilentlyContinue
}

Write-Host "注意：RELEASE_BUILD 檢查只有在 Tiny/Base SHA-256 已鎖定後才應通過。"
Write-Host "Windows 可以驗證 TypeScript 與 Android 前置條件；iOS 簽署與 archive 仍需要 macOS + Xcode。"
