# WhereIP Privacy Policy

Last updated: July 26, 2026

WhereIP is a free and open-source utility maintained by
[Ryan the Dev](https://github.com/itsryanthedev). This policy describes the
data flow in the WhereIP mobile and web applications.

## Summary

WhereIP does not run a backend, create accounts, show advertising, collect
analytics, or track users. It does not request access to the device's GPS
location, contacts, photos, microphone, camera, or advertising identifier.

To provide its core feature, the app contacts an IP information provider
directly from the user's device. That provider necessarily receives the
public IP address from which the request originates. Under European privacy
law, a public IP address is generally treated as personal data even when the
maintainer never receives it.

## Third-party IP providers

WhereIP supports these providers:

| Provider | Privacy policy | Terms |
| --- | --- | --- |
| ipwho.is / IPWhois | <https://ipwhois.io/privacy> | <https://ipwhois.io/terms> |
| FreeIPAPI | <https://freeipapi.com/privacy> | <https://freeipapi.com/terms> |
| IPinfo | <https://ipinfo.io/privacy-policy> | <https://ipinfo.io/terms-of-service> |

ipwho.is is selected by default. A user may select another provider. When a
lookup fails, WhereIP may contact a fallback provider (either FreeIPAPI or IPinfo). The app identifies the
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

## GDPR

This section explains how WhereIP relates to the EU General Data Protection
Regulation (GDPR) and comparable UK privacy rules. It is plain-language
information about the app's design, not legal advice.

### Personal data involved

When you run a lookup, the contacted provider receives the public IP address
used for that HTTPS request. The provider may also observe ordinary request
metadata such as timing and user-agent information. The response may include
approximate location and network identifiers derived from that IP. WhereIP
does not collect names, email addresses, accounts, advertising identifiers, or
GPS location.

### Who processes what

WhereIP has no developer-operated backend and does not receive, store, or
analyze lookup traffic on a WhereIP server. Local acknowledgement, preference,
cool-off, and cache values stay on your device unless your operating system or
backup tools copy them.

Each IP information provider processes the request under its own privacy
policy. WhereIP does not control those providers' retention periods, security
practices, or secondary uses. Review their linked policies before continuing.

### Why the lookup happens

The disclosure of your public IP to a provider happens only so WhereIP can
show the public network information you asked for. That transfer is part of
providing the app's core feature after you acknowledge the first-run
disclosure and continue. WhereIP does not use the lookup for advertising,
profiling, analytics products, or selling data.

### Cookies, analytics, and consent banners

WhereIP does not embed advertising, analytics, or tracking SDKs. The first-run
dialog explains the provider request before the first lookup; it is not a
cookie or marketing-consent banner. Local storage described above exists to
remember your acknowledgement, preference, cool-offs, and a short-lived
result so the app can work without unnecessary repeat requests.

If a future version adds non-essential tracking or advertising, this policy
and the in-app disclosure will be updated before that behavior ships.

### Your choices and rights

You can:

- decline to continue past the first-run disclosure, in which case WhereIP
  will not perform a provider lookup;
- choose which supported provider is preferred;
- clear local app data or uninstall the app to remove on-device cache and
  settings; and
- open each provider's official privacy policy for rights requests that
  concern data that provider may hold.

Because WhereIP does not operate an account system or backend copy of your
lookups, there is no WhereIP server profile to export or delete. Questions
about provider-held logs or retention should be directed to that provider
using the contact method in its policy.

European privacy law may also give you rights such as access, rectification,
erasure, restriction, objection, and complaint to a supervisory authority,
depending on your situation and on which organization holds the relevant
data. Where a right applies to data WhereIP does not hold, the practical next
step is usually the provider or your device settings rather than a WhereIP
account portal.

### International providers

Providers may process requests on infrastructure outside your country,
including outside the European Economic Area. Their current policies describe
where and how they handle that processing. WhereIP cannot change those
arrangements from the client app.

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
