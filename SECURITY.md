# Security Policy

## Supported versions

Security fixes are applied to the latest released version.

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Use GitHub's
private vulnerability reporting feature for this repository when available.
If it is unavailable, open a minimal issue asking the maintainer for a private
contact method without including sensitive details.

Reports should include affected versions, reproduction steps, expected impact,
and any suggested mitigation. Please allow reasonable time for investigation
before public disclosure.

## Exposed credentials

Do not report or reproduce a credential value in a public issue. If a publisher
credential is accidentally pushed, revoke or rotate it immediately before
removing it from the current tree and Git history. Deleting a commit does not
make an exposed credential safe because clones, forks, logs, caches, or
artifacts may retain it.

Repository contributors should follow
[Secret and Private-File Management](docs/secret-management.md).
