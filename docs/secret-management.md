# Secret and Private-File Management

WhereIP is public source code, but its publisher credentials are private. The
repository must contain only files and values that are safe for anyone to read,
copy, fork, and redistribute.

## Public and private boundary

Safe to commit:

- source code, tests, and public documentation;
- bundle identifiers, package names, EAS project IDs, and store product IDs;
- `app.json`, `eas.json`, entitlement definitions, and package manifests;
- GitHub Actions and EAS workflow definitions;
- store descriptions, screenshots without personal data, and privacy policies;
- `.env.example` files containing placeholders only.

Never commit:

- Apple private keys, signing certificates, or certificate passwords;
- Apple provisioning profiles or App Store Connect private keys;
- Android upload keystores or passwords;
- Google Play service-account credentials;
- Windows code-signing certificates or passwords;
- Microsoft Entra client secrets;
- Expo, GitHub, Cloudflare, or domain-registrar access tokens;
- tax, banking, identity-verification, or other private legal documents;
- signed installers or locally generated release artifacts.

Ignored files should still be treated as sensitive local data. Prefer storing
credentials outside the repository directory in the operating-system keychain,
a password manager, EAS credential storage, GitHub encrypted secrets, or the
relevant store portal.

## Application values are public

Anything bundled into the web, Expo, or Electron application can be recovered
by an end user. `EXPO_PUBLIC_*` values are public by definition. A value does
not become safe to embed merely because GitHub or EAS stored it as an encrypted
secret during the build.

Secrets may be used by CI for signing, notarizing, or uploading an artifact.
They must not be inserted into the application. If a future provider requires a
confidential API key, WhereIP will need a controlled backend or serverless
function rather than a client-side key.

## Where credentials belong

Use EAS credential and environment management for:

- iOS distribution credentials and provisioning profiles;
- the mobile App Store Connect API key;
- the Android upload keystore;
- the Google Play service account;
- mobile build-only secrets.

Use protected GitHub environments for:

- macOS Developer ID signing and notarization;
- Mac App Store packaging and upload;
- Windows direct-distribution signing;
- Microsoft Store submission.

Production environments should require explicit approval. Pull requests from
forks must never receive publisher credentials.

## Local checks

Run the tracked-file check:

```bash
pnpm secrets:check
```

Run the complete history check:

```bash
pnpm secrets:check:history
```

Enable the repository's pre-commit hook in a local clone:

```bash
git config core.hooksPath .githooks
```

Before every push, inspect the exact staged change:

```bash
git status --short
git diff --cached
git diff --cached --name-only
```

The scanner reports rule names and file locations but intentionally redacts the
matched value. It is a defense-in-depth check, not proof that a repository is
free of secrets.

## GitHub settings

For the public GitHub repository:

1. Enable Secret Protection and secret-scanning alerts.
2. Enable repository push protection.
3. Protect `main` with an Active branch ruleset. Import
   `.github/rulesets/protect-main.json` from Settings → Rules → Rulesets
   (requires a PR, CODEOWNERS review, and the `verify` plus
   `dependency-review` status checks). Protect SemVer release tags (`v*`)
   with an Active tag ruleset that restricts create, update, and delete
   (repository admin bypass only). Import
   `.github/rulesets/protect-release-tags.json` the same way; do not use
   deprecated protected tags.
4. After Socket Security posts its first check on a pull request, add that
   check name to the `protect-main` required status checks so risky
   dependency findings can block merge.
5. Enable review from CODEOWNERS where the collaboration model permits it.
6. Create protected environments for every publishing channel.
7. Keep default workflow permissions read-only.
8. Grant write permissions only to the job that performs a release action.
9. Never execute fork-controlled code from `pull_request_target` with secrets.

Socket and CodeRabbit are installed as GitHub Apps for selected public
repositories. They review pull requests (including from forks). They do not
replace branch protection: require their checks (or CI) to pass before merge.
Repository config lives in `socket.yml` and `.coderabbit.yaml`.

## If a secret is exposed

Deleting the file or commit is not enough.

1. Revoke or rotate the credential immediately.
2. Remove the value from the current tree.
3. Remove it from Git history where practical.
4. Inspect Actions logs, caches, artifacts, releases, forks, and provider logs.
5. Force-push sanitized history only after planning the impact on contributors.
6. Record the incident without copying the exposed value into an issue.

Treat every credential pushed to a public repository as compromised, even if it
was visible only briefly.
