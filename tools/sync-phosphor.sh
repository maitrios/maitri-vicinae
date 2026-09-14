#!/bin/bash
# Sync assets/phosphor to exactly the Phosphor icons referenced in src/.
# Source defaults to the Phosphor "regular" SVG set; override with PHOSPHOR_SRC.
#
#   PHOSPHOR_SRC=~/Downloads/phosphor-icons/SVGs/regular tools/sync-phosphor.sh
#
# Run this after adding or changing any `icon: "..."` in src/lib so the bundle
# carries only the icons actually used.
set -euo pipefail

SRC="${PHOSPHOR_SRC:-$HOME/Downloads/phosphor-icons/SVGs/regular}"
DEST="assets/phosphor"

if [[ ! -d $SRC ]]; then
  echo "Phosphor source not found: $SRC (set PHOSPHOR_SRC)" >&2
  exit 1
fi

# Icons are named in the two maps in src/lib/icons.ts plus any direct ph("...") call.
names=$( { grep -hoE '"[a-z0-9-]+"\s*,?\s*$' src/lib/icons.ts | grep -oE '[a-z0-9-]+'; grep -rhoE 'ph\("[^"]+"' src | sed -E 's/.*"([^"]+).*/\1/'; } | sort -u)

rm -rf "$DEST"
mkdir -p "$DEST"

missing=0
for n in $names; do
  if [[ -f "$SRC/$n.svg" ]]; then
    cp "$SRC/$n.svg" "$DEST/"
  else
    echo "MISSING in source: $n" >&2
    missing=1
  fi
done

echo "synced $(ls "$DEST" | wc -l) icons to $DEST"
exit $missing
