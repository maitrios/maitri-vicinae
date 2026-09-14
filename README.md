# vicinae-maitri

The [Vicinae](https://vicinae.com) extension that gives [maitri](https://github.com/kindness-ai/maitri)
its menu, keybindings viewer and pickers. Vicinae is maitri's launcher; this extension is the maitri
menu inside it.

## Commands

- **maitri Menu** — renders `maitri-menu.jsonc` (the same data file the Quickshell menu reads),
  merged with `~/.config/maitri/extensions/maitri-menu.jsonc`. `maitri menu toggle <route>` opens it
  at an id or alias via `fallbackText`; an action route runs directly.
- **maitri Keybindings** — searchable Hyprland bindings from `maitri-menu-keybindings --records`.
- **maitri Theme / Background / Unlock Screen** — grid pickers over the maitri theme state.
- **maitri Input** — the text prompt behind `maitri-menu-input` (tempfile handshake).

## How the menu works

The extension loads `$MAITRI_PATH/shell/plugins/menu/MenuModel.js` at runtime, so parsing, merging,
route resolution, guard batching and search ranking have exactly one implementation shared with
maitri's shell. `when:` / `checked:` guards run as one `bash -lc` batch; the menu opens on the previous
answers (cached under the extension's support path) and refreshes in the background. `fonts` and
`power-profiles` providers mirror the shell's; `apps` pops to Vicinae's own search.

Icons: Vicinae cannot render the Nerd Font glyphs the JSONC carries, so `src/lib/icons.ts` maps rows to
bundled Phosphor icons. A menu entry can name its own with `"vicinaeIcon": "gear"`.

## Develop

Requires Node 20+, a maitri checkout or install, and a running Vicinae server.

```bash
npm install
npm test                                  # Node tests over the vendored MenuModel.js fixture
MAITRI_PATH=~/dev/kindness/maitri npm test  # ...against a real checkout
npm run dev                               # vici develop — hot reloads into the running Vicinae
```

`tools/sync-menumodel.sh ~/dev/kindness/maitri` refreshes the test fixture and fails if the exports
the extension depends on changed.

## Build / install locally

```bash
npm run build    # vici build — installs into ~/.local/share/vicinae/extensions/
```

## Distribution

On a `v*` tag (or a published GitHub release), CI tests, builds with `vici build -o dist`, and attaches
**`maitri-vicinae-extension.tar.gz`** (contents at the archive root) plus a `.sha256`. maitri ships it
as the `maitri-vicinae-extension` pacman package (`/usr/share/maitri/vicinae-extension`), and
`maitri-refresh-vicinae-extension` copies it into the user's extensions dir.

See [RELEASING.md](RELEASING.md).
