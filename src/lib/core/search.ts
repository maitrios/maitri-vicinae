import type { GuardResults } from "./guards";
import type { Item, Items, MenuModel } from "./menu-model";

export interface Hit {
  entry: Item;
  path: string;
  score: number;
}

// Mirrors Menu.qml's rebuildDisplay for a typed query: every visible
// descendant of the active menu that matches, best score first. Root and app
// rows never match, and hidden rows stay hidden.
export function search(model: MenuModel, items: Items, itemOrder: string[], activeId: string, query: string, guards: GuardResults): Hit[] {
  const q = query.trim();
  if (!q) return [];
  const hits: Hit[] = [];
  for (const id of itemOrder) {
    const entry = items[id];
    if (!entry || entry.kind === "app") continue;
    if (activeId !== "root" && !model.isDescendantOf(items, id, activeId)) continue;
    const visible = model.isVisible(items, itemOrder, guards.when, entry);
    if (!model.matchesQuery(entry, q, visible)) continue;
    hits.push({ entry, path: model.parentPathFor(items, id), score: model.searchScore(items, entry, q) });
  }
  hits.sort((a, b) => a.score - b.score);
  return hits;
}
