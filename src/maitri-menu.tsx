import { type LaunchProps, popToRoot } from "@vicinae/api";
import { useEffect } from "react";
import { resolve } from "./lib/core/routes";
import { MenuList, runAction } from "./lib/MenuList";
import { useMenu } from "./lib/useMenu";
import { VIEWS } from "./lib/views";

// The maitri menu, rendered from maitri-menu.jsonc. `maitri-menu toggle
// <route>` arrives as fallbackText: an id (setup.power), an alias
// (power-menu), an action route (runs it and closes), or a picker row.
export default function MaitriMenu(props: LaunchProps) {
  const menu = useMenu();
  const route = props.fallbackText?.trim() ?? "";
  const resolved = menu.model && route ? resolve(menu.model, menu.items, menu.itemOrder, route) : null;

  useEffect(() => {
    if (!resolved) return;
    if (resolved.kind === "action") runAction(resolved.action);
    if (resolved.kind === "apps") popToRoot();
  }, [resolved?.kind]);

  if (resolved?.kind === "view") {
    const Comp = VIEWS[resolved.view];
    return <Comp />;
  }
  if (resolved?.kind === "menu") {
    return <MenuList menu={menu} menuId={resolved.id} />;
  }
  if (resolved?.kind === "unknown") {
    // Not an id or alias (a fallback-command search, a typo): show root with
    // the text as the search so the closest rows are one keystroke away.
    return <MenuList menu={menu} menuId="root" initialQuery={resolved.query} />;
  }
  return <MenuList menu={menu} menuId="root" />;
}
