import { join } from "node:path";
import { loadMenuModel } from "../src/lib/core/menu-model";
import { loadMenu } from "../src/lib/core/menu-source";

export const FIXTURES = join(__dirname, "fixtures");
export const MODEL_PATH = process.env.MAITRI_PATH
  ? join(process.env.MAITRI_PATH, "shell/plugins/menu/MenuModel.js")
  : join(FIXTURES, "MenuModel.js");

export function model() {
  return loadMenuModel(MODEL_PATH);
}

export function menu(overlay = "user-overlay.jsonc") {
  const m = model();
  return { model: m, menu: loadMenu(m, join(FIXTURES, "default-menu.jsonc"), join(FIXTURES, overlay)) };
}
