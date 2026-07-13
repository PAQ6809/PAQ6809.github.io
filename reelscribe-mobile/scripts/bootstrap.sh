#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$PROJECT_DIR/.native-template"
MAX_ATTEMPTS=3

cd "$PROJECT_DIR"

if [[ -d ios || -d android ]]; then
  echo "ios/ or android/ already exists. Refusing to overwrite signing configuration." >&2
  exit 1
fi

create_native_template() {
  local attempt
  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    rm -rf "$TEMPLATE_DIR"
    echo "Creating React Native 0.86 native projects (attempt $attempt/$MAX_ATTEMPTS)..."

    if npm_config_fetch_retries=3 \
      npm_config_fetch_retry_mintimeout=10000 \
      npm_config_fetch_retry_maxtimeout=60000 \
      npx --yes @react-native-community/cli@20.2.0 init ReelScribeMobile \
        --version 0.86.0 \
        --directory "$TEMPLATE_DIR" \
        --package-name io.github.paq6809.reelscribe \
        --skip-install; then
      return 0
    fi

    rm -rf "$TEMPLATE_DIR"
    if [[ "$attempt" -eq "$MAX_ATTEMPTS" ]]; then
      echo "React Native native-project creation failed after $MAX_ATTEMPTS attempts." >&2
      return 1
    fi
    sleep $((attempt * 5))
  done
}

create_native_template

test -d "$TEMPLATE_DIR/ios"
test -d "$TEMPLATE_DIR/android"
cp -R "$TEMPLATE_DIR/ios" "$PROJECT_DIR/ios"
cp -R "$TEMPLATE_DIR/android" "$PROJECT_DIR/android"
rm -rf "$TEMPLATE_DIR"

npm install \
  --fetch-retries=3 \
  --fetch-retry-mintimeout=10000 \
  --fetch-retry-maxtimeout=60000

cat <<'EOF'
Bootstrap complete.
1. On macOS: cd ios && pod install
2. Confirm the app-owned native manager is autolinked.
3. Confirm the bundle/application identifier is available.
4. Run npm run check.
EOF
