# WhereIP Cross-Platform Release Plan

**Status:** Operational planning document

**Last reviewed:** 2026-07-24

**Repository:** `itsryanthedev/where-ip`

**Current application version:** `1.0.1`

This runbook turns the broader
[publishing plan](../publishing-plan.md) into repeatable setup and release
checklists for:

- iPhone and iPad through the Apple App Store;
- macOS through the Mac App Store using Electron;
- Android phones and tablets through Google Play;
- Windows through the Microsoft Store using Electron;
- the web app through GitHub Pages;
- a later web migration to Cloudflare Pages with a dedicated domain; and
- the GitHub Actions and Expo Application Services (EAS) CI/CD that coordinate
  those releases.

It also covers creating the Apple and Google publishing projects from scratch.
This file is a plan, not evidence that any account, credential, workflow, store
record, Electron package, domain, or production deployment already exists.

## 1. How to use this runbook

The checklists have three cadences:

- **Run once:** account, identity, app-record, signing, and CI/CD setup.
- **Every release candidate:** build and validate an immutable candidate before
  public promotion.
- **Every production release:** promote the tested candidate, monitor it, and
  record evidence.

For every release:

1. Start with the shared release checklist in section 7.
2. Run the checklist for every channel included in that release.
3. Record channels intentionally omitted or delayed.
4. Complete monitoring and closeout in section 14.

The following documents remain authoritative:

- [Secret and private-file management](../secret-management.md)
- [Cross-platform publishing plan](../publishing-plan.md)
- [Release checklist](../release-checklist.md)
- [Privacy policy](../privacy-policy.md)
- [Google Play Data Safety notes](../data-safety.md)
- [Store listing](../store-listing.md)
- [Security policy](../../SECURITY.md)

If this runbook conflicts with those security rules, the stricter security rule
wins. Store requirements change frequently; verify the linked official
documentation before implementing a workflow and again before each submission.

## 2. Current decisions and boundaries

### 2.1 Delivery ownership

| Channel | Build owner | Delivery owner | Production approval |
| --- | --- | --- | --- |
| iOS/iPadOS App Store | EAS Build | EAS Submit and App Store Connect | Human |
| Google Play | EAS Build | EAS Submit and Play Console | Human |
| Mac App Store | GitHub Actions on macOS | App Store Connect | Human |
| Microsoft Store | GitHub Actions on Windows | Partner Center | Human |
| GitHub Pages | GitHub Actions | GitHub Pages | Protected environment |
| Cloudflare Pages | Deferred decision | Deferred decision | Human |

### 2.2 Public-client security boundary

WhereIP has no trusted application server. Assume that source, build logs,
artifacts, web bundles, native bundles, Electron packages, and release notes
will become public.

- [ ] Never put a confidential value in app code, Expo configuration,
      Electron code, a workflow argument, documentation, a fixture, or an
      application bundle.
- [ ] Treat every `EXPO_PUBLIC_*` value as public.
- [ ] Keep mobile signing and submission credentials in EAS-managed credential
      storage.
- [ ] Keep desktop signing and store-upload credentials in protected GitHub
      environments.
- [ ] Use vendor portals, operating-system credential stores, or a password
      manager for local credentials.
- [ ] Never generate a credential, provisioning profile, keystore,
      service-account file, certificate, or signed release artifact inside the
      repository.
- [ ] If a credential is exposed, stop publishing and rotate it before
      attempting repository cleanup.

### 2.3 Deferred Cloudflare phase

GitHub Pages is the planned current web host. Cloudflare Pages, a dedicated
domain, DNS changes, and Cloudflare credentials remain out of scope until the
maintainer explicitly starts that phase.

The Cloudflare checklist in section 13 is preparation for that future project.
Do not use it as authorization to buy a domain, create a Cloudflare resource,
change DNS, or replace GitHub Pages.

### 2.4 Immutable release identity

Use one marketing version across all channels and build every artifact from the
same reviewed Git commit.

- Marketing version: SemVer, for example `1.0.1`.
- Release-candidate tag: `v1.0.1-rc.1`.
- Stable tag: `v1.0.1`.
- Canonical version source: planned to be `package.json`.
- iOS build number, Android version code, and Microsoft package version:
  monotonically increasing and never reused.
- Release evidence: Git SHA, tag, EAS build IDs, store build identifiers,
  workflow run URLs, and artifact digests.

Never rebuild a released version from a moving branch or replace a public
binary under an existing version.

## 3. Recommended implementation order

Complete the release system in this order:

1. Confirm the legal publisher, account types, ownership, and identifiers.
2. Publish and validate the GitHub Pages site and stable privacy-policy URL.
3. Create Apple, Google, Expo, GitHub, and Microsoft publishing foundations.
4. Establish shared versioning, CI, release tags, and protected environments.
5. Release iOS/iPadOS and Android candidates to TestFlight and Play testing.
6. Build the secure Electron shell and desktop-specific tests.
7. Release the Mac App Store build.
8. Release the Microsoft Store build.
9. Rehearse one coordinated tagged release across all active channels.
10. Start the Cloudflare/domain migration only as a separately approved phase.

Do not wait for Electron or Cloudflare work before making the web privacy URL
and mobile store foundations reliable.

## 4. Apple publishing setup from scratch

Complete this section once before the first iOS/iPadOS or Mac App Store release.
The legal account holder should perform identity, agreement, tax, and banking
steps directly in Apple's interfaces. Do not copy private records into this
repository.

### 4.1 Decide ownership

- [ ] Decide whether the Apple Developer Program membership belongs to an
      individual or a legal organization.
- [ ] Confirm the exact public seller/developer name before enrolling.
- [ ] For an organization, confirm legal authority, registered organization
      details, website, and D-U-N-S information.
- [ ] Create or select the account holder's Apple Account and enable
      two-factor authentication.
- [ ] Record the account owner, recovery owner, renewal date, and business
      continuity contact in a private maintainer system.

**Exit condition:** the public seller identity and long-term account owner are
approved.

### 4.2 Enroll and activate the account

- [ ] Enroll through Apple's supported enrollment flow.
- [ ] Complete identity and organization verification directly with Apple.
- [ ] Pay the current membership fee through Apple's interface.
- [ ] Accept the current Apple Developer Program agreement.
- [ ] Open App Store Connect and accept any pending business agreements.
- [ ] Complete tax and banking information privately if Apple requires it.
- [ ] Add maintainers as named users with the minimum required roles; never
      share the account holder's login.

**Exit condition:** the team is active in both the Apple Developer portal and
App Store Connect, with current agreements accepted.

### 4.3 Create identifiers

- [ ] Confirm the iOS/iPadOS bundle identifier:
      `com.itsryanthedev.whereip`.
- [ ] Create or confirm an explicit App ID for that identifier.
- [ ] Create a separate macOS App ID, currently recommended as
      `com.itsryanthedev.whereip.macos`.
- [ ] Enable only capabilities used by the final applications.
- [ ] Keep iOS and macOS entitlements separate.
- [ ] Record public identifiers in the repository only after they are final.

**Exit condition:** both identifiers exist and no unnecessary capability is
enabled.

### 4.4 Create App Store Connect records

- [ ] Create the iOS/iPadOS app record before uploading the first mobile build.
- [ ] Create the macOS app record before uploading the first Electron MAS
      package.
- [ ] Use separate app records for the currently planned separate iOS and macOS
      bundle identifiers.
- [ ] If a single multi-platform record or universal purchase is preferred,
      stop and revisit the identifier strategy before creating either record;
      do not assume records can be merged later.
- [ ] Reserve the final name, primary language, SKU, bundle ID, and access
      scope.
- [ ] Set category, pricing, availability, copyright, support URL, marketing
      URL, and privacy-policy URL.
- [ ] Prepare separate platform screenshots and platform-specific descriptions.
- [ ] Complete age rating, App Privacy, export compliance, and review-contact
      information from the final binaries.

**Exit condition:** both platform records are ready to receive builds, and all
public URLs are stable.

### 4.5 Configure mobile credentials through EAS

- [ ] Let EAS manage the iOS distribution certificate and provisioning profile
      unless a documented exception is approved.
- [ ] Create the App Store Connect submission integration through the supported
      EAS/Apple interface.
- [ ] Give the upload integration only the role needed to upload or submit.
- [ ] Keep any private key in EAS credential storage, never in GitHub source or
      a local repository file.
- [ ] Perform one manual EAS production build and TestFlight upload before
      relying on automation.
- [ ] Verify that the bundle contains no credential or unrelated entitlement.

**Exit condition:** EAS can build and upload an iOS candidate without exposing
credentials.

### 4.6 Configure Mac App Store credentials through GitHub

- [ ] Create the required Mac App Distribution identity.
- [ ] Create a Mac Installer Distribution identity only if the chosen
      packaging path requires it.
- [ ] Create development and distribution provisioning profiles outside the
      repository.
- [ ] Create a least-privilege App Store Connect upload integration.
- [ ] Store signing and upload material only in the protected `apple-store`
      GitHub environment.
- [ ] Require a human reviewer for that environment.
- [ ] Design CI to import signing material into an ephemeral keychain and
      remove it even if the job fails.
- [ ] Perform the first complete MAS upload with close human supervision before
      enabling routine automation.

**Exit condition:** a protected workflow can build, validate, and upload an MAS
candidate from an immutable tag.

## 5. Google publishing setup from scratch

For WhereIP, "Google developer console" includes two distinct systems:

1. **Google Play Console:** developer identity, app record, testing, policy,
   signing, and releases.
2. **Google Cloud console:** API/service identity used only if EAS Submit or
   another approved automation path needs Google Play Developer API access.

Keep these responsibilities separate.

### 5.1 Decide Play account ownership

- [ ] Decide whether the Play developer account is personal or organizational.
- [ ] Confirm the exact public developer name and legal publisher.
- [ ] For an organization, prepare its website, legal registration information,
      authorized representative, and D-U-N-S information.
- [ ] Use a durable publisher-controlled Google Account with two-step
      verification.
- [ ] Record the account owner, recovery owner, and continuity contact in a
      private maintainer system.
- [ ] Invite maintainers as named Play Console users with least privilege;
      never share the owner login.

**Exit condition:** the account type and public identity are approved before
registration.

### 5.2 Register and verify the Play developer account

- [ ] Register through Play Console and accept the current developer agreement.
- [ ] Pay the current registration fee through Google's interface.
- [ ] Link or create the correct Google payments profile.
- [ ] Complete personal or organization identity verification directly in Play
      Console.
- [ ] Verify the developer contact email, phone, and website when required.
- [ ] Complete any current Android developer verification or package
      registration requirement applicable to the publisher and target markets.
- [ ] Review Play Console access quarterly and remove unused users.

**Exit condition:** the verified account is permitted to create and publish
apps.

### 5.3 Create the Play app

- [ ] Create the app with the final default language, app name, free/paid
      choice, and policy declarations.
- [ ] Use package name `com.itsryanthedev.whereip`; treat it as permanent after
      first upload.
- [ ] Complete the app dashboard tasks that apply to a public network utility.
- [ ] Configure support email, website, and a public non-geofenced HTTPS privacy
      URL.
- [ ] Add store icon, feature graphic, phone screenshots, and tablet
      screenshots.
- [ ] Complete Data safety, content rating, target audience, ads, app access,
      and other policy declarations from the final binary.
- [ ] Declare third-party IP-provider data flows accurately even though WhereIP
      has no backend.

**Exit condition:** the app record is complete enough to accept an internal
test release.

### 5.4 Configure Play App Signing

- [ ] Enroll the app in Play App Signing.
- [ ] Let Google manage the app-signing key.
- [ ] Use a distinct upload key managed through EAS credentials.
- [ ] Record upload-key ownership and recovery procedures privately.
- [ ] Never download or place the keystore in the repository.
- [ ] Perform the first Android App Bundle upload manually so Play establishes
      the package association and signing configuration.

**Exit condition:** Play accepts an AAB signed with the EAS-managed upload key.

### 5.5 Create the Google Cloud automation project

- [ ] Create or select a Google Cloud project owned by the publisher, not by an
      individual contributor.
- [ ] Enable only the API needed for Play submission automation.
- [ ] Create a dedicated automation identity rather than reusing a human
      account.
- [ ] Link or invite that identity in Play Console.
- [ ] Grant access to the WhereIP app only, with the minimum release-management
      permissions needed by EAS Submit.
- [ ] Store the service-account credential only in EAS credential storage.
- [ ] Record ownership, rotation, recovery, and audit responsibilities outside
      the repository.
- [ ] Test access by performing an authenticated upload; do not print or decode
      the credential to "verify" it.

**Exit condition:** EAS Submit can upload to a non-production Play track with
least-privilege access.

### 5.6 Establish testing and production access

- [ ] Create the internal testing track and tester list.
- [ ] Determine whether the actual account is subject to a closed-testing or
      production-access requirement.
- [ ] If required, complete the current tester count and duration shown in Play
      Console before applying for production access.
- [ ] Complete the production-access application truthfully.
- [ ] Configure staged production rollouts and named release owners.
- [ ] Recheck the current target API level before each release. In particular,
      verify the rule taking effect on 2026-08-31 before submitting on or after
      that date.

**Exit condition:** the account may promote a tested artifact to production.

## 6. GitHub Actions and Expo CI/CD setup

Complete this section once, then review it whenever a release channel,
dependency, signing method, or provider changes.

### 6.1 Shared release contract

- [ ] Make `package.json` the canonical marketing version.
- [ ] Feed that version into Expo and Electron configuration.
- [ ] Add CI checks that the Git tag, package version, Expo version, and desktop
      version agree.
- [ ] Use EAS remote version management for iOS build numbers and Android
      version codes.
- [ ] Derive a monotonically increasing four-part Microsoft package version.
- [ ] Define candidate tags as `vX.Y.Z-rc.N` and production tags as `vX.Y.Z`.
- [ ] Require production tags to point to a commit already validated as a
      release candidate.
- [ ] Record one release manifest tying every artifact to the same Git SHA.

### 6.2 GitHub repository protections

- [ ] Keep default workflow permissions read-only.
- [ ] Protect `main` and stable release tags.
- [ ] Require the ordinary CI workflow before merge.
- [ ] Enable secret scanning and push protection.
- [ ] Enable dependency review and an update process for workflow actions.
- [ ] Create protected environments:
      `github-pages`, `desktop-release`, `apple-store`, `google-play`, and
      `microsoft-store`.
- [ ] Require a human reviewer for store publishing and public desktop release
      environments.
- [ ] Never make production environments or secrets available to forked pull
      requests.
- [ ] Pin every new third-party action to a reviewed full commit SHA.

### 6.3 GitHub workflow topology

Keep validation and privileged publishing in separate jobs and preferably
separate workflow files:

```text
.github/workflows/
  ci.yml
  pages.yml
  desktop-ci.yml
  desktop-release.yml
  mac-app-store.yml
  microsoft-store.yml
```

- [ ] `ci.yml` installs with `pnpm install --frozen-lockfile`, scans for
      secrets, and runs `pnpm verify`.
- [ ] `pages.yml` builds the static export and deploys only the validated
      artifact.
- [ ] `desktop-ci.yml` packages unsigned test builds without production
      credentials.
- [ ] `desktop-release.yml` signs direct-download artifacts only in a protected
      environment.
- [ ] `mac-app-store.yml` scopes Apple credentials to the MAS upload job.
- [ ] `microsoft-store.yml` scopes Microsoft credentials to the Store
      submission job.
- [ ] Privileged jobs validate the source SHA and artifact digest before use.
- [ ] Temporary signing files and keychains are removed on success and failure.
- [ ] Unpublished candidates have short artifact retention.

### 6.4 EAS setup

- [ ] Create or select the publisher-owned Expo account or organization.
- [ ] Run `eas init` interactively and commit only the public EAS project
      linkage.
- [ ] Connect the repository through the Expo GitHub App.
- [ ] Maintain distinct `development`, `preview`, and `production` build
      profiles.
- [ ] Add explicit submission profiles for test and production tracks.
- [ ] Configure EAS Update with distinct preview and production channels.
- [ ] Use `runtimeVersion.policy: appVersion` unless an approved compatibility
      design replaces it.
- [ ] Configure preview and production EAS environments without embedding
      secrets in bundles.
- [ ] Perform one manual iOS build/upload and Android build/upload before CI
      attempts each automated path.

### 6.5 EAS workflow topology

```text
.eas/workflows/
  preview.yml
  release-candidate.yml
  production.yml
```

- [ ] `preview.yml` creates only trusted internal previews.
- [ ] `release-candidate.yml` builds the candidate and submits it to TestFlight
      and a Play test track.
- [ ] `production.yml` works only from a reviewed stable tag or protected manual
      invocation.
- [ ] The workflow decides whether a mobile change needs a native build or is
      eligible for an EAS Update.
- [ ] A production native upload or OTA promotion pauses for human approval.
- [ ] EAS and GitHub jobs record the same Git SHA.

### 6.6 CI/CD acceptance rehearsal

- [ ] Open a harmless test pull request from a branch and confirm that no
      production secret or environment is exposed.
- [ ] Validate CI on a fork-like untrusted context.
- [ ] Create a release-candidate tag and confirm all unprivileged builds use the
      exact tag SHA.
- [ ] Reject one approval intentionally and verify that nothing publishes.
- [ ] Retry a single failed channel without rebuilding unrelated artifacts.
- [ ] Verify temporary credentials and unpublished artifacts are removed.
- [ ] Rehearse rollback for web, EAS Update, mobile staged rollout, and desktop
      store submissions.

**Exit condition:** a tagged commit can move through each channel independently,
with traceable approvals and without copying a credential into a client bundle.

## 7. Shared checklist for every release

Run this before any channel-specific release checklist.

### 7.1 Define scope

- [ ] Choose the marketing version and candidate number.
- [ ] List included channels and explicitly list deferred channels.
- [ ] Select the exact Git SHA.
- [ ] Confirm the release owner and approver for each included channel.
- [ ] Decide whether the mobile change requires a native build, an OTA update,
      or both.
- [ ] Confirm whether any provider, dependency, permission, entitlement,
      privacy behavior, or public URL changed.

### 7.2 Privacy and provider review

- [ ] Re-run every item in [the release checklist](../release-checklist.md).
- [ ] Review every provider's current documentation, privacy policy, terms,
      endpoint, response schema, CORS behavior, and commercial-use rules.
- [ ] Resolve the outstanding IPinfo and ipwho.is terms questions before store
      submission.
- [ ] Verify that no request occurs before first-run consent.
- [ ] Confirm no analytics, advertising, tracking, fingerprinting, or new
      permission was introduced.
- [ ] Reconcile the in-app disclosure, privacy policy, Apple App Privacy,
      Google Data safety, and Microsoft Store declarations.
- [ ] Confirm every screenshot masks or replaces real personal IP and location
      information.

### 7.3 Version and source integrity

- [ ] Update the canonical marketing version.
- [ ] Confirm iOS build number, Android version code, and Microsoft package
      version will increase.
- [ ] Generate release notes from reviewed changes.
- [ ] Confirm the candidate tag points to the intended commit.
- [ ] Confirm the lockfile and package registry are expected.
- [ ] Confirm no generated native folder, build output, signed artifact, or
      credential file is tracked.

### 7.4 Required verification

From a clean dependency state, run:

```bash
pnpm install --frozen-lockfile
node scripts/check-secrets.mjs
node scripts/check-secrets.mjs --history
pnpm verify
pnpm dlx expo-doctor
git diff --check
```

Then:

- [ ] Inspect `git status --short`.
- [ ] Inspect `git diff`.
- [ ] If anything is staged, inspect `git diff --cached`.
- [ ] Review dependency licenses, install scripts, provenance, maintenance, and
      transitive changes.
- [ ] Run platform-specific tests below.
- [ ] Stop the release on any unexplained failure; do not weaken a control to
      obtain a green result.

### 7.5 Candidate approval

- [ ] Create the release-candidate tag from the reviewed SHA.
- [ ] Build every included channel from that immutable tag.
- [ ] Record workflow run URLs, EAS build IDs, store build IDs, and artifact
      digests.
- [ ] Complete smoke tests on real iPhone, iPad, Android phone, and Android
      tablet hardware for included mobile channels.
- [ ] Complete clean-machine tests for included desktop channels.
- [ ] Validate direct navigation, refresh, privacy page, and provider calls on
      the production-like web candidate.
- [ ] Obtain release-owner signoff before creating the stable tag.

## 8. iPhone and iPad App Store release

### 8.1 First release only

- [ ] Complete Apple setup in section 4.
- [ ] Confirm `com.itsryanthedev.whereip`.
- [ ] Confirm `supportsTablet` remains enabled.
- [ ] Audit the generated `Info.plist` and permission descriptions.
- [ ] Confirm the current minimum iOS/iPadOS versions.
- [ ] Complete one manual EAS production build and upload.
- [ ] Complete the App Store listing, screenshots, App Privacy, age rating,
      export compliance, review contact, and review notes.

### 8.2 Every candidate

- [ ] Build the iOS production profile through EAS from the candidate SHA.
- [ ] Confirm the build number increased.
- [ ] Inspect the final entitlements and permissions.
- [ ] Upload the candidate to TestFlight.
- [ ] Install on physical iPhone and iPad devices.
- [ ] Test first launch, consent, exactly one initial lookup, provider
      selection, fallback, refresh cooldown, copy/share, cache, offline mode,
      rotation, light/dark mode, and accessibility.
- [ ] Test IPv4, IPv6, and provider failure behavior.
- [ ] Check TestFlight crashes and feedback.
- [ ] Confirm screenshots and declarations match this exact binary.

### 8.3 Every production submission

- [ ] Select the exact TestFlight-validated build in App Store Connect.
- [ ] Update version metadata and "What's New" text.
- [ ] Reconfirm availability, price, territories, public URLs, export
      compliance, and App Privacy.
- [ ] Add review notes explaining consent, approximate IP location, lack of
      account/GPS, and how to test all providers.
- [ ] Submit for App Review behind a human approval.
- [ ] Prefer manual or phased release for early versions.
- [ ] Record submission time, build ID, review state, and public availability.

### 8.4 Monitor and recover

- [ ] Monitor App Store Connect status, crashes, hangs, reviews, and provider
      failures.
- [ ] Pause a phased release if quality regresses.
- [ ] For a compatible JavaScript-only regression, use a tested EAS Update
      rollback or republish the last known-good update.
- [ ] For a native regression, ship a higher build number; never replace the
      released binary.

## 9. Mac App Store release for the Electron app

This channel cannot start until the secure Electron foundation described in the
publishing plan exists.

### 9.1 First release only

- [ ] Complete Apple setup in section 4.
- [ ] Implement Electron with `contextIsolation: true`, `sandbox: true`, and
      `nodeIntegration: false`.
- [ ] Serve packaged local content through a restricted custom protocol.
- [ ] Expose only a narrow, typed preload API.
- [ ] Validate IPC sender and arguments and allowlist provider endpoints.
- [ ] Deny unexpected navigation, popups, permissions, and external protocols.
- [ ] Add a restrictive Content Security Policy.
- [ ] Create separate app and inherited-helper MAS entitlement files.
- [ ] Enable App Sandbox and only necessary client-network/Electron
      entitlements.
- [ ] Disable every direct-download auto-updater in the Store build.
- [ ] Create and test a `mas-dev` build before using distribution identities.
- [ ] Complete the macOS listing, screenshots, App Privacy, category, pricing,
      review notes, and support/privacy URLs.

### 9.2 Every candidate

- [ ] Export the web application with a desktop root base path, not the GitHub
      Pages `/where-ip` base path.
- [ ] Package with the Electron MAS runtime from the exact candidate SHA.
- [ ] Confirm the package contains only required production files.
- [ ] Validate code signatures, provisioning profiles, nested helpers, and
      entitlements.
- [ ] Confirm App Sandbox launch and provider networking.
- [ ] Test on clean Apple Silicon and Intel environments where practical.
- [ ] Test cold start, second instance, quit, menus, shortcuts, About panel,
      routes, external links, storage, offline mode, resizing, high DPI,
      keyboard operation, screen readers, and light/dark mode.
- [ ] Confirm no direct updater, arbitrary URL fetch, filesystem API, shell API,
      or unexpected network call is available to the renderer.
- [ ] Upload the candidate to App Store Connect through the protected
      `apple-store` environment.
- [ ] Record the uploaded build identifier and workflow digest.

### 9.3 Every production submission

- [ ] Select the exact validated processed build.
- [ ] Update macOS-specific version metadata and release notes.
- [ ] Reconfirm the macOS listing, screenshots, privacy answers, availability,
      and review instructions.
- [ ] Submit to App Review behind a human approval.
- [ ] Record review state and public availability separately from the iOS app.

### 9.4 Monitor and recover

- [ ] Monitor App Store Connect status, crashes, reviews, sandbox failures, and
      provider connectivity.
- [ ] Stop promotion if signing, entitlement, or MAS-runtime validation changes.
- [ ] Fix a regression with a higher build/package version; never replace an
      accepted package in place.

## 10. Google Play release for Android phones and tablets

### 10.1 First release only

- [ ] Complete Google setup in section 5.
- [ ] Confirm package name `com.itsryanthedev.whereip`.
- [ ] Inspect the generated Android manifest and permission list.
- [ ] Confirm the current minimum Android version and target API rule.
- [ ] Upload the first AAB manually and enroll in Play App Signing.
- [ ] Complete phone/tablet listings, Data safety, content rating, target
      audience, ads, app access, and applicable policy declarations.
- [ ] Complete any required closed test and production-access application.

### 10.2 Every candidate

- [ ] Build an AAB through EAS from the exact candidate SHA.
- [ ] Confirm the version code increased.
- [ ] Verify the target API level against the current Play requirement.
- [ ] Inspect the final manifest and permission list.
- [ ] Upload to the internal or closed test track.
- [ ] Review the Play pre-launch report and Android vitals.
- [ ] Install on physical phones and tablets covering the oldest supported and
      current Android versions.
- [ ] Test consent, provider behavior, cooldown, cache, offline mode, copy,
      share, back navigation, predictive back, edge-to-edge layout,
      accessibility, rotation, light/dark mode, IPv4, and IPv6.
- [ ] Test a foldable layout where available.
- [ ] Confirm store assets and Data safety match this exact binary.

### 10.3 Every production submission

- [ ] Promote the exact tested AAB; do not rebuild it.
- [ ] Update release notes and store metadata.
- [ ] Reconfirm countries/regions, pricing, target audience, Data safety,
      public URLs, and policy declarations.
- [ ] Submit behind a human approval.
- [ ] Use a staged rollout for updates where available.
- [ ] Record release name, version code, track, rollout percentage, and public
      availability.

### 10.4 Monitor and recover

- [ ] Monitor review state, pre-launch results, Android vitals, reviews,
      provider failures, and rollout metrics.
- [ ] Halt a staged rollout if quality regresses.
- [ ] For a compatible JavaScript-only issue, use a tested EAS Update rollback
      or republish the last known-good update.
- [ ] For a native issue, upload a higher version code; Play artifacts are
      immutable.

## 11. Microsoft Store release for the Windows Electron app

This channel cannot start until the secure Electron foundation and Windows
packaging path exist.

### 11.1 First release only

- [ ] Create and verify the correct individual or company Partner Center
      developer account.
- [ ] Reserve the `WhereIP` product name.
- [ ] Record the Store identity values without recording any secret.
- [ ] Build a Store-ready MSIX/MSIXUpload package for the production Electron
      layout.
- [ ] Copy Partner Center identity and publisher values exactly into the
      manifest.
- [ ] Declare only required capabilities and a full-trust Electron entry point.
- [ ] Add all required icons, tiles, screenshots, descriptions, privacy/support
      URLs, system requirements, pricing, markets, and certification notes.
- [ ] Disable the direct GitHub updater in Store builds.
- [ ] Run the Windows App Certification Kit and resolve blocking failures.
- [ ] Perform the first full Partner Center submission manually.
- [ ] Add submission automation only after the manual path is proven.

### 11.2 Every candidate

- [ ] Export the web application for the desktop root base path.
- [ ] Package the Windows Store target from the exact candidate SHA.
- [ ] Confirm the four-part package version increased.
- [ ] Confirm identity, publisher, architecture, capabilities, and assets match
      Partner Center.
- [ ] Install on a clean Windows machine without administrator privileges.
- [ ] Test Windows 10 and Windows 11 where supported.
- [ ] Test install, launch, update, uninstall, data behavior, DPI scaling,
      keyboard operation, screen readers, light/dark mode, external links,
      offline mode, and provider failures.
- [ ] Confirm the renderer cannot access Node, the filesystem, the shell,
      unrestricted IPC, or arbitrary URLs.
- [ ] Run the Windows App Certification Kit.
- [ ] Upload to a draft/manual submission or protected test path.
- [ ] Record the package identity, version, architecture, and digest.

### 11.3 Every production submission

- [ ] Promote the exact validated package.
- [ ] Update "What's new", descriptions, screenshots, availability, pricing,
      privacy/support links, and certification notes.
- [ ] Reconfirm Store-managed updates and absence of the GitHub updater.
- [ ] Submit for certification behind a human approval.
- [ ] Use a publishing hold or manual publication when a coordinated launch
      requires it.
- [ ] Record certification state and public availability.

### 11.4 Monitor and recover

- [ ] Monitor certification, health reports, reviews, install/update errors,
      crashes, and provider failures.
- [ ] Stop a submission or rollout if Partner Center permits and quality
      regresses.
- [ ] Publish a higher package version to recover; never mutate an accepted
      package under the same version.

## 12. GitHub Pages web release

### 12.1 First release only

- [ ] Add environment-aware Expo configuration so GitHub Pages uses base path
      `/where-ip`, while local, Electron, and future root-domain builds use `/`.
- [ ] Add `.github/workflows/pages.yml`.
- [ ] Separate its unprivileged build job from its deploy job.
- [ ] Keep top-level permissions at `contents: read`.
- [ ] Grant `pages: write` and `id-token: write` only to the deploy job.
- [ ] Use the protected `github-pages` environment.
- [ ] Pin non-official or third-party actions to reviewed full commit SHAs.
- [ ] Add `.nojekyll` to the published output.
- [ ] Enable GitHub Actions as the Pages publishing source.
- [ ] Confirm the expected URL:
      `https://itsryanthedev.github.io/where-ip/`.

### 12.2 Every candidate

- [ ] Install with the frozen lockfile and run `pnpm verify`.
- [ ] Export from the exact candidate SHA with the `/where-ip` base path.
- [ ] Validate that the artifact contains no secret, source-map leak requiring
      review, credential file, native artifact, or unexpected file.
- [ ] Test `/where-ip/`, `/where-ip/about`, and `/where-ip/privacy`.
- [ ] Test direct navigation and browser refresh on every route.
- [ ] Confirm JS, CSS, images, icons, manifest, and Open Graph assets load with
      the correct prefix.
- [ ] Test provider CORS, consent, fallback, cooldown, cache, copy, responsive
      layouts, keyboard navigation, visible focus, and offline states.
- [ ] Record an accessibility/Lighthouse baseline.
- [ ] Upload the validated `dist/` artifact without deploying it to production.

### 12.3 Every production deployment

- [ ] Deploy the exact validated Pages artifact from the stable tag.
- [ ] Verify the workflow-reported deployment URL and Git SHA.
- [ ] Run the route, asset, provider, privacy, accessibility, and responsive
      smoke tests against production.
- [ ] Confirm the public privacy-policy URL used by stores remains stable.
- [ ] Record the deployment URL, workflow run, Git SHA, and artifact digest.

### 12.4 Monitor and recover

- [ ] Monitor availability, browser errors, asset 404s, provider failures, and
      consent behavior.
- [ ] Roll back by redeploying the retained artifact from the last known-good
      commit.
- [ ] Do not recreate an old release by reinstalling unlocked dependencies.

## 13. Future Cloudflare Pages and dedicated-domain release

**Blocked by policy until explicitly authorized.** This section is a future
migration checklist, not an instruction to act now.

### 13.1 Separate project approval

- [ ] Obtain explicit maintainer approval to start the Cloudflare/domain phase.
- [ ] Choose the legal registrant, domain owner, renewal owner, and recovery
      owner.
- [ ] Choose the production domain and whether the apex or a subdomain serves
      the app.
- [ ] Decide whether deployment uses Cloudflare's Git integration or a
      protected GitHub Actions integration.
- [ ] Complete a threat model, privacy review, cost review, DNS rollback plan,
      and migration schedule.
- [ ] Decide how long GitHub Pages remains available and whether it redirects.

### 13.2 One-time setup after approval

- [ ] Purchase the domain through an approved registrar using private
      maintainer records outside the repository.
- [ ] Enable registrar account protections, renewal, recovery, and registry
      lock features where available.
- [ ] Create the publisher-owned Cloudflare account and Pages project.
- [ ] Grant maintainers named least-privilege access.
- [ ] Connect only the required repository and production branch.
- [ ] Configure the static Expo build command and `dist/` output directory.
- [ ] Configure preview deployments without exposing production credentials.
- [ ] Add the custom domain through the Pages interface.
- [ ] For an apex domain, place the zone in the correct Cloudflare account.
- [ ] For a subdomain, configure the documented CNAME path.
- [ ] Wait for managed HTTPS to become active before redirecting users.
- [ ] Configure security headers, caching, redirects, canonical URL, sitemap,
      robots policy, and error handling.
- [ ] Update the app base URL to `/` for the dedicated domain.
- [ ] Update Open Graph metadata, manifest URLs, privacy/support URLs, desktop
      allowlists, store listings, and repository metadata.
- [ ] Validate every provider's CORS and rate-limit behavior from the new
      origin.
- [ ] Preserve the old GitHub Pages URL with a tested redirect or clear
      migration notice where practical.

### 13.3 Every candidate after migration

- [ ] Build from the exact candidate SHA with the root-domain base path.
- [ ] Deploy to a Cloudflare preview URL.
- [ ] Verify all routes, assets, manifest, canonical metadata, CSP/security
      headers, consent, providers, responsive layouts, accessibility, and
      offline behavior.
- [ ] Confirm preview deployments are not indexed and do not receive production
      credentials.
- [ ] Record the preview deployment ID and artifact digest.

### 13.4 Every production deployment after migration

- [ ] Promote or deploy the exact validated artifact.
- [ ] Verify the dedicated domain, HTTPS, redirects, DNS, canonical metadata,
      privacy URL, provider requests, and store-facing URLs.
- [ ] Check the old GitHub Pages URL and migration behavior.
- [ ] Record the deployment ID, Git SHA, artifact digest, and DNS state.

### 13.5 Monitor and recover

- [ ] Monitor DNS, certificate status, availability, browser errors, provider
      failures, redirect loops, and cache behavior.
- [ ] Roll back to the last known-good Pages deployment.
- [ ] Keep a documented DNS rollback path and avoid changing registrar and host
      simultaneously unless the migration plan requires it.
- [ ] Do not delete the GitHub Pages fallback until the maintainer approves the
      end of the migration window.

## 14. Release closeout for every channel

### 14.1 Record evidence

Create a release record outside credential storage containing only public or
redacted metadata:

- [ ] Marketing version and release tag.
- [ ] Exact Git SHA.
- [ ] Included and deferred channels.
- [ ] GitHub workflow run URLs.
- [ ] EAS build and update IDs.
- [ ] iOS build number and App Store Connect status.
- [ ] Android version code, Play track, and rollout percentage.
- [ ] macOS bundle/package version and App Store Connect status.
- [ ] Windows package version and Partner Center status.
- [ ] Web deployment URL and deployment identifier.
- [ ] Artifact SHA-256 digests and provenance/SBOM references.
- [ ] Test evidence, approvals, known issues, and rollback owner.

Never include a credential, private maintainer record, unredacted signing
command, or complete provider response.

### 14.2 Monitor the release

- [ ] Confirm public availability separately for every channel; store review
      times are asynchronous.
- [ ] Watch crashes, install/update failures, provider failures, policy
      messages, reviews, and user issues.
- [ ] Verify the privacy and support URLs after each channel becomes public.
- [ ] Pause staged/phased rollouts when metrics or reports regress.
- [ ] Publish a higher-version hotfix instead of replacing an immutable binary.
- [ ] Close the release only after every included channel is live, intentionally
      held, or documented as failed with an owner and next action.

### 14.3 Post-release maintenance

- [ ] Update release notes with actual channel availability.
- [ ] Retain required provenance and compliance evidence.
- [ ] Remove temporary unpublished artifacts according to retention policy.
- [ ] Confirm ephemeral signing material was removed.
- [ ] Review credential audit logs without printing credentials.
- [ ] Capture lessons as checklist or workflow improvements.
- [ ] Schedule the next provider-policy and account-access review.

## 15. Stop conditions

Stop the release immediately if:

- a credential-like value appears in source, output, logs, artifacts, or chat;
- a production job uses pull-request-controlled code;
- a workflow needs broader permission merely to make the build pass;
- a build cannot be tied to the intended immutable Git SHA;
- a generated binary contains an unexpected permission, entitlement, provider,
  or confidential value;
- privacy/store declarations do not match runtime traffic;
- a signed artifact fails signature, sandbox, certification, or smoke tests;
- an account agreement or identity verification is incomplete;
- the stable privacy-policy URL is unavailable; or
- rollback ownership is unclear.

For suspected exposure, rotate the affected credential first, then follow the
procedure in [secret management](../secret-management.md).

## 16. Official references

Recheck these sources before implementation and before each release.

### Apple

- Apple Developer Program enrollment:
  <https://developer.apple.com/help/account/membership/enrolling-in-the-app/>
- App Store Connect workflow:
  <https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow>
- Create an app record:
  <https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app>
- Upload builds:
  <https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds>
- Submit an app:
  <https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app>
- Mac App Sandbox:
  <https://developer.apple.com/documentation/security/app-sandbox>

### Google

- Developer identity verification:
  <https://support.google.com/googleplay/android-developer/answer/10841920>
- Create and set up a Play app:
  <https://support.google.com/googleplay/android-developer/answer/9859152>
- Play App Signing:
  <https://support.google.com/googleplay/android-developer/answer/9842756>
- Data safety:
  <https://support.google.com/googleplay/android-developer/answer/10787469>
- Personal-account testing requirements:
  <https://support.google.com/googleplay/android-developer/answer/14151465>
- Target API requirements:
  <https://support.google.com/googleplay/android-developer/answer/11926878>
- Google Play Developer API:
  <https://developers.google.com/android-publisher/getting_started>

### Expo

- Deploy to production with EAS Workflows:
  <https://docs.expo.dev/eas/workflows/examples/deploy-to-production/>
- EAS Workflows and GitHub:
  <https://docs.expo.dev/eas/workflows/get-started/>
- Production builds:
  <https://docs.expo.dev/deploy/build-project/>
- EAS Submit:
  <https://docs.expo.dev/submit/introduction/>
- EAS Update deployment:
  <https://docs.expo.dev/eas-update/deployment/>
- App version management:
  <https://docs.expo.dev/build-reference/app-versions/>

### Electron

- Electron security checklist:
  <https://www.electronjs.org/docs/latest/tutorial/security>
- Packaging:
  <https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging>
- Code signing:
  <https://www.electronjs.org/docs/latest/tutorial/code-signing>
- Mac App Store guide:
  <https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide/>

### Microsoft

- Open a Partner Center developer account:
  <https://learn.microsoft.com/windows/apps/publish/partner-center/open-a-developer-account>
- Publish Windows apps:
  <https://learn.microsoft.com/windows/apps/publish/>
- Electron MSIX packaging:
  <https://learn.microsoft.com/windows/apps/dev-tools/winapp-cli/guides/electron-packaging>
- Upload MSIX packages:
  <https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/upload-app-packages>
- Store listing information:
  <https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/add-and-edit-store-listing-info>
- Submission options:
  <https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/manage-submission-options>

### GitHub

- GitHub Pages custom workflows:
  <https://docs.github.com/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- Deployment environments:
  <https://docs.github.com/actions/concepts/workflows-and-actions/deployment-environments>
- Workflow artifacts:
  <https://docs.github.com/actions/concepts/workflows-and-actions/workflow-artifacts>

### Cloudflare

- Pages Git integration:
  <https://developers.cloudflare.com/pages/configuration/git-integration/>
- GitHub integration:
  <https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/>
- Pages custom domains:
  <https://developers.cloudflare.com/pages/configuration/custom-domains/>
