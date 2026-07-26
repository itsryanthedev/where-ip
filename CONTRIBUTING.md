# Contributing to WhereIP

Thanks for helping improve WhereIP.

## Development

1. Fork and clone the repository.
2. Run `pnpm install`.
3. Enable the versioned Git hooks (recommended):

   ```bash
   git config core.hooksPath .githooks
   ```

4. Create a focused branch.
5. Make the change with tests where behavior changes.
6. Run `pnpm verify`.
7. Open a pull request explaining the user-visible impact.

Keep the app intentionally small. New dependencies should have a clear
cross-platform benefit and must not introduce tracking, advertising, accounts,
or unnecessary permissions.

Provider changes must include updated adapters, tests, disclosure links, and a
review of the provider's current documentation, privacy policy, and terms.

## Pull requests and automated review

Public pull requests (including from forks) are reviewed by CI, GitHub
Dependency Review, Socket (dependency risk), and CodeRabbit (code review).

Treat these paths as high-trust supply-chain surfaces and expect CODEOWNERS
review when they change:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.github/workflows/**`
- `socket.yml`, `.coderabbit.yaml`

Do not weaken `minimumReleaseAge`, `blockExoticSubdeps`, `trustLockfile`, or
`allowBuilds` in a PR unless the change is intentional, documented, and
reviewed. A contributor can propose those edits in their branch; maintainers
must reject silent guardrail removals.

## Secrets and private files

This is a public repository. Do not commit credentials, private publisher
material, personal documents, signed installers, or real values in `.env`
files. Anything bundled into the app, including `EXPO_PUBLIC_*` values, must be
treated as public.

Run `pnpm secrets:check` before committing. Maintainers should also enable the
versioned pre-commit hook with:

```bash
git config core.hooksPath .githooks
```

See [Secret and Private-File Management](docs/secret-management.md) for the
credential boundary, CI rules, GitHub rulesets, and incident procedure.

By contributing, you agree that your contribution is licensed under the
Apache License 2.0. Contributions must not include third-party code, artwork,
or other material unless its license is compatible and clearly documented.
