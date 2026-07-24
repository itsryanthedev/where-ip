# Contributing to WhereIP

Thanks for helping improve WhereIP.

## Development

1. Fork and clone the repository.
2. Run `pnpm install`.
3. Create a focused branch.
4. Make the change with tests where behavior changes.
5. Run `pnpm verify`.
6. Open a pull request explaining the user-visible impact.

Keep the app intentionally small. New dependencies should have a clear
cross-platform benefit and must not introduce tracking, advertising, accounts,
or unnecessary permissions.

Provider changes must include updated adapters, tests, disclosure links, and a
review of the provider's current documentation, privacy policy, and terms.

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
credential boundary, CI rules, and incident procedure.

By contributing, you agree that your contribution is licensed under the
Apache License 2.0. Contributions must not include third-party code, artwork,
or other material unless its license is compatible and clearly documented.
