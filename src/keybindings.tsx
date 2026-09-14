import { Action, ActionPanel, Color, List, Toast, closeMainWindow, showToast } from "@vicinae/api";
import { useEffect, useState } from "react";
import { ph } from "./lib/icons";
import { capture, run } from "./lib/sh";

type Bind = {
  combo: string;
  label: string;
  dispatcher: string;
  arg: string;
  special: boolean; // XF86 / media / mouse — sorted to the bottom
};

// maitri-menu-keybindings --records prints one binding per line as
// "<chord padded> → <description>\t<dispatcher>\t<arg>", already resolved
// through maitri's Lua-bind recovery (hyprctl reports Lua binds as
// dispatcher __lua, which cannot be dispatched back). --dispatch runs one.
function parseRecords(out: string): Bind[] {
  return out
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const [display, dispatcher = "", arg = ""] = line.split("\t");
      const arrow = display.indexOf("→");
      const combo = (arrow >= 0 ? display.slice(0, arrow) : display).trim();
      const label = (arrow >= 0 ? display.slice(arrow + 1) : "").trim() || dispatcher;
      const special = /XF86|MOUSE/i.test(combo);
      return { combo, label, dispatcher, arg, special };
    });
}

// Fallback for a runtime without --records: hyprctl's JSON, descriptions
// included; Lua binds are shown but cannot be run.
function modText(mask: number): string {
  const parts: string[] = [];
  if (mask & 64) parts.push("SUPER");
  if (mask & 1) parts.push("SHIFT");
  if (mask & 4) parts.push("CTRL");
  if (mask & 8) parts.push("ALT");
  return parts.join(" + ");
}

function parseHyprctl(out: string): Bind[] {
  let raw: Array<Record<string, unknown>> = [];
  try {
    raw = JSON.parse(out);
  } catch {
    return [];
  }
  return raw
    .filter((b) => b && typeof b.description === "string" && b.description)
    .map((b) => {
      const mods = modText(Number(b.modmask) || 0);
      const key = String(b.key || (b.keycode ? `code:${b.keycode}` : "")).toUpperCase();
      const combo = [mods, key].filter(Boolean).join(" + ");
      const dispatcher = String(b.dispatcher || "");
      return { combo, label: String(b.description), dispatcher: dispatcher === "__lua" ? "" : dispatcher, arg: b.arg ? String(b.arg) : "", special: key.startsWith("XF86") || Boolean(b.mouse) };
    });
}

export default function Keybindings() {
  const [binds, setBinds] = useState<Bind[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let parsed = parseRecords(await capture(["maitri-menu-keybindings", "--records"]));
      if (!parsed.length) parsed = parseHyprctl(await capture(["hyprctl", "-j", "binds"]));
      parsed.sort((a, b) => Number(a.special) - Number(b.special));
      setBinds(parsed);
    })().finally(() => setLoading(false));
  }, []);

  async function runBind(b: Bind) {
    if (!b.dispatcher) {
      await showToast({ style: Toast.Style.Failure, title: "This binding cannot be run from here" });
      return;
    }
    const r = await run(["maitri-menu-keybindings", "--dispatch", b.dispatcher, b.arg]);
    if (!r.ok) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to run shortcut", message: r.stderr.slice(0, 160) });
      return;
    }
    await closeMainWindow();
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search keybindings…">
      {binds.map((b, i) => (
        <List.Item
          key={`${i}-${b.combo}`}
          icon={ph("keyboard", Color.PrimaryText)}
          title={b.label}
          keywords={b.combo.split(/\s+\+\s+|\s+/)}
          accessories={[{ tag: { value: b.combo, color: Color.SecondaryText } }]}
          actions={
            <ActionPanel>
              <Action title="Run Shortcut" icon={ph("play", Color.PrimaryText)} onAction={() => runBind(b)} />
              <Action.CopyToClipboard title="Copy Shortcut" content={b.combo} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
