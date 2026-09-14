import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGuardOutput, evaluateGuards } from "../src/lib/core/guards";
import { PROVIDERS, parseProviderRows } from "../src/lib/core/providers";
import { resolve } from "../src/lib/core/routes";
import { search } from "../src/lib/core/search";
import { childrenOf } from "../src/lib/core/menu-source";
import { menu, model } from "./helpers";

test("MenuModel.js loads with every export the extension calls", () => {
  const m = model();
  assert.equal(typeof m.guardScript, "function");
  assert.equal(m.resolveRoute({}, [], "GO"), "root");
});

test("default and user menu merge per key, keeping position and adding new ids", () => {
  const { menu: loaded } = menu();
  assert.equal(loaded.errors.length, 0);
  assert.equal(loaded.items["system.lock"].label, "Lock Screen");
  assert.equal(loaded.items["system.lock"].action, "maitri-system-lock");
  const lockIndex = loaded.itemOrder.indexOf("system.lock");
  const shutdownIndex = loaded.itemOrder.indexOf("system.shutdown");
  assert.ok(lockIndex < shutdownIndex, "an overridden row keeps its place");
  assert.equal(loaded.items["system.hibernate"].parent, "system");
  assert.equal(loaded.extras["system.hibernate"].vicinaeIcon, "snowflake");
  assert.equal(loaded.extras["system.lock"].vicinaeIcon, "lock");
});

test("a broken user overlay is reported and leaves the defaults intact", () => {
  const { menu: loaded } = menu("broken-overlay.jsonc");
  assert.equal(loaded.errors.length, 1);
  assert.match(loaded.errors[0], /broken-overlay/);
  assert.equal(loaded.items["system.lock"].label, "Lock");
});

test("routes resolve like maitri-menu: ids, aliases, actions, links, views", () => {
  const { model: m, menu: loaded } = menu();
  const r = (input: string) => resolve(m, loaded.items, loaded.itemOrder, input);
  assert.deepEqual(r(""), { kind: "root" });
  assert.deepEqual(r("SYSTEM"), { kind: "menu", id: "system" });
  assert.deepEqual(r("power_menu"), { kind: "menu", id: "system" });
  assert.deepEqual(r("settings"), { kind: "menu", id: "setup" });
  assert.deepEqual(r("apps"), { kind: "apps" });
  assert.deepEqual(r("theme"), { kind: "view", view: "theme-picker", id: "style.theme" });
  assert.deepEqual(r("learn.keybindings"), { kind: "view", view: "keybindings", id: "learn.keybindings" });
  assert.deepEqual(r("about"), { kind: "action", id: "about", action: "maitri-launch-about" });
  assert.deepEqual(r("setup.power-profile"), { kind: "menu", id: "style.font" });
  assert.deepEqual(r("nonsense"), { kind: "unknown", query: "nonsense" });
});

test("guard output parses right-to-left so dotted ids survive", () => {
  const parsed = parseGuardOutput("setup.default.browser.helium:w:1\nsetup.default.browser.helium:c:0\n\ngarbage\nsystem.lock:c:1\n");
  assert.deepEqual(parsed.when, { "setup.default.browser.helium": true });
  assert.deepEqual(parsed.checked, { "setup.default.browser.helium": false, "system.lock": true });
});

test("the guard batch is one script and a failed batch keeps the previous answers", async () => {
  const { model: m, menu: loaded } = menu();
  const seen: string[] = [];
  const bash = async (script: string) => {
    seen.push(script);
    return { ok: true, stdout: "setup.default.browser.helium:w:1\nsetup.default.browser.firefox:w:0\nsetup.default.browser.helium:c:1\n" };
  };
  const results = await evaluateGuards(m, loaded.items, bash);
  assert.equal(seen.length, 1);
  assert.match(seen[0], /maitri-pkg-present\(\)/, "presence helpers are answered in-process");
  assert.match(seen[0], /__maitri_read_\d+=\$\(maitri-default-browser/, "shared readers run once");
  assert.equal(results.when["setup.default.browser.firefox"], false);
  const kept = await evaluateGuards(m, loaded.items, async () => ({ ok: false, stdout: "" }), results);
  assert.deepEqual(kept, results);
});

test("hidden rows drop out of a menu and empty submenus disappear with them", () => {
  const { model: m, menu: loaded } = menu();
  const when = { "setup.default.browser.helium": true, "setup.default.browser.firefox": false };
  const rows = childrenOf(loaded.items, loaded.itemOrder, "setup.default.browser").filter((e) => m.isVisible(loaded.items, loaded.itemOrder, when, e));
  assert.deepEqual(rows.map((e) => e.id), ["setup.default.browser.helium"]);
  const none = { "setup.default.browser.helium": false, "setup.default.browser.firefox": false };
  assert.equal(m.isVisible(loaded.items, loaded.itemOrder, none, loaded.items["setup.default.browser"]), false);
  assert.equal(m.labelFor(loaded.items["setup.default.browser.helium"], { "setup.default.browser.helium": true }), "Helium ✓");
});

test("provider rows follow label/value/current and nudge slug collisions", () => {
  const m = model();
  const rows = parseProviderRows(m, "style.font", PROVIDERS.fonts, "Fira Code\tFira Code\tFira-Code\nFira-Code\tFira-Code\tFira-Code\n\nMono\tMono\tFira-Code\n");
  assert.deepEqual(rows.map((r) => r.id), ["style.font.fira-code", "style.font.fira-code-", "style.font.mono"]);
  assert.equal(rows[1].current, true);
  assert.equal(rows[1].icon, "✓");
  assert.equal(rows[0].action, "maitri-font-set 'Fira Code'");
  const { menu: loaded } = menu();
  const swapped = m.swapProviderRows(loaded.items, loaded.itemOrder, "style.font", rows);
  assert.equal(childrenOf(swapped.items, swapped.itemOrder, "style.font").length, 3);
  const again = m.swapProviderRows(swapped.items, swapped.itemOrder, "style.font", rows.slice(0, 1));
  assert.equal(childrenOf(again.items, again.itemOrder, "style.font").length, 1, "a rerun replaces its previous batch");
});

test("search covers the active subtree, skips root and apps, and ranks label matches first", () => {
  const { model: m, menu: loaded } = menu();
  const guards = { when: {}, checked: {} };
  const hits = search(m, loaded.items, loaded.itemOrder, "root", "lock", guards);
  assert.equal(hits[0].entry.id, "system.lock");
  assert.equal(hits[0].path, "System");
  assert.ok(!hits.some((h) => h.entry.id === "root" || h.entry.id === "apps"));
  const scoped = search(m, loaded.items, loaded.itemOrder, "learn", "maitri", guards);
  assert.deepEqual(scoped.map((h) => h.entry.id), ["learn.maitri"]);
  const byDescription = search(m, loaded.items, loaded.itemOrder, "root", "manual", guards);
  assert.deepEqual(byDescription.map((h) => h.entry.id), ["learn.maitri"]);
});
