# Release Checklist

## Provider and privacy review

- [ ] Open every provider documentation, privacy, and terms URL.
- [ ] Confirm public client-side use is still permitted.
- [ ] Confirm endpoints, rate limits, CORS behavior, and response fields.
- [ ] Obtain written confirmation that IPinfo permits this public client-side
      app, or replace it before submission.
- [ ] Resolve the difference between ipwho.is free-endpoint documentation
      ("commercial use allowed") and its personal/internal-use Terms.
- [ ] Update the policy date if behavior or providers changed.
- [ ] Confirm the deployed `/privacy` URL is public and stable.
- [ ] Complete Google Play Data Safety and Apple App Privacy answers from the
      final binary and current provider policies.

## Product checks

- [ ] Delete app data and verify no provider request occurs before consent.
- [ ] Verify Continue starts exactly one lookup.
- [ ] Verify IPinfo, FreeIPAPI, and ipwho.is independently.
- [ ] Verify fallback and `Retry-After` handling with mocked responses.
- [ ] Verify 60-second refresh cooldown survives an app restart.
- [ ] Verify a provider switch refreshes immediately when allowed, otherwise
      counts down and performs exactly one lookup when the cooldown ends.
- [ ] Verify cached/offline behavior.
- [ ] Verify copy, share, external links, and provider selection.
- [ ] Verify light and dark appearance on a phone and tablet.
- [ ] Verify web keyboard navigation and visible focus.
- [ ] Confirm no store screenshot contains a real personal IP address.

## Automated checks

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm dlx expo-doctor
```

## Version and build

- [ ] Update `expo.version`.
- [ ] Increment `ios.buildNumber`.
- [ ] Increment `android.versionCode`.
- [ ] Confirm bundle/package ID is `com.itsryanthedev.whereip`.
- [ ] Confirm the Expo account owner and add the EAS project ID.
- [ ] Produce signed production builds through EAS.
- [ ] Run an internal distribution build on physical iOS and Android devices.

## Store submission

- [ ] Verify app name availability and final legal seller details.
- [ ] Upload current icons, screenshots, descriptions, support URL, and policy.
- [ ] Confirm content rating and age declarations.
- [ ] Complete Android developer verification requirements.
- [ ] For an organization Play account, choose the appropriate release track;
      do not assume personal-account closed-testing rules apply.
- [ ] Submit to Play internal testing first for a final install smoke test.
- [ ] Submit to TestFlight for a final iOS smoke test.
- [ ] Promote to production only after the signed store builds pass.

## Desktop local smoke (unsigned)

Phase 4 packaging is unsigned and local/CI-only. Signing, notarization, and
store channels are later phases. Packaging uses `scripts/package-desktop.mjs`
(cached Electron zip + system unzip) because Electron Forge currently pulls an
exotic git subdependency blocked by this repo's pnpm policy.

```bash
pnpm install --frozen-lockfile
pnpm run electron:test
pnpm run export:desktop
pnpm run electron:package
# Optional interactive smoke (requires a display):
# pnpm run electron:start
```

- [ ] Confirm `electron:test` passes allowlist and protocol path checks.
- [ ] Confirm `export:desktop` writes `dist-desktop/` with root asset paths.
- [ ] Confirm `electron:package` writes an unsigned app under `out/`.
- [ ] Confirm cold start loads `whereip://app/` and IP lookup works via IPC.
- [ ] Confirm external links only open allowlisted HTTPS destinations.
- [ ] Confirm `pnpm verify` still passes without packaging Electron.
