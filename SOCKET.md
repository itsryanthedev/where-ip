# Socket usage notes

WhereIP uses the [Socket Security](https://socket.dev/) GitHub App on this
public repository. Open-source / public repos are free on Socket; the Free
plan’s monthly scan budget matters more for **private** repos and heavy CLI
or API use.

## Current setup

`socket.yml` is intentionally broad:

- Pull request alerts can run when **any** files change (no narrow
  `triggerPaths`).
- Build outputs (`dist`, `out`, …) stay ignored so Socket only ingests
  dependency manifests, not generated trees.
- Dependency overview comments and project reports stay enabled.

Do **not** also add Socket CLI / GitHub Action scans on every CI job while the
App is installed — that doubles work for little gain.

## If you later hit usage limits or too much noise

Tighten `socket.yml` (and optionally the App install) instead of removing
Socket entirely. Examples:

1. **Narrow `triggerPaths`** so alerts only run when dependency files change,
   for example:

   ```yaml
   triggerPaths:
     - "package.json"
     - "pnpm-lock.yaml"
     - "pnpm-workspace.yaml"
     - "socket.yml"
   ```

2. **Turn off chatty PR comments** while keeping ingestion / dashboard
   reports:

   ```yaml
   githubApp:
     dependencyOverviewEnabled: false
     # or, quieter still:
     # disableCommentsAndCheckRuns: true
   ```

3. **Ignore bot PRs** you do not need Socket to re-review:

   ```yaml
   githubApp:
     ignoreUsers:
       - "dependabot[bot]"
       - "renovate[bot]"
   ```

4. **Limit which repos** the GitHub App can access (GitHub → Settings →
   Applications → Socket Security → Configure → Only select repositories).
   Prefer that over “All repositories” on the Free plan.

5. **Avoid duplicate scanners**: do not run `socket scan create` / Socket CI
   Action on every push if the GitHub App already covers the repo.

6. **Optional**: ask Socket about a free Team account for open-source if you
   outgrow Free collaboration features — not required for basic public-repo
   scanning.

After changing `socket.yml`, open a small PR that touches a manifest (or
this config) and confirm Socket still behaves as you expect.
