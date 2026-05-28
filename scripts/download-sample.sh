#!/usr/bin/env bash
# Downloads a public Gaussian Splatting sample scene used by /demo.
# Source: Mark Kellogg's open dataset (CC, used by the @mkkellogg/gaussian-splats-3d demos).

set -euo pipefail

DEST_DIR="public/splats"
DEST_FILE="$DEST_DIR/sample.ksplat"
TMP_DIR="$(mktemp -d)"

mkdir -p "$DEST_DIR"

if [ -f "$DEST_FILE" ]; then
  echo "✔ Sample already present at $DEST_FILE — skipping."
  exit 0
fi

echo "↓ Downloading sample Gaussian Splat dataset (~50-150MB)…"

# Mark Kellogg's hosted sample dataset (bonsai is small and looks great indoors).
# If this URL changes, drop any .ksplat / .splat / .ply file into public/splats/sample.ksplat.
URL="https://projects.markkellogg.org/downloads/gaussian_splat_data.zip"

curl -L --fail --progress-bar -o "$TMP_DIR/data.zip" "$URL"

echo "↓ Extracting…"
unzip -q -o "$TMP_DIR/data.zip" -d "$TMP_DIR/extracted"

# Pick the first .ksplat we find (bonsai preferred).
FOUND=""
for candidate in bonsai garden stump truck; do
  match=$(find "$TMP_DIR/extracted" -iname "${candidate}*.ksplat" -print -quit || true)
  if [ -n "$match" ]; then FOUND="$match"; break; fi
done
if [ -z "$FOUND" ]; then
  FOUND=$(find "$TMP_DIR/extracted" -iname "*.ksplat" -print -quit || true)
fi
if [ -z "$FOUND" ]; then
  echo "✗ No .ksplat file found in the downloaded archive." >&2
  echo "  Drop any .ksplat / .splat / .ply into $DEST_FILE manually." >&2
  exit 1
fi

cp "$FOUND" "$DEST_FILE"
rm -rf "$TMP_DIR"
echo "✔ Sample scene ready at $DEST_FILE"
