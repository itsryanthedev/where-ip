# WhereIP Privacy Policy

Last updated: July 25, 2026

WhereIP is a free and open-source utility maintained by
[Ryan the Dev](https://github.com/itsryanthedev). This policy describes the
data flow in the WhereIP mobile and web applications.

## Summary

WhereIP does not run a backend, create accounts, show advertising, collect
analytics, or track users. It does not request access to the device's GPS
location, contacts, photos, microphone, camera, or advertising identifier.

To provide its core feature, the app contacts an IP information provider
directly from the user's device. That provider necessarily receives the
public IP address from which the request originates.

## Third-party IP providers

WhereIP supports these providers:

| Provider | Privacy policy | Terms |
| --- | --- | --- |
| ipwho.is / IPWhois | <https://ipwhois.io/privacy> | <https://ipwhois.io/terms> |
| FreeIPAPI | <https://freeipapi.com/privacy> | <https://freeipapi.com/terms> |
| IPinfo | <https://ipinfo.io/privacy-policy> | <https://ipinfo.io/terms-of-service> |

ipwho.is is selected by default. A user may select another provider. When a
lookup fails, WhereIP may contact a fallback provider. The app identifies the
provider that supplied each result.

Provider responses may include the public IP address, IP version, approximate
city or region, country code, timezone, postal code, coordinates, ASN, ISP, or
network organization. Each provider processes requests under its own policy.
WhereIP does not control and cannot guarantee a provider's retention,
processing, security, or future policy changes.

## Data stored on the device

WhereIP stores the following locally:

- whether the first-run disclosure was acknowledged;
- the user's preferred provider;
- the last successful normalized lookup result and its timestamp; and
- temporary provider cool-off timestamps used to respect failures and rate
  limits.

The lookup cache is considered fresh for 15 minutes. The app does not upload
this local state to WhereIP or synchronize it to an account.

The operating system, browser, device backup configuration, or third-party
provider may maintain data independently of WhereIP.

## Data sharing

WhereIP shares no information with its maintainer because it has no receiving
server. A network request is sent only to the selected provider and, when
needed, fallback providers. If the user chooses a link, the platform opens the
linked website in a browser and that website applies its own privacy policy.

## Children's privacy

WhereIP is a general-audience network utility and is not directed to children.
It does not knowingly collect personal information through a WhereIP backend,
because no such backend exists.

## Security

Provider requests use HTTPS. No secret or API key is embedded in the app.
Because no internet transmission or third-party service can be guaranteed
perfectly secure, users should review the provider policies before continuing.

## Changes

This policy may change when the app's behavior or providers change. Updates
will be published in this repository and reflected by the "Last updated" date.

## Contact

Questions and privacy requests can be submitted through
[GitHub Issues](https://github.com/itsryanthedev/where-ip/issues). Do not post
private or sensitive information in a public issue.

The complete source is available at
<https://github.com/itsryanthedev/where-ip>.
