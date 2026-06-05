#!/usr/bin/env bash
# Color regression check — flags hard-coded color literals in app source
# that would prevent the logo palette from cascading.
# Usage: bash scripts/check-colors.sh
set -u
cd "$(dirname "$0")/.." || exit 1

echo "🎨 Scanning src/ for hard-coded color literals (excluding styles.css, generated, SVG assets)..."
echo

# Allow-list intentional exceptions (SVG share card, OAuth brand marks, error page).
ALLOW='ShareablePassportCard\.tsx|OAuthButtons\.tsx|error-page\.ts|avatar\.functions\.ts|chemistry-ledger\.ts|chart\.tsx|theme-color'

HITS=$(rg -nP "#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])|\brgba?\(|\bhsl\(|\b(bg|text|border)-(white|black)(/|\b)|\bwhite/|\bblack/" src/ \
  -g '!*.gen.ts' -g '!styles.css' -g '!*.svg' -g '!*.asset.json' \
  | grep -vE "$ALLOW" || true)

if [ -z "$HITS" ]; then
  echo "✅ No unexpected hard-coded colors found. Palette is token-driven."
  exit 0
fi

echo "⚠️  Found hard-coded color values that bypass the logo palette:"
echo
echo "$HITS"
echo
COUNT=$(echo "$HITS" | wc -l | tr -d ' ')
echo "Total: $COUNT line(s). Replace with semantic tokens (text-primary, bg-card, etc.) or oklch(var(--logo-*))."
exit 1
