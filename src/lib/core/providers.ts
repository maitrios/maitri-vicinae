import type { Item, MenuModel } from "./menu-model";

export interface ProviderSpec {
  script: string;
  volatile?: boolean;
  actionFor(value: string): string;
}

export function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

// Mirrors the providers map in shell/plugins/menu/Menu.qml. `apps` is not
// here: Vicinae's own root search is the app launcher, so that row pops to it.
export const PROVIDERS: Record<string, ProviderSpec> = {
  fonts: {
    script:
      "current=$(maitri-font-current 2>/dev/null); maitri-font-list 2>/dev/null | while read -r f; do [[ -z $f ]] && continue; printf '%s\\t%s\\t%s\\n' \"$f\" \"$f\" \"$current\"; done",
    volatile: true,
    actionFor: (value) => `maitri-font-set ${shellQuote(value)}`,
  },
  "power-profiles": {
    script:
      "current=$(powerprofilesctl get 2>/dev/null); maitri-powerprofiles-list 2>/dev/null | while read -r p; do [[ -z $p ]] && continue; printf '%s\\t%s\\t%s\\n' \"$p\" \"$p\" \"$current\"; done",
    actionFor: (value) => `maitri-powerprofiles-set autodetect ${shellQuote(value)}`,
  },
};

export interface ProviderRow extends Item {
  current: boolean;
}

// `label<TAB>value<TAB>current` per line; the row whose value equals current
// gets the check. Distinct values can slugify alike, so a repeated id is
// nudged rather than dropped.
export function parseProviderRows(model: MenuModel, menuId: string, spec: ProviderSpec, output: string): ProviderRow[] {
  const rows: ProviderRow[] = [];
  const taken = new Set<string>();
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split("\t");
    const label = parts[0] ?? "";
    const value = parts[1] || parts[0] || "";
    const current = parts[2] ?? "";
    if (!label) continue;
    let id = `${menuId}.${model.slugify(value)}`;
    while (taken.has(id)) id += "-";
    taken.add(id);
    rows.push({
      id,
      parent: menuId,
      kind: "action",
      icon: value === current ? "✓" : "",
      iconFont: "",
      label,
      title: "",
      target: "",
      description: "",
      action: spec.actionFor(value),
      provider: "",
      aliases: [],
      when: "",
      checked: "",
      current: value === current,
    });
  }
  return rows;
}
