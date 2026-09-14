import { readFileSync } from "node:fs";
import { MENU_MODEL } from "./paths";

// One entry of the menu tree, as MenuModel.js normalizes it.
export interface Item {
  id: string;
  parent: string;
  kind: "menu" | "link" | "action" | "app";
  icon: string;
  iconFont: string;
  label: string;
  title: string;
  target: string;
  description: string;
  action: string;
  provider: string;
  aliases: string[];
  when: string;
  checked: string;
  order?: number;
  providerMenu?: string;
}

export type Items = Record<string, Item>;
export interface Merged {
  items: Items;
  itemOrder: string[];
}

// The subset of shell/plugins/menu/MenuModel.js this extension calls. The
// file is plain dependency-free JS with a module.exports guard; loading it
// from the installed maitri tree keeps exactly one menu implementation.
export interface MenuModel {
  guardReaders: string[];
  guardScript(items: Items): string;
  stripJsonc(raw: string): string;
  parseMenuJsonc(raw: string): Item[];
  mergeMenuSources(defaultItems: Item[], userItems: Item[]): Merged;
  swapProviderRows(items: Items, itemOrder: string[], menuId: string, rows: Item[]): Merged;
  resolveRoute(items: Items, itemOrder: string[], input: string): string;
  slugify(value: string): string;
  depthFor(items: Items, id: string): number;
  pathFor(items: Items, id: string): string;
  parentPathFor(items: Items, id: string): string;
  isDescendantOf(items: Items, id: string, ancestorId: string): boolean;
  childCount(items: Items, itemOrder: string[], id: string): number;
  isVisible(items: Items, itemOrder: string[], whenResults: Record<string, boolean>, entry: Item, depth?: number): boolean;
  labelFor(entry: Item, checkedResults: Record<string, boolean>): string;
  matchesQuery(entry: Item, query: string, visible: boolean): boolean;
  searchScore(items: Items, entry: Item, query: string): number;
}

const REQUIRED: Array<keyof MenuModel> = [
  "guardScript",
  "parseMenuJsonc",
  "mergeMenuSources",
  "swapProviderRows",
  "resolveRoute",
  "slugify",
  "pathFor",
  "parentPathFor",
  "isDescendantOf",
  "childCount",
  "isVisible",
  "labelFor",
  "matchesQuery",
  "searchScore",
];

// `vici build` bundles with esbuild, which would try to resolve a literal
// require() of an absolute path at build time. Evaluating the source with a
// CommonJS-shaped wrapper sidesteps that and needs nothing from the host.
export function loadMenuModel(path: string = MENU_MODEL): MenuModel {
  const source = readFileSync(path, "utf8");
  const mod: { exports: Partial<MenuModel> } = { exports: {} };
  const evaluate = new Function("module", "exports", `${source}\n;return module.exports;`);
  const exported = evaluate(mod, mod.exports) as Partial<MenuModel>;
  const missing = REQUIRED.filter((name) => typeof exported[name] !== "function");
  if (missing.length) {
    throw new Error(`MenuModel.js at ${path} lacks: ${missing.join(", ")}`);
  }
  return exported as MenuModel;
}
