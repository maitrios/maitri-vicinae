import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// maitri is package-backed: the runtime lives at /usr/share/maitri unless
// `maitri dev link` wrote /etc/maitri.conf, or MAITRI_PATH is set explicitly.
export function maitriPath(): string {
  if (process.env.MAITRI_PATH) return process.env.MAITRI_PATH;
  try {
    const conf = readFileSync("/etc/maitri.conf", "utf8");
    const m = conf.match(/^MAITRI_PATH=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // no dev link
  }
  return "/usr/share/maitri";
}

export const MAITRI = maitriPath();
export const HOME = homedir();

export const STATE_DIR = join(HOME, ".local/state/maitri");
export const CURRENT_DIR = join(STATE_DIR, "current");
export const CURRENT_THEME_DIR = join(CURRENT_DIR, "theme");
export const CURRENT_THEME_NAME = join(CURRENT_DIR, "theme.name");
export const CURRENT_BACKGROUND = join(CURRENT_DIR, "background");

export const CONFIG_DIR = join(HOME, ".config/maitri");
export const USER_THEMES = join(CONFIG_DIR, "themes");
export const USER_BACKGROUNDS = join(CONFIG_DIR, "backgrounds");
export const USER_MENU = join(CONFIG_DIR, "extensions/maitri-menu.jsonc");

export const DEFAULT_THEMES = join(MAITRI, "themes");
export const DEFAULT_MENU = join(MAITRI, "default/maitri/maitri-menu.jsonc");
export const MENU_MODEL = join(MAITRI, "shell/plugins/menu/MenuModel.js");
export const PLYMOUTH_DEFAULT_PREVIEW = join(MAITRI, "default/plymouth/preview-unlock.png");

export function runtimePresent(): boolean {
  return existsSync(MENU_MODEL) && existsSync(DEFAULT_MENU);
}
