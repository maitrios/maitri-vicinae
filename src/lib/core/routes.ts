import type { Items, MenuModel } from "./menu-model";

export type ViewName = "theme-picker" | "background-picker" | "unlock-picker" | "keybindings";

// Rows the extension renders itself instead of running the shell command the
// JSONC names (those commands drive the Quickshell image grid).
export const VIEW_OVERRIDES: Record<string, ViewName> = {
  "style.theme": "theme-picker",
  "style.background": "background-picker",
  "style.unlock": "unlock-picker",
  "learn.keybindings": "keybindings",
};

export type Resolved =
  | { kind: "root" }
  | { kind: "apps" }
  | { kind: "menu"; id: string }
  | { kind: "action"; id: string; action: string }
  | { kind: "view"; view: ViewName; id: string }
  | { kind: "unknown"; query: string };

export function resolve(model: MenuModel, items: Items, itemOrder: string[], input: string): Resolved {
  const id = model.resolveRoute(items, itemOrder, input);
  if (id === "root") return { kind: "root" };
  if (id === "apps") return { kind: "apps" };
  const entry = items[id];
  if (!entry) return { kind: "unknown", query: String(input || "") };
  const view = VIEW_OVERRIDES[entry.id];
  if (view) return { kind: "view", view, id: entry.id };
  if (entry.kind === "action") return { kind: "action", id: entry.id, action: entry.action };
  if (entry.kind === "link") {
    const target = items[entry.target];
    if (!target) return { kind: "unknown", query: entry.target };
    if (target.provider === "apps") return { kind: "apps" };
    return { kind: "menu", id: target.id };
  }
  if (entry.provider === "apps") return { kind: "apps" };
  return { kind: "menu", id: entry.id };
}
