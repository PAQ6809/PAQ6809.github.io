#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "ReelScribe Mobile pre-release verification"
node --version
npm --version

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run check
RELEASE_BUILD=1 npm run audit:catalog

if [[ -d ios ]]; then
  (cd ios && pod install)
else
  echo "ios/ 尚未產生；先執行 scripts/bootstrap.sh。"
fi

echo "RELEASE_BUILD 只有在 Tiny/Base SHA-256 已鎖定後才應通過。"
