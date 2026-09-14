import { Action, ActionPanel, Grid, Toast, closeMainWindow, showHUD, showToast } from "@vicinae/api";
import { existsSync, readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CURRENT_BACKGROUND, CURRENT_THEME_DIR, CURRENT_THEME_NAME, USER_BACKGROUNDS } from "./lib/core/paths";
import { run } from "./lib/sh";

const IMG = /\.(png|jpe?g|gif|bmp|webp)$/i;

function currentThemeName(): string | undefined {
  try {
    return readFileSync(CURRENT_THEME_NAME, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

function currentBackground(): string | undefined {
  try {
    return resolve(readlinkSync(CURRENT_BACKGROUND));
  } catch {
    return undefined;
  }
}

// The active theme's backgrounds, then the user's per-theme additions under
// ~/.config/maitri/backgrounds/<theme>, de-duped by filename.
function listBackgrounds(): string[] {
  const dirs = [join(CURRENT_THEME_DIR, "backgrounds")];
  const theme = currentThemeName();
  if (theme) dirs.push(join(USER_BACKGROUNDS, theme));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!IMG.test(f) || seen.has(f)) continue;
      const p = join(d, f);
      try {
        if (!statSync(p).isFile()) continue;
      } catch {
        continue;
      }
      seen.add(f);
      out.push(p);
    }
  }
  return out.sort((a, b) => basename(a).localeCompare(basename(b)));
}

function title(p: string): string {
  return basename(p).replace(IMG, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function setBackground(path: string) {
  await closeMainWindow();
  const r = await run(["maitri-theme-bg-set", path]);
  if (r.ok) await showHUD("Background updated");
  else await showToast({ style: Toast.Style.Failure, title: "Failed to set background", message: r.stderr.slice(0, 200) });
}

export default function BackgroundPicker() {
  const backgrounds = listBackgrounds();
  const current = currentBackground();
  return (
    <Grid searchBarPlaceholder="Set background...">
      <Grid.Section columns={3} fit={Grid.Fit.Fill}>
        {backgrounds.map((p) => (
          <Grid.Item
            key={p}
            title={current && resolve(p) === current ? `${title(p)} ✓` : title(p)}
            content={{ source: p }}
            actions={
              <ActionPanel>
                <Action title="Set Background" onAction={() => setBackground(p)} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
