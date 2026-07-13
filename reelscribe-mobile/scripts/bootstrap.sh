#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$PROJECT_DIR/.native-template"

cd "$PROJECT_DIR"

if [[ -d ios || -d android ]]; then
  echo "ios/ or android/ already exists. Refusing to overwrite signing configuration." >&2
  exit 1
fi

rm -rf "$TEMPLATE_DIR"

echo "Creating React Native 0.86 native projects..."
npx @react-native-community/cli@20.2.0 init ReelScribeMobile \
  --version 0.86.0 \
  --directory "$TEMPLATE_DIR" \
  --package-name io.github.paq6809.reelscribe \
  --skip-install

cp -R "$TEMPLATE_DIR/ios" "$PROJECT_DIR/ios"
cp -R "$TEMPLATE_DIR/android" "$PROJECT_DIR/android"
rm -rf "$TEMPLATE_DIR"

npm install

cat <<'EOF'
Bootstrap complete.
1. On macOS: cd ios && pod install
2. Implement native/IMPLEMENTATION.md as ReelScribeEngine.
3. Confirm the bundle/application identifier is available.
4. Run npm run check.
EOF
