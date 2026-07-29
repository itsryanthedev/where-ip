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

## Android phone (Play)

1. Start a Pixel-class emulator (~1080×1920) or use a physical device.
2. From repo root: `pnpm android` (or `pnpm start` then `a`).
3. Capture the 4 scenes above.
4. Save as:
   - `store-screenshots/raw/android/01.png` … `04.png`
   - and copy into `store-screenshots/public/screenshots/android/phone/en/01.png` … `04.png`

## iPhone (App Store)

1. Boot an iPhone 15/16 simulator (6.1" or 6.7").
2. From repo root: `pnpm ios` (or `pnpm start` then `i`).
3. Capture the same 4 scenes.
4. Save as:
   - `store-screenshots/raw/ios/01.png` … `04.png`
   - and copy into `store-screenshots/public/screenshots/apple/iphone/en/01.png` … `04.png`

## iPad (App Store)

Use the **iOS Simulator** (Xcode), not Chromium or Playwright.

1. Boot **iPad Pro 13-inch (M5)** (or your target iPad class).
2. From repo root: `pnpm ios` — pick the iPad simulator when prompted.
3. Capture the same 4 scenes at **2064×2752** (Maestro or `xcrun simctl io booted screenshot`).
4. Save as:
   - `store-screenshots/raw/ios-ipad/01.png` … `04.png`
   - and copy into `store-screenshots/public/screenshots/apple/ipad/en/01.png` … `04.png`

Automated capture (Maestro + simctl):

```bash
./scripts/capture-tablet-screenshots.sh ios-ipad
```

Local dev builds use bundle id `com.itsryanthedev.whereip` on iOS; production/EAS uses
`com.elmowjastudio.whereip`. Set `MAESTRO_APP_ID` if your install differs.

## Android tablets (Play)

Use **Android Studio emulators** (`Tablet_7`, `Tablet_10` AVDs), not Chromium.

1. Start the 7" or 10" tablet AVD (or `./scripts/capture-tablet-screenshots.sh android-tablet-7`).
2. Install the app: `pnpm android` with `ANDROID_SERIAL` pointing at the emulator.
3. Capture the same 4 scenes.
4. Save as:
   - `store-screenshots/public/screenshots/android/tablet-7/en/01.png` … `04.png`
   - `store-screenshots/public/screenshots/android/tablet-10/en/01.png` … `04.png`
   - plus matching `store-screenshots/raw/android-tablet-7/` and `raw/android-tablet-10/`

```bash
./scripts/capture-tablet-screenshots.sh android-tablet-7
./scripts/capture-tablet-screenshots.sh android-tablet-10
```

Android package: `com.elmowjastudio.whereip`.

## After captures

```bash
cd store-screenshots
pnpm install   # first time in this subfolder
pnpm dev
# open http://localhost:3000 — tweak copy, then Export bundle per device tab
```

Copy exported PNGs into Fastlane:

| Device | Fastlane path |
|--------|----------------|
| Android phone | `fastlane/metadata/android/en-US/images/phoneScreenshots/` |
| Android 7" | `fastlane/metadata/android/en-US/images/sevenInchScreenshots/` |
| Android 10" | `fastlane/metadata/android/en-US/images/tenInchScreenshots/` |
| iPad 13" | `fastlane/metadata/ios/en-US/screenshots/` (2064×2752 set) |
| iPad 12.9" | same folder tree (2048×2732 export size) |

Feature graphic is already at:

`fastlane/metadata/android/en-US/images/featureGraphic.png`

(from `store-assets/android/feature-graphic-1024x500.png`).
