import { environment } from "@vicinae/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_GUARDS, evaluateGuards, type GuardResults } from "./core/guards";
import { loadMenuModel, type Items, type MenuModel } from "./core/menu-model";
import { loadMenu, type Extras } from "./core/menu-source";
import { PROVIDERS, parseProviderRows } from "./core/providers";
import { runtimePresent } from "./core/paths";
import { runShell } from "./sh";

export interface MenuState {
  model: MenuModel | null;
  items: Items;
  itemOrder: string[];
  extras: Record<string, Extras>;
  guards: GuardResults;
  guardsLoading: boolean;
  errors: string[];
  missingRuntime: boolean;
  loadProvider(menuId: string): void;
}

function guardCachePath(): string {
  return join(environment.supportPath, "guards.json");
}

function readCachedGuards(): GuardResults {
  try {
    const raw = readFileSync(guardCachePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.when && parsed.checked) return parsed as GuardResults;
  } catch {
    // no cache yet
  }
  return EMPTY_GUARDS;
}

function writeCachedGuards(guards: GuardResults) {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(guardCachePath(), JSON.stringify(guards));
  } catch {
    // caching is best-effort
  }
}

// Loads the merged menu once per launch. Guards render on the previous
// answers (cached under the extension's support path, as the shell keeps its
// last batch) and refresh in the background, so opening is instant.
export function useMenu(): MenuState {
  const missingRuntime = !runtimePresent();
  const model = useMemo(() => (missingRuntime ? null : loadMenuModel()), [missingRuntime]);
  const initial = useMemo(() => (model ? loadMenu(model) : null), [model]);

  const [items, setItems] = useState<Items>(initial?.items ?? {});
  const [itemOrder, setItemOrder] = useState<string[]>(initial?.itemOrder ?? []);
  const [guards, setGuards] = useState<GuardResults>(() => readCachedGuards());
  const [guardsLoading, setGuardsLoading] = useState(Boolean(model));
  const loadedProviders = useRef(new Set<string>());

  useEffect(() => {
    if (!model || !initial) return;
    let cancelled = false;
    evaluateGuards(model, initial.items, runShell, readCachedGuards()).then((next) => {
      if (cancelled) return;
      setGuards(next);
      writeCachedGuards(next);
      setGuardsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [model, initial]);

  const loadProvider = useCallback(
    (menuId: string) => {
      if (!model) return;
      const entry = items[menuId];
      const spec = entry?.provider ? PROVIDERS[entry.provider] : undefined;
      if (!entry || !spec) return;
      if (loadedProviders.current.has(menuId) && !spec.volatile) return;
      loadedProviders.current.add(menuId);
      runShell(spec.script).then((result) => {
        if (!result.ok) return;
        const rows = parseProviderRows(model, menuId, spec, result.stdout);
        setItems((current) => {
          const merged = model.swapProviderRows(current, itemOrder, menuId, rows);
          setItemOrder(merged.itemOrder);
          return merged.items;
        });
      });
    },
    [model, items, itemOrder],
  );

  return {
    model,
    items,
    itemOrder,
    extras: initial?.extras ?? {},
    guards,
    guardsLoading,
    errors: initial?.errors ?? [],
    missingRuntime,
    loadProvider,
  };
}
