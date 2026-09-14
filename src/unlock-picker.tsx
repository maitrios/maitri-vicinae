import { Action, ActionPanel, Grid, Icon, Toast, closeMainWindow, showToast } from "@vicinae/api";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { PLYMOUTH_DEFAULT_PREVIEW } from "./lib/core/paths";
import { capture, spawnDetachedShell } from "./lib/sh";

type Unlock = { name: string; title: string; preview?: string; reset?: boolean; current: boolean };

function prettify(n: string): string {
  return n.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// maitri-plymouth-list names every theme that ships an unlock screen; the
// preview lives next to it in the theme directory maitri-theme-dir resolves.
async function listUnlocks(): Promise<Unlock[]> {
  const current = await capture(["maitri-plymouth-current"]);
  const out: Unlock[] = [
    {
      name: "__default__",
      title: "Default",
      reset: true,
      preview: existsSync(PLYMOUTH_DEFAULT_PREVIEW) ? PLYMOUTH_DEFAULT_PREVIEW : undefined,
      current: !current || current === "default",
    },
  ];
  const names = (await capture(["maitri-plymouth-list"])).split("\n").map((n) => n.trim()).filter(Boolean);
  for (const name of names) {
    const dir = await capture(["maitri-theme-dir", name]);
    const preview = dir ? join(dir, "preview-unlock.png") : "";
    out.push({ name, title: prettify(name), preview: preview && existsSync(preview) ? preview : undefined, current: name === current });
  }
  return out;
}

// Plymouth changes need sudo, so they run in maitri's floating terminal,
// which carries the password prompt.
async function applyUnlock(u: Unlock) {
  const cmd = u.reset ? "maitri-plymouth-reset" : `maitri-plymouth-set-by-theme ${JSON.stringify(u.name)}`;
  try {
    await closeMainWindow();
    spawnDetachedShell(`maitri-launch-floating-terminal-with-presentation ${JSON.stringify(cmd)}`);
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to launch unlock setup", message: String(e) });
  }
}

export default function UnlockPicker() {
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listUnlocks().then(setUnlocks).finally(() => setLoading(false));
  }, []);
  return (
    <Grid searchBarPlaceholder="Set lock screen..." isLoading={loading}>
      <Grid.Section columns={3} fit={Grid.Fit.Fill}>
        {unlocks.map((u) => (
          <Grid.Item
            key={u.name}
            title={u.current ? `${u.title} ✓` : u.title}
            content={u.preview ? { source: u.preview } : { source: Icon.Lock }}
            actions={
              <ActionPanel>
                <Action title="Set Unlock Screen" onAction={() => applyUnlock(u)} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
