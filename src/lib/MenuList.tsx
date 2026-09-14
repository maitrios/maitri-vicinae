import { Action, ActionPanel, Color, Icon, List, Toast, closeMainWindow, popToRoot, showToast } from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";
import type { Item } from "./core/menu-model";
import { childrenOf } from "./core/menu-source";
import { VIEW_OVERRIDES, type ViewName } from "./core/routes";
import { search } from "./core/search";
import { iconFor } from "./icons";
import { spawnDetachedShell } from "./sh";
import type { MenuState } from "./useMenu";
import { VIEWS } from "./views";

// Actions are launch-and-leave: the child must survive the worker teardown
// that closeMainWindow() triggers, so it is spawned detached first.
export async function runAction(action: string) {
  spawnDetachedShell(action);
  await closeMainWindow();
}

function viewFor(entry: Item): ViewName | undefined {
  return VIEW_OVERRIDES[entry.id];
}

function Row({ entry, menu, path, onOpen }: { entry: Item; menu: MenuState; path?: string; onOpen: (id: string) => void }) {
  const { model, items, itemOrder, guards, extras } = menu;
  if (!model) return null;
  const label = model.labelFor(entry, guards.checked);
  const checked = entry.checked ? Boolean(guards.checked[entry.id]) : entry.icon === "✓";
  const accessories = checked ? [{ icon: Icon.Check }] : [];
  const icon = iconFor(entry, extras[entry.id]);
  const view = viewFor(entry);

  if (view) {
    const Comp = VIEWS[view];
    return (
      <List.Item
        icon={icon}
        title={label}
        subtitle={path}
        keywords={[entry.description, ...entry.aliases].filter(Boolean)}
        accessories={[...accessories, { icon: Icon.ChevronRight }]}
        actions={<ActionPanel><Action.Push title={`Open ${entry.label}`} target={<Comp />} /></ActionPanel>}
      />
    );
  }

  if (entry.kind === "action") {
    return (
      <List.Item
        icon={icon}
        title={label}
        subtitle={path}
        keywords={[entry.description, ...entry.aliases].filter(Boolean)}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action title={entry.label} onAction={() => runAction(entry.action)} />
            <Action.CopyToClipboard title="Copy Command" content={entry.action} />
          </ActionPanel>
        }
      />
    );
  }

  const targetId = entry.kind === "link" ? entry.target : entry.id;
  const target = items[targetId];
  const isApps = target?.provider === "apps";
  const count = isApps ? 0 : model.childCount(items, itemOrder, targetId);
  return (
    <List.Item
      icon={icon}
      title={label}
      subtitle={path}
      keywords={[entry.description, ...entry.aliases].filter(Boolean)}
      accessories={[...accessories, ...(count ? [{ text: String(count) }] : []), { icon: Icon.ChevronRight }]}
      actions={
        <ActionPanel>
          {isApps ? (
            <Action title="Search Apps" onAction={() => popToRoot()} />
          ) : (
            <Action title={`Open ${entry.label}`} onAction={() => onOpen(targetId)} />
          )}
        </ActionPanel>
      }
    />
  );
}

export function MenuList({ menu, menuId, initialQuery }: { menu: MenuState; menuId: string; initialQuery?: string }) {
  const { model, items, itemOrder, guards, guardsLoading, errors, missingRuntime, loadProvider } = menu;
  const [activeId, setActiveId] = useState(menuId);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [stack, setStack] = useState<string[]>([]);

  useEffect(() => {
    loadProvider(activeId);
  }, [activeId, loadProvider]);

  useEffect(() => {
    if (errors.length) {
      showToast({ style: Toast.Style.Failure, title: "A maitri menu file did not parse", message: errors[0] });
    }
  }, [errors]);

  const active = items[activeId];
  const title = active && activeId !== "root" ? active.title || active.label : "maitri";

  const rows = useMemo(() => {
    if (!model) return [];
    const q = query.trim();
    if (q) {
      return search(model, items, itemOrder, activeId, q, guards).map((hit) => ({ entry: hit.entry, path: hit.path }));
    }
    return childrenOf(items, itemOrder, activeId)
      .filter((entry) => entry.kind !== "app" && model.isVisible(items, itemOrder, guards.when, entry))
      .map((entry) => ({ entry, path: undefined as string | undefined }));
  }, [model, items, itemOrder, activeId, query, guards]);

  if (missingRuntime || !model) {
    return (
      <List navigationTitle="maitri">
        <List.EmptyView title="maitri runtime not found" description="The maitri package (shell/plugins/menu/MenuModel.js and maitri-menu.jsonc) is not installed." />
      </List>
    );
  }

  const open = (id: string) => {
    setStack((s) => [...s, activeId]);
    setActiveId(id);
    setQuery("");
  };
  const back = () => {
    const prev = stack[stack.length - 1];
    if (prev === undefined) return;
    setStack((s) => s.slice(0, -1));
    setActiveId(prev);
    setQuery("");
  };

  return (
    <List
      navigationTitle={title}
      isLoading={guardsLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder={activeId === "root" ? "Search maitri…" : `Search ${title}…`}
      actions={
        stack.length ? (
          <ActionPanel>
            <Action title="Back" onAction={back} />
          </ActionPanel>
        ) : undefined
      }
    >
      {rows.map(({ entry, path }) => (
        <Row key={entry.id} entry={entry} menu={menu} path={path} onOpen={open} />
      ))}
    </List>
  );
}
