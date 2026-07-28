# WhereIP store screenshot capture

Do this before exporting framed marketing slides. Never commit screenshots that
show your real personal IP or home location — mask or replace them.

## Target scenes (4)

| File | Scene | How |
|------|--------|-----|
| `01.png` | Home with IP result | Accept disclosure → wait for lookup |
| `02.png` | First-run disclosure | Clear app data / reinstall → launch |
| `03.png` | Provider picker open | Home → tap Provider chevron |
| `04.png` | About & Privacy | Tap (i) → About sheet |

## Android (Play)

1. Start a Pixel-class emulator (~1080×1920) or use a physical device.
2. From repo root: `pnpm android` (or `pnpm start` then `a`).
3. Capture the 4 scenes above.
4. Save as:
   - `store-screenshots/raw/android/01.png` … `04.png`
   - and copy into `store-screenshots/public/screenshots/android/phone/en/01.png` … `04.png`

## iOS (App Store)

1. Boot an iPhone 15/16 simulator (6.1" or 6.7").
2. From repo root: `pnpm ios` (or `pnpm start` then `i`).
3. Capture the same 4 scenes.
4. Save as:
   - `store-screenshots/raw/ios/01.png` … `04.png`
   - and copy into `store-screenshots/public/screenshots/apple/iphone/en/01.png` … `04.png`

## After captures

```bash
cd store-screenshots
pnpm dev
# open http://localhost:3000 — tweak copy, then Export bundle
```

Copy exported Android phone PNGs into:

`fastlane/metadata/android/en-US/images/phoneScreenshots/`

Feature graphic is already at:

`fastlane/metadata/android/en-US/images/featureGraphic.png`

(from `store-assets/android/feature-graphic-1024x500.png`).
