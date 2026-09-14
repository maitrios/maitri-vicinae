import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Every icon the maps name must be bundled, or a row renders blank.
test("icons.ts only names bundled Phosphor icons", () => {
  const src = readFileSync(join(__dirname, "../src/lib/icons.ts"), "utf8");
  const bundled = new Set(readdirSync(join(__dirname, "../assets/phosphor")).map((f) => f.replace(/\.svg$/, "")));
  const named = new Set<string>();
  for (const m of src.matchAll(/:\s*"([a-z0-9-]+)",?\s*$/gm)) named.add(m[1]);
  for (const m of src.matchAll(/ph\("([^"]+)"/g)) named.add(m[1]);
  const missing = [...named].filter((n) => !bundled.has(n));
  assert.deepEqual(missing, []);
});
