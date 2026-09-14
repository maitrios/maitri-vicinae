import { readFileSync } from "node:fs";
import type { Item, Items, MenuModel, Merged } from "./menu-model";
import { DEFAULT_MENU, USER_MENU } from "./paths";

// Fields the extension understands beyond what MenuModel.normalizeItem keeps.
// `vicinaeIcon` names a bundled Phosphor icon for a row, since Vicinae cannot
// render the Nerd Font glyphs the JSONC carries for the Quickshell menu.
export interface Extras {
  vicinaeIcon?: string;
  disabled?: string;
}

export interface Menu extends Merged {
  extras: Record<string, Extras>;
  errors: string[];
}

function readOptional(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function rawEntries(model: MenuModel, raw: string, source: string, errors: string[]): Record<string, Record<string, unknown>> {
  const stripped = model.stripJsonc(raw);
  if (!stripped.trim()) return {};
  try {
    const parsed = JSON.parse(stripped);
    if (!parsed || typeof parsed !== "object") return {};
    const root = parsed.items && typeof parsed.items === "object" && !Array.isArray(parsed.items) ? parsed.items : parsed;
    return root as Record<string, Record<string, unknown>>;
  } catch (e) {
    // MenuModel.parseMenuJsonc drops a broken file silently; surface it so a
    // user whose overlay stopped applying can tell why.
    errors.push(`${source}: ${e instanceof Error ? e.message : String(e)}`);
    return {};
  }
}

export function loadMenu(model: MenuModel, defaultPath: string = DEFAULT_MENU, userPath: string = USER_MENU): Menu {
  const errors: string[] = [];
  const defaultRaw = readOptional(defaultPath);
  const userRaw = readOptional(userPath);

  const merged = model.mergeMenuSources(model.parseMenuJsonc(defaultRaw), model.parseMenuJsonc(userRaw));

  const extras: Record<string, Extras> = {};
  for (const raw of [defaultRaw, userRaw]) {
    const entries = rawEntries(model, raw, raw === defaultRaw ? defaultPath : userPath, errors);
    for (const [id, value] of Object.entries(entries)) {
      if (!value || typeof value !== "object") continue;
      const extra: Extras = { ...(extras[id] ?? {}) };
      if (typeof value.vicinaeIcon === "string") extra.vicinaeIcon = value.vicinaeIcon;
      if (typeof value.disabled === "string") extra.disabled = value.disabled;
      if (Object.keys(extra).length) extras[id] = extra;
    }
  }

  return { ...merged, extras, errors };
}

export function childrenOf(items: Items, itemOrder: string[], parentId: string): Item[] {
  return itemOrder.map((id) => items[id]).filter((entry): entry is Item => Boolean(entry) && entry.parent === parentId);
}
