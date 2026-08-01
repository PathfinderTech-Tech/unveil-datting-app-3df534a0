#!/usr/bin/env bash
# UNVEIL — mandatory pre-archive step for iOS.
#
# Guarantees that `npx cap sync ios` has run against a fresh web build before
# any archive is produced. A missing/stale generated capacitor.config.json is a
# known cause of the native shell booting with no server.url (blank screen), so
# this script is wired into the release workflow, not just documented.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building web bundle"
bun run build

echo "==> Normalising bundle into dist/client (Capacitor webDir)"
mkdir -p dist/client
if [ -d .output/public ]; then
  cp -r .output/public/. dist/client/
fi
test -f dist/client/index.html

echo "==> npx cap sync ios"
npx cap sync ios

echo "==> Verifying generated native config"
test -f ios/App/App/capacitor.config.json
grep -q '"url"' ios/App/App/capacitor.config.json
grep -q 'UnveilBridgeViewController' ios/App/App/Base.lproj/Main.storyboard
echo "==> Pre-archive checks passed"
