# AGENTS.md

These instructions apply to the entire WhereIP repository. WhereIP is a public
open-source project, while its store accounts, signing identities, publishing
credentials, and maintainer records are private. Every agent working in this
repository must preserve that boundary.

## Security model

WhereIP is currently an Expo/React Native application with a static web export.
The publishing plan later adds EAS mobile releases and Electron desktop
packages. There is no trusted application server.

Assume that all source code, Git history, pull-request output, CI logs, build
artifacts, web bundles, mobile bundles, and Electron packages can become public.
Anything delivered to the client can be inspected by an end user.

The controlling principle is:

> If a value must remain confidential, it must never enter source code or an
> application bundle.

Read and follow these project documents before changing release, credential,
workflow, provider, privacy, or packaging behavior:

- `docs/secret-management.md`
- `docs/publishing-plan.md`
- `docs/release-checklist.md`
- `SECURITY.md`

## Non-negotiable rules

1. Never commit, stage, generate inside the repository, or print:
   - private keys, certificates with private material, or signing passwords;
   - Apple provisioning profiles or App Store Connect private keys;
   - Android upload keystores or Google Play service-account JSON;
   - Windows signing certificates or Partner Center client secrets;
   - Expo, GitHub, Cloudflare, registrar, Apple, Google, or Microsoft tokens;
   - `.env` files containing real values;
   - tax, banking, identity, contractual, or other private maintainer records.
2. Never place a secret in application code, `app.json`, `eas.json`, Electron
   code, Expo configuration, tests, fixtures, snapshots, documentation, command
   arguments, issue text, commit messages, screenshots, or example output.
3. Never ask the user to paste a secret into source code, chat, a patch, or a
   terminal command that will echo it. Direct the user to the relevant EAS,
   GitHub, store, password-manager, or operating-system credential interface.
4. Never print or decode an existing credential merely to confirm that it
   exists. Prefer checking a file's presence, a secret name, an authentication
   result, or redacted metadata.
5. Never weaken `.gitignore`, the secret scanner, push protection, branch
   protections, workflow permissions, signing controls, or dependency policies
   to make a build pass.
6. Never use `git add -f` to include an ignored credential or release artifact.
7. Never commit a signed installer or locally generated store package. Upload
   release files directly from protected CI to the store or GitHub Release.
8. Treat an accidentally disclosed credential as compromised. Removing the
   text from the latest commit is not sufficient.

Ignored files are still sensitive. `.gitignore` reduces accidental tracking; it
is not a secure storage system.

## Public configuration versus secrets

Values that may be committed when they contain no confidential data include:

- application bundle identifiers and Android package names;
- EAS project IDs and public update URLs;
- store application/product IDs;
- public website origins and provider endpoints;
- public analytics identifiers, if the project explicitly adopts analytics;
- placeholder-only `.env.example` files.

`EXPO_PUBLIC_*` values are always public. GitHub Actions secrets and EAS secret
variables are also public if a build step writes them into an Expo, web, mobile,
or Electron bundle. Encrypted storage protects a value only before it is
embedded.

WhereIP's IP providers must remain usable without confidential client-side API
keys. If a future provider requires a secret, do not add the key to the app.
Propose a separately controlled backend or serverless boundary and wait for
maintainer approval.

Use unmistakably fake placeholders in examples, such as
`<APP_STORE_CONNECT_KEY_ID>` or `${{ secrets.EXPO_TOKEN }}`. Never use a
realistically formatted sample token that secret scanners could mistake for a
live credential.

## Credential ownership

Use EAS-managed credentials and environments for:

- iOS distribution certificates and provisioning profiles;
- mobile App Store Connect submission credentials;
- Android upload signing;
- Google Play submission credentials;
- mobile build-only environment values.

Use protected GitHub environments for:

- macOS Developer ID signing and notarization;
- Mac App Store signing and upload;
- Windows signing;
- Microsoft Store submission;
- future Cloudflare Pages deployment credentials, only when that deferred phase
  is explicitly started.

Prefer short-lived OIDC or federated authentication over long-lived tokens when
the provider supports it. Otherwise use least-privilege, purpose-specific
credentials with documented owners and expiration dates outside this
repository.

Local credentials belong outside the repository in the operating-system
keychain, a password manager, EAS credential storage, or a vendor portal. Do not
create a repository `secrets/` directory just because that path is ignored.

## GitHub Actions and release workflows

When creating or modifying workflows:

- keep top-level permissions at `contents: read`;
- grant the minimum additional permission on the individual job that needs it;
- never expose production environments or secrets to pull requests from forks;
- never combine `pull_request_target`, secrets, and checkout or execution of
  pull-request-controlled code;
- use protected environments with approval for production publishing;
- build releases from an immutable tag or exact Git SHA, not a moving branch;
- keep validation jobs separate from privileged publishing jobs;
- pass artifacts from an unprivileged build to a privileged publishing job only
  after validating their origin, digest, and expected contents;
- pin new third-party actions to a reviewed full commit SHA; treat action
  upgrades as dependency changes;
- use `pnpm install --frozen-lockfile`;
- never enable shell tracing around credentials;
- never echo environment dumps, secret contexts, signing commands containing
  passwords, or decoded certificates;
- never persist secrets in caches, generic artifacts, job summaries, or test
  reports;
- import signing material into an ephemeral keychain or temporary directory and
  remove it even when the job fails;
- set short artifact-retention periods for unpublished release candidates.

Prefer GitHub's built-in token with explicit narrow permissions over a personal
access token. Do not add broad repository, organization, or cloud credentials
when a scoped environment credential is sufficient.

## EAS and mobile publishing

- Keep `credentials.json`, keystores, service-account files, `.p8` keys,
  provisioning profiles, and signing certificates out of Git.
- Let EAS manage mobile signing unless the publishing plan explicitly changes.
- Separate preview and production EAS environments and channels.
- Do not make production EAS variables available to untrusted pull requests.
- Verify that build profiles do not copy credential files into the application
  package.
- Treat EAS Update as public code distribution. It cannot safely deliver a
  secret.
- Do not download remote credentials into the repository. If a temporary local
  copy is unavoidable, use a directory outside the worktree and securely remove
  it after use.

## Electron security

The desktop shell under `electron/` is implemented and must keep these
controls enabled:

- `contextIsolation: true`;
- `sandbox: true`;
- `nodeIntegration: false`;
- no deprecated `remote` module;
- a narrowly scoped, typed preload API;
- explicit IPC channel allowlists, trusted-sender checks, and validation of
  every argument;
- denial of unexpected navigation, popups, permissions, and external protocols;
- a restrictive Content Security Policy;
- no direct renderer access to the filesystem, shell, arbitrary processes,
  credentials, or unrestricted network requests;
- secure handling of external links through an allowlisted HTTPS policy;
- channel-specific entitlements and signing configuration.

Do not disable Chromium/Electron security features to make a static export
work. Do not add secrets to Electron main, preload, renderer, packaged resources,
ASAR files, updater metadata, or crash reports.

## Web deployment

The web app is a public static export deployed to GitHub Pages at
`https://itsryanthedev.github.io/where-ip/`. GitHub Pages cannot keep runtime
secrets, and the later Cloudflare Pages deployment must be treated the same way
for client code.

The Cloudflare/domain migration is explicitly deferred in
`docs/publishing-plan.md`. Do not create Cloudflare resources, add Cloudflare
credentials, change DNS, or replace GitHub Pages unless the user explicitly
starts that phase.

## Privacy and network changes

WhereIP sends IP lookup requests to third-party providers. When adding or
changing a provider:

- require HTTPS;
- do not embed a confidential provider key;
- validate and normalize all responses;
- keep timeouts, fallbacks, and failure handling bounded;
- review the provider's current privacy policy and terms;
- update provider disclosures, `docs/privacy-policy.md`,
  `docs/data-safety.md`, and relevant tests;
- do not add analytics, telemetry, advertising, fingerprinting, or tracking
  without explicit maintainer approval and matching disclosures.

Never log complete network responses when they may contain user IP addresses,
location details, headers, identifiers, or provider diagnostics.

## Dependency and build integrity

- Add a dependency only when the existing platform or dependency set cannot
  reasonably solve the problem.
- Review the package owner, provenance, maintenance, install scripts, license,
  and transitive impact before adding it.
- Do not bypass the configured minimum-release-age or build-script approval
  policies.
- Do not modify `pnpm-lock.yaml` except through the declared pnpm version.
- Do not accept an unexpected lockfile rewrite or registry change.
- Keep generated native folders and build outputs out of source control.
- Preserve reproducible builds and record the Git SHA for every release.

## Required agent workflow

Before editing:

1. Run `git status --short` and preserve all user-owned or unrelated changes.
2. Read the files governing the area being changed.
3. Run `pnpm secrets:check` when dependencies are available, or
   `node scripts/check-secrets.mjs` directly.
4. Confirm that planned filenames are not credential or release-artifact paths.

While editing:

1. Use placeholders only.
2. Avoid commands that place credentials in shell history or process arguments.
3. Do not inspect ignored private files unless the user explicitly requests an
   operation that requires them.
4. Keep privileged release logic separate from ordinary build and test logic.
5. Stop if an unexpected credential-like value appears; do not reproduce it in
   commentary or output.

Before handing off:

1. Run `node scripts/check-secrets.mjs`.
2. For CI, credential, or release changes, also run
   `node scripts/check-secrets.mjs --history`.
3. Run the relevant lint, typecheck, tests, and build/export checks.
4. Run `git diff --check`.
5. Inspect `git status --short`, `git diff`, and, if anything is staged,
   `git diff --cached`.
6. Report failed or blocked checks precisely. Never disable a control merely to
   claim a green verification.

Do not stage, commit, push, publish, create a release, submit to a store, change
DNS, or mutate production credentials unless the user explicitly authorizes
that action.

## Suspected exposure procedure

If a secret may have entered a public commit, pull request, log, cache, artifact,
release, or application bundle:

1. Stop publishing and avoid repeating the value.
2. Tell the maintainer which credential class and location are affected, using
   redacted descriptions only.
3. Revoke or rotate the credential at its provider immediately.
4. Inspect Actions logs, artifacts, caches, releases, forks, and provider audit
   logs.
5. Remove the value from the current tree.
6. Plan history rewriting with the maintainer; do not force-push shared history
   without explicit approval.
7. Rerun the secret scan and provider-specific validation.

Rotation comes before cleanup because public Git history and external caches
cannot be assumed to forget a credential.
