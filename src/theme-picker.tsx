import { Action, ActionPanel, Grid, Icon, Toast, closeMainWindow, showHUD, showToast } from "@vicinae/api";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CURRENT_THEME_NAME, DEFAULT_THEMES, USER_THEMES } from "./lib/core/paths";
import { run } from "./lib/sh";

type Theme = { name: string; title: string; preview?: string; current: boolean };

const IMG = /\.(png|jpe?g|webp|gif|bmp)$/i;

function findPreview(dir: string): string | undefined {
  for (const f of ["preview.png", "preview.jpg", "preview.jpeg", "preview.webp"]) {
    const p = join(dir, f);
    if (existsSync(p)) return p;
  }
  const bg = join(dir, "backgrounds");
  if (existsSync(bg)) {
    const imgs = readdirSync(bg).filter((f) => IMG.test(f)).sort();
    if (imgs.length) return join(bg, imgs[0]);
  }
  return undefined;
}

function prettify(name: string): string {
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function currentTheme(): string {
  try {
    return readFileSync(CURRENT_THEME_NAME, "utf8").trim();
  } catch {
    return "";
  }
}

function listThemes(): Theme[] {
  const seen = new Set<string>();
  const themes: Theme[] = [];
  const current = currentTheme();
  // User themes take precedence over the packaged ones; statSync follows the
  // symlinks a dotfile manager leaves behind.
  for (const base of [USER_THEMES, DEFAULT_THEMES]) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      if (seen.has(entry)) continue;
      const dir = join(base, entry);
      try {
        if (!statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      seen.add(entry);
      const preview = findPreview(dir) ?? findPreview(join(DEFAULT_THEMES, entry));
      themes.push({ name: entry, title: prettify(entry), preview, current: entry === current });
    }
  }
  return themes.sort((a, b) => Number(b.current) - Number(a.current) || a.title.localeCompare(b.title));
}

async function applyTheme(theme: Theme) {
  await closeMainWindow();
  const r = await run(["maitri-theme-set", theme.name]);
  if (r.ok) await showHUD(`Theme set: ${theme.title}`);
  else await showToast({ style: Toast.Style.Failure, title: "Failed to set theme", message: r.stderr.slice(0, 200) });
}

export default function ThemePicker() {
  const themes = listThemes();
  return (
    <Grid searchBarPlaceholder="Set maitri theme...">
      <Grid.Section columns={3} fit={Grid.Fit.Fill}>
        {themes.map((t) => (
          <Grid.Item
            key={t.name}
            title={t.current ? `${t.title} ✓` : t.title}
            content={t.preview ? { source: t.preview } : { source: Icon.Brush }}
            actions={
              <ActionPanel>
                <Action title="Apply Theme" onAction={() => applyTheme(t)} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
