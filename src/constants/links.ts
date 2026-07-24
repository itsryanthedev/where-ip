export const APP_LINKS = {
  repository: 'https://github.com/itsryanthedev/where-ip',
  license: 'https://github.com/itsryanthedev/where-ip/blob/main/LICENSE',
  notice: 'https://github.com/itsryanthedev/where-ip/blob/main/NOTICE',
  issues: 'https://github.com/itsryanthedev/where-ip/issues',
  creator: 'https://github.com/itsryanthedev',
  openSourceProjects: 'https://github.com/itsryanthedev?tab=repositories',
} as const;

export type AppLinkId =
  | 'app.repository'
  | 'app.license'
  | 'app.notice'
  | 'app.issues'
  | 'app.creator'
  | 'app.openSourceProjects';

export type ProviderLinkKind = 'privacy' | 'terms' | 'documentation';

export type ProviderLinkId =
  | 'provider.ipinfo.privacy'
  | 'provider.ipinfo.terms'
  | 'provider.ipinfo.documentation'
  | 'provider.freeipapi.privacy'
  | 'provider.freeipapi.terms'
  | 'provider.freeipapi.documentation'
  | 'provider.ipwhois.privacy'
  | 'provider.ipwhois.terms'
  | 'provider.ipwhois.documentation';

export type DesktopLinkId = AppLinkId | ProviderLinkId;

export const APP_LINK_IDS = {
  repository: 'app.repository',
  license: 'app.license',
  notice: 'app.notice',
  issues: 'app.issues',
  creator: 'app.creator',
  openSourceProjects: 'app.openSourceProjects',
} as const satisfies Record<keyof typeof APP_LINKS, AppLinkId>;

export function providerLinkId(
  providerId: 'ipinfo' | 'freeipapi' | 'ipwhois',
  kind: ProviderLinkKind,
): ProviderLinkId {
  return `provider.${providerId}.${kind}`;
}
