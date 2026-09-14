#!/bin/bash
# Refresh the vendored MenuModel.js test fixture from a maitri checkout and
# fail if the exports the extension relies on changed shape.
#
#   tools/sync-menumodel.sh ~/dev/kindness/maitri
set -euo pipefail
src=${1:?usage: tools/sync-menumodel.sh <maitri checkout>}/shell/plugins/menu/MenuModel.js
cp "$src" test/fixtures/MenuModel.js
node -e '
  const m = require("./test/fixtures/MenuModel.js");
  const need = ["guardScript","parseMenuJsonc","mergeMenuSources","swapProviderRows","resolveRoute","slugify","pathFor","parentPathFor","isDescendantOf","childCount","isVisible","labelFor","matchesQuery","searchScore"];
  const missing = need.filter((n) => typeof m[n] !== "function");
  if (missing.length) { console.error("MenuModel.js lacks:", missing.join(", ")); process.exit(1); }
  console.log("MenuModel.js fixture synced;", need.length, "exports present");
'
