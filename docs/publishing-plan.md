# WhereIP Cross-Platform Publishing Plan

**Status:** Planning only  
**Last reviewed:** 2026-07-24  
**Repository:** `itsryanthedev/where-ip`  
**Initial application version:** `1.0.1`

This document describes how to publish WhereIP through:

- the Apple App Store for iPhone and iPad;
- the Mac App Store;
- Google Play for Android phones and tablets;
- GitHub Releases as a signed and notarized macOS Electron application;
- GitHub Releases as a signed Windows Electron application;
- the Microsoft Store;
- GitHub Pages as a static web application.

It also defines how GitHub Actions and Expo Application Services (EAS) should
share CI/CD responsibilities. This is an implementation plan, not the
implementation itself. The workflows, Electron shell, credentials, store
records, and deployment configuration described below are not created yet.

> **Deferred future direction:** Much later, WhereIP is expected to receive its
> own domain name and move its web deployment to Cloudflare Pages. This future
> direction is intentionally out of scope for the current publishing project.
> It must not affect current architecture, estimates, priorities, URLs, or
> implementation decisions. Until a separate migration project is approved,
> GitHub Pages remains the planned web host.

## 1. Executive decision

Use one source repository and three delivery toolchains:

1. **Expo/EAS owns iOS and Android.**
   EAS Build produces the native binaries, EAS Submit uploads them, and EAS
   Workflows coordinates mobile previews and production releases.
2. **GitHub Actions owns web and desktop.**
   GitHub Pages receives the static Expo web export. Native GitHub-hosted macOS
   and Windows runners package, sign, test, and publish the Electron builds.
3. **The Mac App Store build is also Electron-based.**
   Expo does not build macOS applications. The direct macOS application and the
   Mac App Store application should share the same Electron code, with different
   packaging, signing, sandboxing, and update settings.

The resulting distribution matrix is:

| Platform and channel | Artifact | Build system | Submission or deployment |
| --- | --- | --- | --- |
| iOS/iPadOS App Store | Signed `.ipa` | EAS Build | EAS Submit → App Store Connect |
| Android Google Play | Signed `.aab` | EAS Build | EAS Submit → Play Console |
| macOS direct download | Universal `.dmg` and update `.zip` | GitHub Actions on macOS | GitHub Release |
| Mac App Store | Sandboxed MAS `.pkg` | GitHub Actions on macOS | App Store Connect |
| Windows direct download | Signed NSIS `.exe` | GitHub Actions on Windows | GitHub Release |
| Microsoft Store | Store-ready `.msix`/`.msixupload` | GitHub Actions on Windows | Partner Center |
| Web | Static `dist/` export | GitHub Actions | GitHub Pages |

## 2. Current repository readiness

### Already present

- Expo Router with static web output.
- iOS bundle identifier: `com.itsryanthedev.whereip`.
- Android package name: `com.itsryanthedev.whereip`.
- iOS build number and Android version code.
- EAS `development`, `preview`, and `production` build profiles.
- Production build auto-increment through EAS.
- Android preview APK configuration.
- iOS simulator preview configuration.
- A static web export command: `pnpm run export:web`.
- A GitHub Actions CI workflow that installs dependencies and runs
  `pnpm verify`.
- App icons, adaptive icons, splash art, web manifest art, store art, a privacy
  policy, data-safety notes, store-listing copy, and a release checklist.
- `runtimeVersion.policy` set to `appVersion`, which is suitable for controlled
  EAS Update releases.

### Still required

- An EAS project ID and confirmed GitHub-to-EAS project connection.
- EAS Update channels and workflow definitions.
- Apple Developer, App Store Connect, Google Play, and Partner Center records.
- Store-specific metadata and final screenshots.
- A public, stable privacy-policy URL.
- Electron main/preload code and desktop-specific integration.
- Desktop application icons and installer art.
- macOS sandbox entitlements, signing, and notarization configuration.
- Windows signing and MSIX identity configuration.
- GitHub Pages base-path handling.
- Desktop build and release workflows.
- Store-submission workflows and protected production environments.
- A unified version and release-tag policy.

## 3. Important architecture boundaries

### 3.1 No WhereIP backend

The web and desktop user interfaces can be built from the existing Expo web
application. WhereIP still contacts external IP-information providers at
runtime, but it does not need to operate its own backend.

Provider availability, CORS behavior, acceptable-use rules, privacy terms,
response schemas, and rate limits must be reviewed before every store release.
Static hosting or Electron packaging does not remove this dependency.

### 3.2 Electron must not simply disable browser security

The desktop application must not use `webSecurity: false` to work around CORS.
It must:

- bundle and load local, trusted application code;
- serve that code through a restricted custom protocol rather than `file://`;
- keep `nodeIntegration` disabled;
- keep `contextIsolation` and renderer sandboxing enabled;
- enforce a restrictive Content Security Policy;
- deny unexpected permissions, navigation, and new-window creation;
- open only allowlisted HTTPS links in the system browser;
- validate the sender and all arguments for every IPC message.

Provider requests should be performed by an allowlisted IPC method in the main
process. The renderer may request a lookup, but it must not receive a general
filesystem, shell, arbitrary URL-fetching, or Electron API.

### 3.3 Separate direct and store desktop behavior

One Electron codebase should produce channel-specific builds:

- `direct-mac`: Developer ID signed, notarized, DMG/ZIP, optional GitHub updater;
- `mas`: Mac App Store signing, mandatory App Sandbox, no external updater;
- `direct-windows`: signed NSIS installer, optional GitHub updater;
- `windows-store`: Store identity and MSIX package, Store-managed updates.

Store builds must not run a competing self-update mechanism.

## 4. Accounts, ownership, and one-time registrations

Complete these before attempting automated production releases.

### 4.1 Apple

- Enroll the legal publisher in the Apple Developer Program.
- Decide whether the publisher is an individual or organization.
- If enrolling an organization, ensure its legal information and D-U-N-S record
  are accurate.
- Accept all current agreements in App Store Connect.
- Create or confirm the iOS App ID for
  `com.itsryanthedev.whereip`.
- Create a separate macOS App ID, recommended:
  `com.itsryanthedev.whereip.macos`.
- Create App Store Connect app records for iOS/iPadOS and macOS.
- Reserve the final display name and SKU values.
- Create an App Store Connect API key with only the roles required for upload
  and submission.

The Apple membership supports both mobile App Store distribution and Developer
ID distribution outside the Mac App Store. Apple currently requires a paid
annual membership; verify the current price and local tax at enrollment.

### 4.2 Google Play

- Create and verify a Google Play Console developer account.
- Choose the correct personal or organization account type.
- For an organization, prepare the legal entity, website, and D-U-N-S details.
- Complete the applicable Android developer identity-verification requirements.
- Create the app record with package name
  `com.itsryanthedev.whereip`.
- Enroll in Play App Signing and let Google manage the app-signing key.
- Keep the separate upload key under EAS credential management.
- Create a least-privilege Google service account for EAS Submit and grant it
  only the required app/release permissions.

For personal Play accounts created after 2023-11-13, plan for the current closed
testing requirement: at least 12 opted-in testers continuously for 14 days
before applying for production access. Confirm the rule against the actual
account because Google may change it.

### 4.3 Microsoft

- Create and verify a Microsoft Partner Center developer account.
- Reserve the `WhereIP` product name early.
- Create the Microsoft Store app record and obtain the Store identity values:
  package identity name, publisher ID, publisher display name, product ID, and
  Store ID.
- Decide whether Partner Center will be linked to Microsoft Entra ID for
  automated submissions.
- Complete the first product submission manually before enabling submission API
  automation.

### 4.4 Expo

- Create or select the owning Expo account or organization.
- Run `eas init` and commit the generated EAS project linkage.
- Connect the GitHub repository through the Expo GitHub App.
- Perform one successful manual EAS production build for iOS and Android so
  credentials and store associations exist before CI attempts to use them.
- Configure EAS environments for `preview` and `production`.

### 4.5 GitHub

- Keep the repository public if GitHub Pages and public release downloads are
  intended to remain available without a paid GitHub plan.
- Enable GitHub Pages with GitHub Actions as its publishing source.
- Create protected environments:
  - `github-pages`;
  - `desktop-release`;
  - `apple-store`;
  - `google-play`;
  - `microsoft-store`.
- Require a human reviewer for public store/release environments.
- Protect `main` and version tags.
- Require the CI workflow before merge.

## 5. Versioning and release identity

### 5.1 One marketing version

Use SemVer and one marketing version across all deliverables:

```text
1.0.1
```

Create stable release tags in this form:

```text
v1.0.1
```

Use prerelease tags for candidate builds:

```text
v1.0.1-rc.1
```

### 5.2 One source of truth

During implementation, make `package.json` the canonical marketing version and
use `app.config.ts` to feed that version into Expo. Add a CI check that fails if
the tag, package version, and generated platform versions disagree.

Map the shared version as follows:

- Expo `version`: `1.0.1`;
- Electron `version`: `1.0.1`;
- macOS `CFBundleShortVersionString`: `1.0.1`;
- Windows display version: `1.0.1`;
- Windows package version: a valid four-part value derived deterministically,
  such as `1.0.1.0`.

### 5.3 Platform build numbers

- Continue using EAS remote version management and `autoIncrement` for iOS
  build numbers and Android version codes.
- Use the GitHub Actions run number, an explicit release counter, or a stored
  sequence for desktop build identifiers.
- Never reuse an App Store Connect build number, Play version code, or
  Microsoft package version.
- A rejected build can be replaced only with a higher platform build number.

### 5.4 Runtime compatibility

Keep EAS Update on the `appVersion` runtime policy. Increment the marketing
version whenever native modules, native configuration, Expo SDK, permissions,
or platform entitlements change. JavaScript-only updates may be promoted
through EAS Update only after being tested on an identical runtime.

## 6. Branch, pull request, and release model

### 6.1 Pull requests

Every pull request should run GitHub CI:

1. dependency installation with the frozen pnpm lockfile;
2. dependency and lockfile security review;
3. lint;
4. TypeScript checking;
5. unit tests;
6. static web export;
7. artifact/path validation;
8. Electron tests after desktop support exists;
9. secret scanning and dependency review;
10. optional preview EAS Update for trusted internal pull requests.

Do not expose signing or submission secrets to forked pull requests.

### 6.2 Main branch

After CI passes and a change reaches `main`:

- GitHub Actions deploys the web build to GitHub Pages.
- EAS may create a preview update or build for internal testers.
- No store production submission should occur automatically from every merge.

### 6.3 Release candidate

An `-rc.N` tag should:

- rerun the complete verification suite;
- build iOS and Android candidates through EAS;
- submit iOS to TestFlight;
- submit Android to the internal or closed test track;
- build signed desktop candidates;
- upload desktop candidates as GitHub Actions artifacts or a GitHub prerelease;
- build a MAS development/sandbox candidate;
- build and locally validate the Windows MSIX candidate;
- avoid public store promotion.

### 6.4 Stable release

A stable `vX.Y.Z` tag should:

- be accepted only from a commit already validated as a release candidate;
- create immutable web and desktop artifacts from that exact commit;
- deploy the web release;
- create a draft GitHub Release with checksums and generated release notes;
- build and upload the final iOS and Android binaries through EAS;
- prepare the Mac and Microsoft Store submissions;
- pause at protected-environment approvals before public promotion;
- publish the GitHub Release only after signed installer smoke tests pass.

Store review and public availability are asynchronous. The GitHub Release,
website, and mobile/desktop stores may become public at different times, so the
release notes must state the availability of each channel.

## 7. GitHub Actions and EAS responsibility split

### GitHub Actions

GitHub Actions should own:

- source verification on every pull request;
- web export and GitHub Pages deployment;
- Electron packaging;
- macOS Developer ID signing and notarization;
- Mac App Store package generation;
- Windows installer signing;
- Windows MSIX generation and certification tests;
- GitHub Release creation and asset upload;
- checksums, provenance, SBOMs, and release attestations;
- optional Partner Center submission API calls.

### EAS Workflows

EAS Workflows should own:

- iOS and Android development/preview builds;
- TestFlight and Play test-track submissions;
- production native builds;
- EAS Submit for App Store Connect and Google Play;
- EAS Update preview and production channels;
- mobile-only device tests such as Maestro;
- detection of whether a mobile change requires a new native binary or an OTA
  update.

### Coordination rule

GitHub Actions and EAS should react to the same Git commit or release tag. Do
not rebuild from a moving branch during a release. Record the Git SHA, EAS build
IDs, store build numbers, and desktop artifact hashes in the GitHub Release or
release run summary.

## 8. Shared product and compliance preparation

Before any store launch:

- Publish the web application first so that `/privacy` is available at a stable
  HTTPS URL.
- Ensure the privacy policy names the legal publisher shown by every store.
- Explain that lookups send the user's public IP and request metadata directly
  to selected and fallback providers.
- Reconcile the in-app privacy screen, `docs/privacy-policy.md`, Google Data
  safety answers, Apple App Privacy answers, and Microsoft listing.
- Confirm the provider list, endpoint hostnames, rate limits, CORS behavior,
  commercial-use rights, privacy policies, and terms.
- Confirm no analytics, advertising, account, tracking, GPS, contacts, camera,
  microphone, or unrelated permission has been introduced.
- Complete content/age rating questionnaires truthfully.
- Prepare support and marketing URLs.
- Prepare accessibility information where requested.
- Prepare review notes that explain:
  - the purpose of the public-IP lookup;
  - why the result is approximate and not GPS location;
  - the first-run disclosure;
  - caching and refresh cooldown behavior;
  - that no account is required;
  - how reviewers can exercise every feature.

Use `docs/store-listing.md`, `docs/data-safety.md`, and
`docs/privacy-policy.md` as starting material, not automatically final answers.
The final binary and current provider behavior are the source of truth.

## 9. Web application → GitHub Pages

### 9.1 Required configuration

The repository project page will normally be served from:

```text
https://itsryanthedev.github.io/where-ip/
```

Because this is a subpath, configure Expo's web base URL as `/where-ip` for the
GitHub Pages export. Prefer an environment-aware `app.config.ts` so:

- the GitHub Pages build uses `/where-ip`;
- desktop bundles and custom/root domains use `/`;
- local development keeps normal root paths.

Verify that router links, icons, Open Graph images, the web manifest, and static
assets all receive the correct prefix. Do not hardcode a Pages prefix into the
shared UI.

### 9.2 Proposed workflow

Create `.github/workflows/pages.yml`:

1. trigger on successful pushes to `main` and `workflow_dispatch`;
2. check out the exact commit;
3. set up pnpm and the pinned Node version;
4. install with `pnpm install --frozen-lockfile`;
5. run `pnpm verify`;
6. export with the GitHub Pages base URL;
7. add `.nojekyll` because Expo assets may contain underscore-prefixed paths;
8. upload `dist/` with the official Pages artifact action;
9. deploy through the official Pages deployment action;
10. use the protected `github-pages` environment;
11. expose the deployment URL in the run summary.

### 9.3 Web acceptance tests

- `/where-ip/` loads without console errors.
- `/where-ip/about` and `/where-ip/privacy` work through navigation and direct
  browser refresh.
- All JS, images, icons, and manifest requests return 200.
- Provider lookups work from the production origin.
- Copy, refresh, provider selection, disclosure persistence, and offline-cache
  states work.
- Keyboard navigation and visible focus work.
- Mobile and desktop browser layouts pass a responsive check.
- The privacy URL is public without authentication or geographic restriction.
- A Lighthouse/accessibility baseline is recorded.

### 9.4 Rollback

Retain deployed artifacts or tags. A web rollback redeploys the `dist/`
artifact from the last known-good commit; it must not rebuild dependencies from
an old unlocked state.

### 9.5 Deferred future migration — custom domain and Cloudflare Pages

This is a much-later phase and must not be taken into account during the current
implementation.

The intended future direction is:

- acquire a dedicated WhereIP domain name;
- create a Cloudflare account and Pages project;
- move the static Expo web deployment from GitHub Pages to Cloudflare Pages;
- connect the dedicated domain to the Cloudflare Pages project;
- update canonical URLs, Open Graph metadata, manifests, privacy/support URLs,
  store listings, and desktop allowlists;
- configure DNS, HTTPS, redirects, security headers, preview deployments, and
  production deployment protection;
- preserve old GitHub Pages links with redirects where practical;
- validate provider CORS and rate-limit behavior from the new production
  domain.

Do not create the Cloudflare project, buy a domain, change the current web base
URL, add Cloudflare credentials, or modify the GitHub Pages workflow as part of
the current work. When this future migration is authorized, it should receive a
separate plan, threat review, deployment workflow, acceptance tests, and
rollback procedure.

## 10. iOS and iPadOS → Apple App Store

### 10.1 App configuration

Retain:

- bundle identifier `com.itsryanthedev.whereip`;
- no location permission;
- `ITSAppUsesNonExemptEncryption: false`, subject to final export-compliance
  review;
- tablet support;
- the current app version/runtime policy.

Before the first production build:

- confirm the minimum supported iOS/iPadOS version;
- confirm icon and launch-screen rendering on current devices;
- audit generated `Info.plist` permissions;
- confirm that no unused permission is introduced by a dependency;
- configure EAS `preview`, `staging`, and `production` channels;
- add the EAS project ID and Updates URL through `eas update:configure`.

### 10.2 Credentials

- Let EAS manage the iOS distribution certificate and provisioning profile
  unless there is a documented reason to manage them manually.
- Use an App Store Connect API key for unattended submission.
- Store the API key in EAS credential storage, not in GitHub source.
- Limit the key role and rotate it according to an owner-maintained schedule.

### 10.3 Store record

Complete in App Store Connect:

- name, subtitle, description, keywords, promotional text;
- category, age rating, copyright, support URL, marketing URL;
- privacy-policy URL;
- App Privacy questionnaire;
- export-compliance answers;
- screenshots for every required iPhone/iPad device class;
- App Review contact and review notes;
- availability, price (`Free`), territories, and release method.

### 10.4 EAS workflow

Create `.eas/workflows/mobile-production.yml` with:

- a release-tag or protected release-branch trigger;
- a verification job;
- iOS production build using the `production` EAS profile;
- optional staging build on the same runtime;
- submission job that depends on the successful build;
- notification or run-summary output containing the EAS build ID.

EAS Submit uploads the binary to App Store Connect. Treat submission to App
Review and public release as a protected human decision until the process is
proven reliable. Do not publish a first version to customers automatically.

### 10.5 Testing and release

1. Install a preview development build on real iPhone and iPad hardware.
2. Validate the first-run disclosure and provider calls.
3. Upload the release candidate to TestFlight.
4. Run internal testing.
5. If external testing is used, complete TestFlight beta review.
6. Check crashes, hangs, network failures, IPv4/IPv6 handling, offline cache,
   accessibility, light/dark mode, rotation, and tablet layout.
7. Select the exact validated build in App Store Connect.
8. Submit it for App Review.
9. Prefer manual or phased release for the first public version.

### 10.6 Updates and rollback

- Native dependency or permission changes require a new App Store build.
- Compatible JavaScript/asset fixes may use EAS Update after staging validation.
- Promote the exact staged update to production; do not regenerate it.
- Use EAS rollout controls and monitor errors.
- If an OTA update fails, roll it back or republish the previous update.
- A released native binary cannot be replaced in place; prepare a higher build
  number and roll forward.

## 11. Android → Google Play

### 11.1 App configuration

Retain:

- package name `com.itsryanthedev.whereip`;
- production Android App Bundle output;
- blocked unnecessary storage and overlay permissions;
- adaptive and monochrome icons;
- EAS-managed auto-incrementing version codes.

Before submission:

- inspect the generated manifest and permission list;
- verify the current Google Play target API rule;
- specifically recheck the announced 2026 requirement before any submission
  on or after 2026-08-31;
- test on the oldest supported Android version and a current Android version;
- confirm edge-to-edge, predictive-back, tablet, and foldable behavior.

### 11.2 Signing and API access

- Enroll in Play App Signing.
- Use an EAS-managed upload keystore.
- Back up key metadata and recovery ownership information securely.
- Create a Google service account for EAS Submit.
- Grant only the minimum release permissions to this one app.
- Do not commit the service-account JSON.

### 11.3 First release constraint

Create the Play Console app and complete the first Android App Bundle upload
manually. EAS automated submissions require the app/package association to
exist. Configure the internal testing track and Play App Signing during this
first upload.

### 11.4 Store record and policy declarations

Complete:

- app name, short description, full description, category, tags;
- app icon, feature graphic, phone/tablet screenshots;
- support email, website, and privacy-policy URL;
- Data safety form;
- content rating;
- target-audience and children declarations;
- ads declaration;
- app-access declaration;
- government, financial, health, and other policy declarations as applicable;
- countries/regions, pricing, and release settings.

Even if WhereIP does not operate a backend, the Data safety form and privacy
policy must account for data sent to external IP providers. Revalidate the
answers against the final dependency graph and runtime traffic.

### 11.5 EAS workflow and tracks

Use EAS Build for `.aab` generation and EAS Submit for upload:

- release candidate → `internal` or `closed` track;
- validated candidate → production submission;
- use staged percentage rollout for updates where Play allows it;
- do not replace the internal track with production automation until account
  testing and production-access requirements are satisfied.

Update `eas.json` so submission profiles explicitly represent staging and
production rather than using one production profile that always targets
`internal`.

### 11.6 Testing and release

1. Install an APK preview on multiple real devices.
2. Upload the AAB to internal testing.
3. Review pre-launch reports.
4. Complete required closed testing if the account is subject to it.
5. Validate install, update, offline cache, back navigation, copy, provider
   selection, IPv4/IPv6 networks, accessibility, and tablet layouts.
6. Promote the exact artifact through closed/open testing as appropriate.
7. Apply for production access if required.
8. Release with a staged rollout and monitor Android vitals.

### 11.7 Rollback

- Halt a staged Play rollout if metrics regress.
- Use EAS Update rollback for compatible JavaScript-only problems.
- For native problems, submit a higher version code; Play artifacts are
  immutable.

## 12. Shared Electron desktop application

### 12.1 Proposed repository structure

```text
electron/
  main/
  preload/
  shared/
  tests/
build/
  icons/
  entitlements/
  windows/
electron-forge.config.cjs
Package.appxmanifest
```

Use Electron Forge as the default packaging framework because it is the
Electron project's recommended integrated toolchain. Use the official Forge
makers for direct installers and the MSIX maker or Microsoft `winapp` CLI for
the Store package. Reassess this choice only if a proven packaging limitation
requires `electron-builder`.

### 12.2 Build integration

- Run the Expo web export before Electron packaging.
- Produce a desktop-root export independent of the GitHub Pages `/where-ip`
  base path.
- Register a privileged, standard, secure custom protocol such as
  `whereip://app/`.
- Restrict the protocol handler to the packaged `dist/` directory.
- Map static Expo routes to their generated HTML files.
- Package only production dependencies and required assets.
- Use ASAR packaging and Electron fuses appropriate to a production app.

### 12.3 Desktop API bridge

Expose narrowly scoped methods such as:

- `lookupPublicIp(providerId)`;
- `openExternalLink(linkId)`;
- `copyText(value)` only if the web clipboard implementation is insufficient;
- `getAppVersion()`;
- an update-status API only in direct-distribution builds.

The main process must:

- map provider IDs to hardcoded HTTPS endpoints;
- reject arbitrary URLs and unexpected request methods;
- apply timeouts and response-size limits;
- parse and return plain serializable data;
- never expose Node objects, raw IPC, filesystem paths, or shell commands.

### 12.4 Desktop QA

- Test cold start, second-instance behavior, and graceful quit.
- Test all routes and external links.
- Test provider failure/fallback/cooldown behavior.
- Test storage across restarts and clean uninstall.
- Test high-DPI displays, resizing, minimum window size, keyboard operation,
  screen readers, light/dark mode, and offline mode.
- Confirm the packaged app performs no unexpected network calls.
- Run Electron security checks and dependency scanning.

## 13. macOS Electron → GitHub Releases

### 13.1 Artifact strategy

Produce:

- a universal DMG when practical, supporting Apple Silicon and Intel;
- a ZIP artifact required by the selected updater, if auto-update is enabled;
- SHA-256 checksum files;
- SBOM/provenance artifacts.

If universal packaging becomes unreliable, publish clearly named `arm64` and
`x64` DMGs instead of silently omitting an architecture.

### 13.2 Signing and notarization

- Create a `Developer ID Application` certificate.
- Export its certificate and private key to an encrypted `.p12`.
- Use App Store Connect API-key authentication for notarization where supported.
- Store the certificate, password, key ID, issuer ID, private key, and Team ID
  as protected GitHub environment secrets.
- Import the temporary keychain only inside the macOS job.
- Enable hardened runtime and only the entitlements Electron requires.
- Sign all nested helpers correctly.
- Submit the app for notarization and staple the ticket to the final artifact.

### 13.3 Workflow validation

The macOS release job must run:

- Electron packaging tests;
- `codesign --verify`;
- Gatekeeper assessment;
- notarization completion check;
- staple validation;
- install/launch smoke test from the DMG;
- artifact checksum generation.

The job should upload artifacts first, then wait for approval before attaching
them to a public GitHub Release.

### 13.4 Updates

For the first version, manual downloads from GitHub Releases are acceptable.
If auto-update is added later:

- use only signed releases;
- publish update metadata atomically with the release;
- pin updates to the direct-mac channel;
- never enable the updater in the Mac App Store build;
- support rollback by publishing a higher hotfix version, not by mutating an
  existing release asset.

## 14. macOS Electron → Mac App Store

### 14.1 Separate MAS target

The MAS package is not the notarized direct-distribution application. Build it
with the Electron MAS runtime and Mac App Store signing.

Required setup:

- macOS App ID and App Store Connect record;
- Mac App Distribution certificate;
- Mac Installer Distribution certificate where the packaging path requires it;
- development and distribution provisioning profiles;
- app and inherited helper entitlement files;
- App Sandbox entitlement;
- outgoing network-client entitlement;
- required Electron JIT/helper entitlements;
- no unnecessary file, hardware, automation, or server-network entitlements.

### 14.2 Local and CI testing

- Create a `mas-dev` build using a development profile.
- Verify it launches under App Sandbox.
- Confirm provider networking works with the client-network entitlement.
- Confirm local storage remains within the application container.
- Confirm external links open safely.
- Confirm no direct auto-updater is present.
- Test on clean Intel and Apple Silicon environments where possible.

### 14.3 Submission

The protected GitHub Actions MAS job should:

1. build the exact stable tag;
2. import distribution credentials into a temporary keychain;
3. package with the MAS target;
4. validate signatures and entitlements;
5. produce the signed `.pkg`;
6. upload it to App Store Connect using Apple's supported upload tooling and an
   App Store Connect API key;
7. record the uploaded build identifier;
8. delete the temporary keychain and credential files.

Complete a distinct macOS listing and App Privacy questionnaire in App Store
Connect. Select the processed build and submit the macOS version separately for
App Review. Apple handles App Store signing/distribution; direct notarization is
for the GitHub DMG, not the MAS package.

### 14.4 Review risks

Test especially for:

- missing or excessive sandbox entitlements;
- launch crashes in the MAS Electron runtime;
- private/deprecated API findings;
- unexpected file access;
- missing privacy usage descriptions;
- broken external links or provider network access;
- an app experience that appears to be only an unmodified website wrapper.

The desktop application should provide a polished native window, menus,
keyboard shortcuts, About panel, application metadata, and reliable offline
states.

## 15. Windows Electron → GitHub Releases

### 15.1 Artifact strategy

Initially produce:

- signed x64 NSIS installer `.exe`;
- optional signed portable x64 `.exe`;
- checksums and provenance.

Add Windows ARM64 after the Electron application and all dependencies pass on
ARM64 hardware or an appropriate test environment. Do not label an emulated
x64 build as native ARM64.

### 15.2 Signing

Use a reputable code-signing certificate or a supported cloud signing service.
Keep private keys in a hardware/cloud service where possible. If a PFX must be
used in CI:

- store it only as a protected environment secret;
- use a strong separate password;
- import it for the job only;
- timestamp every signature;
- delete the temporary material after signing.

Sign the executable and installer, then verify signatures before publication.
Unsigned public installers should not be treated as a production-ready release
because Windows SmartScreen will create significant trust warnings.

### 15.3 Workflow validation

The Windows job should:

- build only on a Windows runner;
- install and launch the packaged application;
- test clean install, upgrade, repair/uninstall, and per-user paths;
- verify Authenticode signatures;
- confirm no unexpected firewall or elevated-admin prompt;
- test Windows 10 and Windows 11;
- upload immutable versioned artifacts to a draft GitHub Release.

### 15.4 Updates

If GitHub-based auto-update is enabled later:

- publish signed update metadata and packages;
- prevent Store builds from contacting the GitHub update feed;
- support staged rollout if the updater permits it;
- never overwrite an existing versioned release asset.

## 16. Windows Electron → Microsoft Store

### 16.1 Recommended package

Use an MSIX package for the Store rather than pointing the Store at the direct
NSIS installer. MSIX allows Microsoft-hosted delivery, Store signing,
Store-managed updates, package flighting, and better Windows integration.

Use Electron Forge's MSIX maker or Microsoft's `winapp` CLI to package the
production Electron layout. Keep the NSIS installer for GitHub direct
downloads.

### 16.2 Store identity and manifest

After reserving the app name:

- copy the exact Partner Center identity into `Package.appxmanifest`;
- use the Store-provided publisher value exactly;
- configure x64 and later ARM64 architecture packages;
- declare only required capabilities;
- add all required Store logo/tile assets;
- provide a supported Windows minimum version;
- make the package version monotonically increase;
- configure the full-trust Electron executable entry point.

The MSIX uploaded to Partner Center normally does not need the direct-download
certificate because the Store signs it. Development packages still need a
trusted development certificate for local installation.

### 16.3 Certification

Before upload:

- install the MSIX on a clean test machine;
- run the Windows App Certification Kit;
- fix all blocking failures;
- test install, launch, update, uninstall, and data cleanup;
- test without administrator privileges;
- confirm Store-managed updates and no GitHub updater;
- verify the privacy policy and support links.

### 16.4 Partner Center listing

Complete:

- product name and descriptions;
- category and age ratings;
- privacy policy, support, and website;
- at least the required screenshots and logos;
- system requirements;
- pricing, markets, discoverability, and release schedule;
- certification notes and test instructions.

### 16.5 Submission automation

Perform the first complete submission manually. Once identity, listing,
certification, and permissions are proven:

- associate Partner Center with Microsoft Entra ID;
- create a least-privilege application identity for submission automation;
- store tenant/client/submission identifiers as GitHub environment variables;
- store credentials as protected `microsoft-store` secrets;
- use the Microsoft Store submission API from a protected GitHub Actions job;
- require approval before committing a production submission;
- poll and report certification status without automatically retrying failed
  submissions.

If MSIX submission automation proves fragile, keep package creation automated
and make the Partner Center upload a documented manual release step. Do not
weaken signing or package validation merely to obtain full automation.

## 17. Proposed workflow files

These files are expected during implementation:

```text
.github/workflows/
  ci.yml                    # Extend the existing CI
  pages.yml                 # Build and deploy GitHub Pages
  desktop-ci.yml            # Package smoke tests on macOS and Windows
  desktop-release.yml       # Signed GitHub Release artifacts
  mac-app-store.yml         # MAS build and App Store Connect upload
  microsoft-store.yml       # MSIX build and optional submission

.eas/workflows/
  preview.yml               # Mobile preview build/update
  release-candidate.yml     # TestFlight and Play testing tracks
  production.yml            # Production build/update and upload
```

Avoid one enormous workflow. Keep validation reusable, keep credentials scoped
to one platform, and allow platform releases to be retried independently.

## 18. Secrets and credential inventory

Exact secret names may change during implementation, but ownership must be
documented.

### EAS-managed

- Expo access and project ownership.
- iOS distribution certificate and provisioning profile.
- App Store Connect API key for mobile upload.
- Android upload keystore.
- Google Play service-account credential.
- Preview and production environment variables.

### GitHub `desktop-release` / `apple-store`

- Developer ID certificate P12.
- Developer ID certificate password.
- Apple Team ID.
- App Store Connect key ID.
- App Store Connect issuer ID.
- App Store Connect private key.
- Mac App Distribution credentials.
- Mac Installer Distribution credentials if required.
- MAS provisioning profile.

### GitHub `desktop-release` / `microsoft-store`

- Windows code-signing service credentials or certificate material.
- Timestamp/signing configuration.
- Partner Center tenant/client/product/seller IDs.
- Partner Center client secret or federated identity configuration.

### Security rules

- Prefer OIDC/federated credentials over long-lived secrets when supported.
- Never print credentials or decoded certificates.
- Never make production secrets available to pull requests.
- Rotate credentials and record owners/expiration dates outside the repository.
- Revoke credentials immediately after suspected exposure.
- Pin third-party GitHub Actions to reviewed commit SHAs for release workflows.
- Generate an SBOM and retain build logs and provenance for every release.

## 19. Release quality gates

A stable release cannot be promoted until:

- CI passes on the release SHA.
- The version/tag consistency check passes.
- Privacy/provider review is complete.
- Store copy and screenshots match the actual binary.
- TestFlight and Play test-track candidates pass.
- The macOS direct build is signed, notarized, stapled, and smoke-tested.
- The MAS development build passes sandbox testing.
- The Windows installer is signed and smoke-tested.
- The MSIX passes Windows certification testing.
- The GitHub Pages deployment passes route and provider checks.
- Checksums and release notes exist.
- A human approves each public production environment.

## 20. Monitoring and rollback by channel

| Channel | Monitor | Recovery |
| --- | --- | --- |
| GitHub Pages | availability, console errors, provider failures | Redeploy last known-good artifact |
| EAS Update | rollout errors and update adoption | Cancel rollout or republish previous update |
| iOS App Store | TestFlight, App Analytics, crashes, reviews | Phased-release pause or higher build hotfix |
| Google Play | pre-launch report, Android vitals, staged rollout | Halt rollout or higher version-code hotfix |
| GitHub macOS | release downloads, updater errors, issues | Withdraw release, publish higher signed hotfix |
| Mac App Store | App Analytics, crashes, reviews | Higher build submission |
| GitHub Windows | installer/update failures, issues | Withdraw release, publish higher signed hotfix |
| Microsoft Store | Partner Center health and certification | Halt rollout/submission or publish higher package |

Never overwrite a released binary under the same version. Reproducibility and
signature integrity depend on versioned, immutable artifacts.

## 21. Recommended implementation sequence

### Phase 0 — ownership and decisions

- Confirm the legal publisher identity.
- Enroll in Apple, Google, Microsoft, Expo, and GitHub services.
- Confirm final identifiers and product names.
- Choose supported OS versions and architectures.
- Confirm that the Mac App Store app will use Electron.

**Exit condition:** account ownership and identifiers are documented.

### Phase 1 — shared release foundation

- Introduce one version source.
- Add tag/version validation.
- Connect EAS and GitHub.
- Configure protected environments.
- Finish privacy and provider review.
- Prepare store metadata inventory.

**Exit condition:** a release SHA can be identified unambiguously across tools.

### Phase 2 — web first

- Add environment-aware web base URL.
- Implement GitHub Pages workflow.
- Deploy and validate production web routes.
- Publish the stable privacy-policy URL.

**Exit condition:** the web app and privacy page are publicly reachable.

### Phase 3 — mobile stores

- Configure EAS Update and workflow channels.
- Complete one manual iOS and Android production build.
- Create store records and credentials.
- Submit to TestFlight and Play internal testing.
- Complete metadata, privacy, testing, and review.

**Exit condition:** iOS and Android candidates are accepted in store testing.

### Phase 4 — Electron core

- Add the secure Electron shell and custom protocol.
- Add the allowlisted provider IPC bridge.
- Add desktop-specific navigation, menus, About UI, and update-channel flags.
- Add desktop automated tests.

**Exit condition:** unpackaged desktop builds work securely on macOS and Windows.

### Phase 5 — direct desktop distribution

- Add macOS DMG/ZIP packaging, signing, and notarization.
- Add Windows NSIS packaging and signing.
- Add desktop release workflow and draft GitHub Releases.
- Test install/update/uninstall on clean machines.

**Exit condition:** signed direct installers can be downloaded and installed
without bypassing platform security.

### Phase 6 — Mac App Store

- Add MAS identities, profiles, and entitlements.
- Pass `mas-dev` sandbox tests.
- Build/upload the MAS package.
- Complete the macOS listing and App Review.

**Exit condition:** the macOS app is accepted by App Store Connect/TestFlight or
App Review.

### Phase 7 — Microsoft Store

- Reserve identity and create the manifest.
- Generate and validate MSIX packages.
- Complete the first manual Partner Center submission.
- Add protected submission automation after the manual path succeeds.

**Exit condition:** the package passes Partner Center certification.

### Phase 8 — unified release operation

- Coordinate stable tags across GitHub Actions and EAS.
- Add approval gates, run summaries, artifact hashes, and provenance.
- Run a complete release rehearsal.
- Document incident response and credential rotation.

**Exit condition:** one tagged commit can be traced to every published artifact.

## 22. Definition of done

The publishing project is complete when:

- iPhone/iPad users can install WhereIP from the Apple App Store;
- Android users can install it from Google Play;
- Mac users can install a sandboxed version from the Mac App Store;
- Mac users can alternatively install a signed/notarized DMG from GitHub;
- Windows users can install a signed EXE from GitHub;
- Windows users can install a Store-managed package from Microsoft Store;
- web users can use the app from GitHub Pages;
- every channel is built from a traceable Git commit and version tag;
- mobile builds and updates are managed by EAS Workflows;
- web and desktop builds are managed by GitHub Actions;
- release credentials are isolated and protected;
- every channel has documented validation, monitoring, and rollback procedures.

## 23. Official references

Requirements change frequently. Recheck these official sources before
implementation and before each release.

### Expo

- EAS production workflows:
  <https://docs.expo.dev/eas/workflows/examples/deploy-to-production/>
- EAS Workflows and GitHub:
  <https://docs.expo.dev/eas/workflows/get-started/>
- Production app builds:
  <https://docs.expo.dev/deploy/build-project/>
- EAS Update deployment:
  <https://docs.expo.dev/eas-update/deployment/>
- App version management:
  <https://docs.expo.dev/build-reference/app-versions/>
- Static Expo web publishing and GitHub Pages:
  <https://docs.expo.dev/guides/publishing-websites/>

### Apple

- App Store Connect workflow:
  <https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow>
- Upload builds:
  <https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds>
- Submit an app:
  <https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app>
- Developer ID certificates:
  <https://developer.apple.com/help/account/certificates/create-developer-id-certificates/>
- Mac App Sandbox:
  <https://developer.apple.com/documentation/security/app-sandbox>

### Google

- Create and set up a Play app:
  <https://support.google.com/googleplay/android-developer/answer/9859152>
- Play App Signing:
  <https://support.google.com/googleplay/android-developer/answer/9842756>
- Data safety:
  <https://support.google.com/googleplay/android-developer/answer/10787469>
- New personal-account testing:
  <https://support.google.com/googleplay/android-developer/answer/14151465>
- Target API requirements:
  <https://support.google.com/googleplay/android-developer/answer/11926878>
- Google Play Developer API:
  <https://developers.google.com/android-publisher/getting_started>

### Electron

- Electron security checklist:
  <https://www.electronjs.org/docs/latest/tutorial/security>
- Packaging:
  <https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging>
- Code signing:
  <https://www.electronjs.org/docs/latest/tutorial/code-signing>
- Mac App Store guide:
  <https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide/>
- Application updates:
  <https://www.electronjs.org/docs/latest/tutorial/updates>

### Microsoft

- Publish Windows apps:
  <https://learn.microsoft.com/windows/apps/publish/>
- Electron MSIX packaging:
  <https://learn.microsoft.com/windows/apps/dev-tools/winapp-cli/guides/electron-packaging>
- Win32 Store distribution choices:
  <https://learn.microsoft.com/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store>
- Upload MSIX packages:
  <https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/upload-app-packages>
- Store submission API:
  <https://learn.microsoft.com/windows/uwp/monetize/manage-app-submissions>

### GitHub

- GitHub Pages custom workflows:
  <https://docs.github.com/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Actions environments:
  <https://docs.github.com/actions/concepts/workflows-and-actions/deployment-environments>
- Workflow artifacts:
  <https://docs.github.com/actions/concepts/workflows-and-actions/workflow-artifacts>
