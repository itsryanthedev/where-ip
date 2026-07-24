# WhereIP

> Where does the internet think you are?

WhereIP is a free and open-source app that shows your public IP address and the
approximate location associated with it. It is built with React Native and
Expo SDK 57 for iOS, Android, tablets, and the web.

No account. No ads. No analytics. No GPS permission. No WhereIP backend.

## What it shows

- Public IPv4 or IPv6 address
- Country and locally generated country flag
- Approximate city and region, when supplied
- Network organization and ASN, when supplied
- Timezone, postal code, and approximate coordinates, when supplied
- The provider that returned the result
- The time of the last successful lookup
- An honest **Unavailable** state for DNS, which apps and browsers cannot
  determine reliably across every supported platform

IP-based location is an estimate of the network connection. It is not the
device's GPS location and may identify a nearby city, VPN endpoint, mobile
carrier gateway, or corporate network instead.

## Privacy by design

Before the first lookup, WhereIP explains exactly what will happen and waits
for the user to continue.

The app makes a direct HTTPS request from the device to an IP information
provider. A contacted provider necessarily receives the public IP address used
for the request and handles it under that provider's own privacy policy and
terms. WhereIP itself:

- has no developer-operated backend;
- includes no advertising, analytics, or tracking SDK;
- requests no GPS location permission;
- creates no user account;
- stores only the disclosure acknowledgement, provider preference, temporary
  provider cool-offs, and a short-lived lookup result on the device; and
- does not upload that local cache anywhere.

The app never claims that a third-party provider retains no data. Provider
policies can change, so users can open each provider's current official
privacy policy and terms from the first-run disclosure, About screen, and
Privacy screen.

See [the full WhereIP privacy policy](docs/privacy-policy.md).

## Providers

[IPinfo's supported legacy public endpoint](https://support.ipinfo.io/hc/en-us/articles/30792479436562-What-Is-the-Difference-Between-Using-the-Authenticated-Free-Plan-and-the-Public-API-With-No-Account)
is the default. The user may select either alternative. If the preferred
provider fails, WhereIP tries the remaining providers once in order.

| Provider | Role | Public access | Official privacy details |
| --- | --- | --- | --- |
| [IPinfo](https://support.ipinfo.io/hc/en-us/articles/30792479436562-What-Is-the-Difference-Between-Using-the-Authenticated-Free-Plan-and-the-Public-API-With-No-Account) | Default | No account; 1,000 requests/day shared by clients on the same public IP | [Privacy Policy](https://ipinfo.io/privacy-policy) · [Terms of Service](https://ipinfo.io/terms-of-service) |
| [FreeIPAPI](https://freeipapi.com/docs/api-reference/api-introduction) | Fallback 1 | No authentication on free servers; provider advertises commercial and non-commercial use | [Privacy Policy](https://freeipapi.com/privacy) · [Terms of Use](https://freeipapi.com/terms) |
| [ipwho.is](https://ipwhois.io/documentation) | Fallback 2 | No API key; 1,000 requests/day per client IP, or per domain for browser CORS traffic | [Privacy Policy](https://ipwhois.io/privacy) · [Terms of Service](https://ipwhois.io/terms) |

These URLs were last verified against the providers' official sites on
2026-07-24. They should be reviewed again before every store release.

> **Release note:** IPinfo's current Terms of Service describe Site content as
> available for personal or internal business use and direct external
> commercial use to a separate OEM agreement. ipwho.is documentation says its
> free endpoint permits commercial use, while its Terms describe personal or
> internal business use. Because a public app is not the same as an internal
> integration, obtain written provider confirmation before store submission or
> replace any provider whose permission remains unclear. FreeIPAPI currently
> states that its free API supports commercial and non-commercial use.

### Responsible networking

WhereIP does not poll continuously.

- A successful result is cached locally for 15 minutes.
- Manual refresh is disabled for 60 seconds after a successful request.
- Changing providers schedules one lookup as soon as the global cooldown
  allows. It does not bypass the cooldown or start continuous polling.
- If the provider is changed again while waiting, only the latest selection
  is used for the scheduled lookup.
- Each provider is attempted at most once during a lookup.
- Requests time out after 7 seconds.
- `Retry-After` is honored when a provider supplies it.
- An offline or failed lookup preserves the last successful result.

The fallback order starts with the user's preferred provider, then preserves
the relative order of the other providers.

## Run locally

Requirements:

- Node.js supported by Expo SDK 57
- pnpm 11
- Xcode for the iOS simulator
- Android Studio for the Android emulator

```bash
pnpm install
pnpm start
```

Then press `i`, `a`, or `w` for iOS, Android, or web. You can also use:

```bash
pnpm ios
pnpm android
pnpm web
```

## Quality checks

```bash
pnpm verify
```

That command runs linting, TypeScript checks, unit tests, and a production
static web export. Useful individual commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm export:web
pnpm assets:generate
```

## Architecture

```text
src/
├── app/          Expo Router routes
├── components/   Reusable accessible UI
├── constants/    Provider definitions, links, and theme tokens
├── hooks/        Platform-aware theme helpers
├── providers/    App state, consent, cache, and refresh orchestration
├── screens/      Home, About, and Privacy experiences
├── services/     Storage, provider adapters, and fallback lookup logic
├── types/        Shared domain types
└── utils/        IP validation and display helpers
```

Provider responses are validated and normalized before reaching the UI. The
lookup service is independent of React, which keeps fallback and rate-limit
behavior unit-testable.

## Release material

- [Privacy policy](docs/privacy-policy.md)
- [Store listing copy](docs/store-listing.md)
- [Google Play data safety notes](docs/data-safety.md)
- [Release checklist](docs/release-checklist.md)
- Generated store artwork in [`store-assets/`](store-assets)

Store signing credentials, API keys, and Expo project identifiers are not
committed. The app intentionally uses only public no-key endpoints.

## Contributing

Issues and pull requests are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change. Security issues
should follow [SECURITY.md](SECURITY.md).

## Creator

Created and maintained by [Ryan the Dev](https://github.com/itsryanthedev).
Browse [more open-source projects](https://github.com/itsryanthedev?tab=repositories).

## Attribution and branding

Redistributions must preserve the applicable license, copyright, and
attribution notices in [LICENSE](LICENSE) and [NOTICE](NOTICE).

If an application is substantially based on WhereIP, its maintainers are also
kindly asked to include “Based on WhereIP by Ryan the Dev” in its About or
Third-Party Notices screen. This visible credit is a community request, not an
additional license condition. See [ATTRIBUTION.md](ATTRIBUTION.md) for the
suggested wording.

Modified distributions must use their own name and visual identity. The
official WhereIP name, logo, icons, and store artwork are not licensed for use
in modified apps. See [TRADEMARKS.md](TRADEMARKS.md).

## License

The WhereIP source code and documentation are released under the
[Apache License 2.0](LICENSE). Official brand assets are excluded as described
in [TRADEMARKS.md](TRADEMARKS.md).
