# Releasing

Releases are built and published by `.github/workflows/release.yml`. The workflow
produces a prebuilt extension bundle so maitri can drop it onto user machines
without a Node toolchain.

## Cut a release

1. Bump `version` in `package.json` and commit. Then bump `pkgver` and `sha256sums` in
   maitri-pkgs `pkgbuilds/maitri-vicinae-extension/PKGBUILD` once the release asset exists.
2. Tag the release and push the tag:

   ```fish
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   Publishing a GitHub release also triggers the workflow.

## What the workflow produces

On a `v*` tag push (or a published release), CI runs `npm ci && npm test && npx vici build -o dist`.
The `dist/` directory is packaged and attached to the release as:

| Asset | Description |
| --- | --- |
| `maitri-vicinae-extension.tar.gz` | The built extension (`package.json`, `*.js`, `assets/`) with contents at the archive root. |
| `maitri-vicinae-extension.tar.gz.sha256` | SHA-256 checksum of the tarball. |

## What maitri fetches

maitri downloads **`maitri-vicinae-extension.tar.gz`** from the release and unpacks
it directly into a target dir (contents are at the archive root, no leading
directory):

```fish
tar -xzf maitri-vicinae-extension.tar.gz -C ~/.local/share/vicinae/extensions/maitri
```

Verify integrity against the `.sha256` asset before unpacking.
