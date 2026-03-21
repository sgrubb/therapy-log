# Icons

`icon.svg` is the source artwork. All other icon files are generated from it.

## Generating icons

```
npm run generate:icons
```

This converts `icon.svg` → `icon.png` (1024×1024) using `sharp`, then uses
`electron-icon-builder` to produce `icon.ico` (Windows) and `icon.icns` (macOS).

Icon generation runs automatically at the start of all `build:*` scripts.

## Generated files

| File        | Format | Used for                  |
|-------------|--------|---------------------------|
| icon.png    | PNG    | Dev window icon           |
| icon.ico    | ICO    | Windows executable & NSIS |
| icon.icns   | ICNS   | macOS app bundle          |

These files are gitignored — regenerate them from `icon.svg` when needed.
